#!/usr/bin/env python3
"""YSL Resource Bridge 0.1: local, read-only public-resource relay.
No game account, no executable loading, no pretend asset catalogue.
Python 3.11+; standard library only. Windows builds embed this runtime.
"""
from __future__ import annotations
from contextlib import contextmanager
import argparse, datetime, hashlib, html, http.client, io, ipaddress, json
import logging, os, pathlib, re, secrets, socket, sqlite3, ssl, struct, sys
import threading, time, webbrowser, zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, urlunsplit, urljoin, parse_qs

VERSION = '0.1.0'
ROOT = 'https://mystyle.archosaur.com/'
DOMAIN_ROOTS = ('archosaur.com', 'zulong.com')
MAX_CHUNK = 2 * 1024 * 1024
MAX_ENTRY = 8 * 1024 * 1024
MAX_DIRECTORY = 32 * 1024 * 1024
PORT = 18763
RESOURCES = pathlib.Path(getattr(sys, '_MEIPASS', pathlib.Path(__file__).resolve().parent))
SEEDS = [
 {'name': 'PC 当前下载按钮', 'url': 'https://autopatch-projecti-put-hs.zulong.com/projectIgame_ob/media/yslzminstallerbd.exe', 'source': 'https://mystyle.archosaur.com/assets/260831/public/pcclick.js', 'kind': 'installer'},
 {'name': 'Android 官网安装包', 'url': 'https://autopatch-projecti-tc-pkg.zulong.com/projectIgame_ob/media/yslzm.apk', 'source': 'https://mystyle.archosaur.com/mobile.html', 'kind': 'apk'},
 {'name': 'PC 官网内页入口', 'url': 'https://autopatch-projecti-tc-pkg.zulong.com/projectIgame_ob/media/yslzm-installer-x64.exe', 'source': 'https://mystyle.archosaur.com/home/index.html', 'kind': 'installer'},
]

def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

class BridgeError(Exception):
    def __init__(self, code, message, status=422, **detail):
        super().__init__(message); self.code=code; self.status=status; self.detail=detail
    def as_dict(self):
        return {'ok':False, 'code':self.code, 'message':str(self), **self.detail}

def validate_url(value):
    if not isinstance(value,str) or len(value)>4096 or re.search(r'[\x00-\x20\\]',value):
        raise BridgeError('invalid_url','无效的资源地址',400)
    try:
        p=urlsplit(value); host=(p.hostname or '').lower(); port=p.port
    except ValueError:
        raise BridgeError('invalid_url','资源地址解析失败',400)
    if p.scheme!='https' or p.username or p.password or port not in (None,443) or p.fragment:
        raise BridgeError('invalid_url','仅接受无账号信息、无片段的标准 HTTPS 地址',400)
    if not any(host==x or host.endswith('.'+x) for x in DOMAIN_ROOTS):
        raise BridgeError('host_not_allowed','不在已核实的官方域名白名单内',403,host=host)
    if re.search(r'/\.\.(?:/|$)',p.path):
        raise BridgeError('invalid_url','拒绝路径穿越',400)
    return p

class PinnedTLS(http.client.HTTPSConnection):
    def __init__(self, host, ip):
        super().__init__(host,443,timeout=12,context=ssl.create_default_context()); self.ip=ip
    def connect(self):
        sock=socket.create_connection((self.ip,443),self.timeout)
        try: self.sock=self._context.wrap_socket(sock,server_hostname=self.host)
        except Exception: sock.close(); raise

class Network:
    def __init__(self):
        self.slots=threading.BoundedSemaphore(2)
        self.requests=0; self.received=0
    def fetch(self,url,method='GET',headers=None,cap=MAX_CHUNK,sample=False):
        if method not in ('GET','HEAD'): raise BridgeError('method','只读请求',405)
        if not self.slots.acquire(timeout=20): raise BridgeError('busy','当前读取繁忙',429)
        try:
            trail=[]
            for hop in range(3):
                p=validate_url(url)
                ips=sorted(set(x[4][0] for x in socket.getaddrinfo(p.hostname,443,type=socket.SOCK_STREAM)), key=lambda x: (':' in x, x))
                if not ips or any(not ipaddress.ip_address(x).is_global for x in ips):
                    raise BridgeError('private_address','拒绝私网、保留或回环目标',403)
                c=PinnedTLS(p.hostname,ips[0]); self.requests+=1
                try:
                    hs={'User-Agent':'Mozilla/5.0 (compatible; YSL-Resource-Bridge/0.1)', 'Accept-Encoding':'identity','Accept':'*/*'}
                    for k,v in (headers or {}).items():
                        if k.lower() in ('range','if-match','if-unmodified-since','if-none-match'): hs[k]=v
                    started=time.monotonic()
                    c.request(method,urlunsplit(('','',p.path or '/',p.query,'')),headers=hs)
                    r=c.getresponse(); rh={k.lower():v for k,v in r.getheaders()}
                    trail.append({'url':url,'status':r.status})
                    if r.status in (301,302,303,307,308) and rh.get('location'):
                        if hop==2: raise BridgeError('redirect_limit','重定向次数超过限制',502)
                        url=urljoin(url,rh['location']); validate_url(url); continue
                    meta={'url':url,'status':r.status,'headers':{k:v for k,v in rh.items() if k!='set-cookie'},'redirects':trail,'checkedAt':stamp()}
                    if method=='HEAD': return meta,b''
                    # Sample mode never consumes an entire file when Range is ignored.
                    if not sample and rh.get('content-length','').isdigit() and int(rh['content-length'])>cap:
                        raise BridgeError('range_ignored' if headers and headers.get('Range') else 'too_large','上游响应超过单次读取限制；未继续下载整包',502,upstream=meta)
                    remaining=cap if sample else cap+1; chunks=[]
                    while remaining:
                        if time.monotonic()-started>25: raise BridgeError('deadline','读取超时',504)
                        part=r.read(min(65536,remaining))
                        if not part: break
                        self.received+=len(part); chunks.append(part); remaining-=len(part)
                    data=b''.join(chunks)
                    if len(data)>cap: raise BridgeError('too_large','响应超过内存限制',502)
                    return meta,data
                finally: c.close()
            raise BridgeError('redirect_limit','重定向失败',502)
        except BridgeError: raise
        except (socket.timeout,TimeoutError) as e: raise BridgeError('timeout','连接或读取官方资源超时',504) from e
        except Exception as e: raise BridgeError('network_error',str(e),502) from e
        finally: self.slots.release()

def magic(data):
    q=data.lstrip().lower()
    if q.startswith((b'<script',b'<!doctype',b'<html')): return 'HTML/script'
    if data[:4] in (b'PK\x03\x04',b'PK\x05\x06'): return 'ZIP/APK'
    if data[:2]==b'MZ': return 'PE installer'
    if data[:8]==b'\x89PNG\r\n\x1a\n': return 'PNG'
    if data[:4]==b'glTF': return 'GLB'
    if data[:4]==b'OggS': return 'OGG'
    if data[:4]==b'RIFF': return 'RIFF'
    return 'unknown'

def guard_response(meta,data,expect_binary=True):
    if meta['status'] not in (200,206):
        raise BridgeError('upstream_status','官方源返回 HTTP '+str(meta['status']),meta['status'] if 400<=meta['status']<=599 else 502,upstream=meta)
    if expect_binary and ('text/html' in meta['headers'].get('content-type','').lower() or magic(data)=='HTML/script'):
        raise BridgeError('html_instead_of_asset','上游返回网页/脚本，不是资源文件；未写入资源缓存',502,upstream=meta,firstBytesHex=data[:64].hex())
    if meta['headers'].get('content-encoding','identity') not in ('identity',''):
        raise BridgeError('content_encoding','分段响应使用了非预期压缩编码',502)

def cache_key(url,version,start,end):
    return hashlib.sha256(json.dumps([url,version,start,end],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

class DiskCache:
    def __init__(self,directory):
        self.root=pathlib.Path(directory); self.root.mkdir(parents=True,exist_ok=True)
        self.blocks=self.root/'blocks'; self.blocks.mkdir(exist_ok=True)
        self.dbpath=self.root/'index.sqlite3'; self.hits=0
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS blocks(k TEXT PRIMARY KEY, n INTEGER, digest TEXT)')
            db.execute('CREATE TABLE IF NOT EXISTS documents(k TEXT PRIMARY KEY, value TEXT, ts REAL)')
    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.dbpath, timeout=20)
        try:
            with db:
                yield db
        finally:
            db.close()
    def get(self,k):
        with self.connect() as db: row=db.execute('SELECT n,digest FROM blocks WHERE k=?',(k,)).fetchone()
        if row:
            try:
                data=(self.blocks/k).read_bytes()
                if len(data)==row[0] and hashlib.sha256(data).hexdigest()==row[1]:
                    self.hits+=1; return data
            except OSError: pass
        return None
    def put(self,k,data):
        if len(data)>MAX_CHUNK: raise BridgeError('cache_limit','缓存分段过大')
        temp=self.blocks/(k+'.'+secrets.token_hex(4)+'.tmp')
        temp.write_bytes(data); temp.replace(self.blocks/k)
        with self.connect() as db: db.execute('INSERT OR REPLACE INTO blocks VALUES(?,?,?)',(k,len(data),hashlib.sha256(data).hexdigest()))
    def get_json(self,k,ttl=None):
        with self.connect() as db: row=db.execute('SELECT value,ts FROM documents WHERE k=?',(k,)).fetchone()
        if row and (ttl is None or time.time()-row[1]<ttl): return json.loads(row[0])
        return None
    def put_json(self,k,value):
        with self.connect() as db: db.execute('INSERT OR REPLACE INTO documents VALUES(?,?,?)',(k,json.dumps(value,ensure_ascii=False),time.time()))
    def stats(self):
        with self.connect() as db: n,b=db.execute('SELECT COUNT(*),COALESCE(SUM(n),0) FROM blocks').fetchone()
        return {'path':str(self.root.resolve()),'blocks':n,'bytes':b,'sessionHits':self.hits,'persistent':True,'backend':'disk+SQLite','automaticEviction':False}

class BlobSource:
    def __init__(self,network,cache,url):
        validate_url(url); self.net=network; self.cache=cache; self.url=url
        meta=cache.get_json('metadata:'+url,300)
        if not meta:
            meta,_=network.fetch(url,method='HEAD'); guard_response(meta,b'')
            if not meta['headers'].get('content-length','').isdigit():
                probe,data=network.fetch(url,headers={'Range':'bytes=0-127'},cap=128,sample=True)
                guard_response(probe,data); meta=probe
            cache.put_json('metadata:'+url,meta)
        h=meta['headers']; cr=re.fullmatch(r'bytes \d+-\d+/(\d+)',h.get('content-range',''))
        self.size=int(cr[1]) if cr else int(h.get('content-length','0'))
        if self.size<1: raise BridgeError('unknown_length','未取得可信的文件长度',502)
        self.etag=h.get('etag',''); self.modified=h.get('last-modified','')
        # Weak ETags cannot establish byte identity. No validators => no disk reuse.
        self.version=self.etag if self.etag and not self.etag.startswith('W/') else self.modified+'|'+str(self.size) if self.modified else ''
        self.headers=h
    def read(self,start,end):
        if start<0 or end<start or end>=self.size or end-start+1>MAX_CHUNK:
            raise BridgeError('invalid_range','字节范围越界或超过 2 MiB',416,total=self.size)
        k=cache_key(self.url,self.version,start,end)
        if self.version:
            cached=self.cache.get(k)
            if cached is not None: return cached
        hs={'Range':f'bytes={start}-{end}'}
        if self.etag and not self.etag.startswith('W/'): hs['If-Match']=self.etag
        elif self.modified: hs['If-Unmodified-Since']=self.modified
        meta,data=self.net.fetch(self.url,headers=hs,cap=MAX_CHUNK)
        guard_response(meta,data); h=meta['headers']
        if self.etag and h.get('etag') and h['etag']!=self.etag:
            raise BridgeError('version_changed','下载期间源文件版本改变，请重新检查入口',409)
        if self.modified and h.get('last-modified') and h['last-modified']!=self.modified:
            raise BridgeError('version_changed','下载期间修改时间改变',409)
        if meta['status']==206:
            m=re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)',h.get('content-range',''))
            if not m or tuple(map(int,m.groups()))!=(start,end,self.size):
                raise BridgeError('bad_content_range','上游 Content-Range 与请求不一致',502)
        elif start==0 and end==self.size-1 and len(data)==self.size:
            pass
        else: raise BridgeError('range_ignored','上游没有正确响应 Range；已停止，不下载整个安装包',502)
        if len(data)!=end-start+1: raise BridgeError('short_read','资源分段长度不完整',502)
        if self.version: self.cache.put(k,data)
        return data

class RemoteFile(io.RawIOBase):
    def __init__(self,source): self.source=source; self.pos=0
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self,offset,whence=0):
        p=offset if whence==0 else self.pos+offset if whence==1 else self.source.size+offset if whence==2 else -1
        if p<0: raise ValueError('negative seek')
        self.pos=p; return p
    def read(self,n=-1):
        n=self.source.size-self.pos if n<0 else min(n,self.source.size-self.pos)
        if n>MAX_DIRECTORY: raise BridgeError('zip_directory_limit','归档单次读取超过 32 MiB；未执行全包读取')
        parts=[]
        while n>0:
            q=min(n,MAX_CHUNK); parts.append(self.source.read(self.pos,self.pos+q-1)); self.pos+=q; n-=q
        return b''.join(parts)

def parse_range(value,size):
    m=re.fullmatch(r'bytes=(\d+)-(\d+)',value or '')
    if not m: raise BridgeError('range_required','请使用单个明确的字节范围 bytes=start-end',416,total=size)
    a,b=map(int,m.groups())
    if a>b or a>=size or b>=size or b-a+1>MAX_CHUNK:
        raise BridgeError('invalid_range','范围越界或大于 2 MiB',416,total=size)
    return a,b

def open_archive(source):
    tail=source.read(max(0,source.size-65557),source.size-1)
    index=tail.rfind(b'PK\x05\x06')
    if index<0 or index+22>len(tail): raise BridgeError('not_zip','不是可识别的 ZIP/APK；该安装器需要专用解析，不会当 ZIP 强行打开')
    disk,cd_disk,on_disk,total,cd_size,cd_offset,comment=struct.unpack_from('<HHHHIIH',tail,index+4)
    if index+22+comment!=len(tail): raise BridgeError('zip_end','归档尾记录或注释长度不符')
    if disk or cd_disk or on_disk!=total: raise BridgeError('multivolume_zip','当前不支持多卷 ZIP')
    if cd_size==0xffffffff or cd_offset==0xffffffff or total==65535:
        raise BridgeError('zip64_not_implemented','已识别 ZIP64，本版尚未接入其目录解析')
    if cd_size>MAX_DIRECTORY or total>150000: raise BridgeError('zip_directory_limit','归档目录超过本版保护上限')
    if cd_offset+cd_size>source.size: raise BridgeError('zip_bounds','归档目录偏移越界')
    return zipfile.ZipFile(RemoteFile(source))

def path_category(name):
    p=name.lower()
    for label,pattern in [('动作舞蹈',r'anim|dance|motion'),('发型',r'hair'),('饰品',r'accessor|jewel'),('服装',r'fashion|cloth|dress|costume'),('人物',r'character|avatar|skeleton'),('宠物',r'pet/|pets/|animal'),('场景家园',r'scene|house|furniture|home'),('音频',r'\.(ogg|wav|mp3|wem|bank|acb|awb)$'),('配置',r'config|manifest|version|\.ini$|\.json$|\.lua$')]:
        if re.search(pattern,p): return label
    return '其他/容器'

def extract_links(text,base):
    # No eval. Template literals containing interpolation are not usable URLs.
    text=re.sub(r'<!--.*?-->','',text,flags=re.S)
    vals=re.findall(r'''["'`]([^"'`\r\n]{1,4096})["'`]''',text)
    result={}
    for val in vals:
        s=html.unescape(val).replace('\\/','/')
        if '${' in s or re.search(r'[\x00-\x20<>]',s): continue
        if not s.startswith(('https://','//','/','./','../')): continue
        url=urljoin(base,s)
        try: validate_url(url)
        except BridgeError: continue
        result[url]={'url':url,'source':base}
    return list(result.values())

class Bridge:
    def __init__(self,cache,network=None):
        self.cache=cache; self.net=network or Network(); self.token=secrets.token_urlsafe(24); self.lock=threading.Lock()
    def probe(self,url):
        meta,data=self.net.fetch(url,headers={'Range':'bytes=0-127'},cap=128,sample=True)
        typ=magic(data); good=meta['status'] in (200,206) and typ!='HTML/script' and 'text/html' not in meta['headers'].get('content-type','')
        m=re.search(r'/(\d+)$',meta['headers'].get('content-range',''))
        length=int(m[1]) if m else int(meta['headers'].get('content-length','0')) if meta['headers'].get('content-length','').isdigit() else None
        value={**meta,'state':'sample_received' if good else 'not_asset','magic':typ,'bytesSampled':len(data),'first128Hex':data.hex(),'rangeHonored':meta['status']==206,'size':length}
        self.cache.put_json('probe:'+url,value); return value
    def discover(self,refresh=False):
        saved=self.cache.get_json('discovery')
        if not refresh: return saved or {'state':'seed_only','checkedAt':None,'downloads':SEEDS,'coverage':'unknown','gameAssetCount':None}
        if not self.lock.acquire(blocking=False): raise BridgeError('busy','入口检查正在进行',429)
        try:
            urls=[ROOT,urljoin(ROOT,'mobile.html'),urljoin(ROOT,'d/js/index.js')]
            seen=set(); found={}; docs=[]; errors=[]
            while urls and len(seen)<7:
                url=urls.pop(0)
                if url in seen: continue
                seen.add(url)
                try:
                    meta,data=self.net.fetch(url,cap=MAX_CHUNK); guard_response(meta,data,False)
                    text=data.decode('utf-8','replace'); docs.append({**meta,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
                    for item in extract_links(text,url):
                        p=urlsplit(item['url']).path.lower()
                        if re.search(r'\.(exe|apk|xapk|zip|7z)$',p):
                            item.update({'name':p.rsplit('/',1)[-1],'kind':'apk' if p.endswith('.apk') else 'installer'}); found[item['url']]=item
                        elif p.endswith('.js') and re.search(r'pc.?click|download|footer',p): urls.insert(0,item['url'])
                    if url==ROOT:
                        m=re.search(r'<title[^>]*>(.*?)</title>',text,re.I|re.S)
                        title=html.unescape(m[1].strip()) if m else None
                except BridgeError as e: errors.append({'url':url,**e.as_dict()})
            items=list(found.values())
            # Previously established sources remain explicitly labelled fallback candidates.
            for seed in SEEDS:
                if seed['url'] not in found: items.append({**seed,'fromPreviousInvestigation':True})
            for item in items[:5]:
                try: item['probe']=self.probe(item['url'])
                except BridgeError as e: item['probe']={**e.as_dict(),'state':'failed'}
            result={'state':'partial','checkedAt':stamp(),'websiteTitleNotAssetVersion':locals().get('title'),'downloads':items,'documents':docs,'errors':errors,'coverage':'unknown','gameAssetCount':None,'note':'已发现下载入口，不等于取得游戏资源清单；不会按活动解锁时间过滤未来取得的资源。'}
            if not docs and saved:
                result['previous']=saved; result['state']='refresh_failed'
            self.cache.put_json('discovery',result); return result
        finally: self.lock.release()
    def source(self,url): return BlobSource(self.net,self.cache,url)
    def archive(self,url,query='',page=0):
        src=self.source(url); k='zip:'+url+':'+src.version
        index=self.cache.get_json(k) if src.version else None
        if index is None:
            with open_archive(src) as z:
                index=[{'name':i.filename,'bytes':i.file_size,'packedBytes':i.compress_size,'crc32':f'{i.CRC:08x}','method':i.compress_type,'category':path_category(i.filename),'directory':i.is_dir()} for i in z.infolist()]
            if src.version: self.cache.put_json(k,index)
        filtered=[i for i in index if query.lower() in i['name'].lower()]
        page=max(0,page); selected=filtered[page*200:page*200+200]
        return {'state':'archive_index_only','url':url,'version':src.version,'totalEntries':len(index),'matched':len(filtered),'page':page,'pageSize':200,'items':selected,'note':'路径分类为检索提示；不是已解包的衣柜目录。'}
    def entry(self,url,name):
        src=self.source(url)
        with open_archive(src) as z:
            try: info=z.getinfo(name)
            except KeyError: raise BridgeError('entry_missing','安装包内不存在此条目',404)
            if info.is_dir(): raise BridgeError('is_directory','所选条目是目录')
            if info.flag_bits&1: raise BridgeError('encrypted_entry','该 ZIP 条目加密，本版不支持')
            if info.compress_type not in (zipfile.ZIP_STORED,zipfile.ZIP_DEFLATED): raise BridgeError('compression','仅支持 store/deflate 条目')
            if info.file_size>MAX_ENTRY or info.compress_size>MAX_ENTRY: raise BridgeError('entry_limit','单个解压预览条目限制为 8 MiB；不会在内存展开大包')
            # zipfile checks CRC when the stream is consumed fully.
            with z.open(info) as f: data=f.read(MAX_ENTRY+1)
            if len(data)!=info.file_size: raise BridgeError('entry_length','解压条目长度不符')
            return data

class Handler(BaseHTTPRequestHandler):
    server_version='YSLBridge/0.1'; protocol_version='HTTP/1.1'
    def log_message(self,fmt,*args): logging.info(fmt,*args)
    def allowed(self):
        host=self.headers.get('Host',''); port=self.server.server_port
        if host not in (f'127.0.0.1:{port}',f'localhost:{port}'):
            raise BridgeError('host','仅允许本机地址',403)
        origin=self.headers.get('Origin')
        if origin and origin not in ('null',f'http://127.0.0.1:{port}',f'http://localhost:{port}'):
            raise BridgeError('origin','本地中转拒绝其他网站跨域调用',403)
    def send(self,status,body=b'',mime='application/json; charset=utf-8',headers=None):
        self.send_response(status); self.send_header('Content-Type',mime); self.send_header('Content-Length',str(len(body)))
        self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Cache-Control','no-store'); self.send_header('Connection','close')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self' http://127.0.0.1:18763; object-src 'none'; base-uri 'none'")
        origin=self.headers.get('Origin')
        if origin in ('null',f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'):
            self.send_header('Access-Control-Allow-Origin',origin); self.send_header('Vary','Origin')
        self.send_header('Access-Control-Allow-Methods','GET, HEAD, OPTIONS, POST')
        self.send_header('Access-Control-Allow-Headers','Range, X-YSL-Token, Content-Type')
        self.send_header('Access-Control-Expose-Headers','Content-Length, Content-Range, ETag, X-YSL-Cache-Hits')
        for k,v in (headers or {}).items(): self.send_header(k,str(v))
        self.end_headers(); self.close_connection=True
        if self.command!='HEAD' and body: self.wfile.write(body)
    def jsend(self,value,status=200): self.send(status,json.dumps(value,ensure_ascii=False).encode())
    def do_OPTIONS(self):
        try: self.allowed(); self.send(204)
        except BridgeError as e: self.jsend(e.as_dict(),e.status)
    def do_HEAD(self): self.do_GET()
    def do_GET(self):
        try:
            self.allowed(); u=urlsplit(self.path); q=parse_qs(u.query); get=lambda k,default='':q.get(k,[default])[0]
            b=self.server.bridge; path=u.path
            if path in ('/','/client.html','/YSL_v0.1.html','/YSL_v0.1.txt'):
                headers={'Content-Disposition':'attachment; filename="'+path[1:]+'"'} if path.startswith('/YSL_') else {}
                self.send(200,(RESOURCES/'client.html').read_bytes(),'text/plain; charset=utf-8' if path.endswith('.txt') else 'text/html; charset=utf-8',headers); return
            if path=='/api/ysl/health':
                self.jsend({'ok':True,'app':'YSL Resource Bridge','version':VERSION,'relay':'local_loopback','token':b.token,'capabilities':{'discovery':True,'rangeRelay':True,'diskCache':True,'zipIndex':True,'zip64':False,'gameManifest':False,'ueModelDecode':False,'animationPlayback':False},'cache':b.cache.stats(),'network':{'requests':b.net.requests,'received':b.net.received}}); return
            if path=='/api/ysl/discover': self.jsend(b.discover(False)); return
            if path=='/api/ysl/catalog': self.jsend({'state':'not_obtained','coverage':'unknown','items':[],'message':'全量更新清单和 UE 资源容器尚未解析；当前不是可换装版本。'}); return
            if path=='/api/ysl/probe': self.jsend(b.probe(get('url'))); return
            if path=='/api/ysl/cache': self.jsend(b.cache.stats()); return
            if path=='/api/ysl/archive': self.jsend(b.archive(get('url'),get('q'),int(get('page','0')))); return
            if path=='/api/ysl/entry':
                data=b.entry(get('url'),get('name')); self.send(200,data,'application/octet-stream',{'Content-Disposition':'attachment; filename="entry.bin"'}); return
            if path=='/api/ysl/asset':
                src=b.source(get('url'))
                if self.command=='HEAD': self.send(200,b'','application/octet-stream',{'X-YSL-Source-Length':src.size}); return
                a,z=parse_range(self.headers.get('Range'),src.size); data=src.read(a,z)
                hs={'Content-Range':f'bytes {a}-{z}/{src.size}','Accept-Ranges':'bytes','X-YSL-Cache-Hits':b.cache.hits}
                if src.etag: hs['ETag']=src.etag
                self.send(206,data,'application/octet-stream',hs); return
            if path=='/api/ysl/evidence':
                p=RESOURCES/'evidence.json'; self.send(200,p.read_bytes() if p.exists() else b'{}'); return
            self.jsend({'ok':False,'message':'不存在的接口'},404)
        except BridgeError as e: self.jsend(e.as_dict(),e.status)
        except (zipfile.BadZipFile,ValueError) as e: self.jsend({'ok':False,'code':'parse_error','message':str(e)},422)
        except (BrokenPipeError,ConnectionResetError): pass
        except Exception as e:
            logging.exception('request failed'); self.jsend({'ok':False,'code':'internal','message':str(e)},500)
    def do_POST(self):
        try:
            self.allowed(); b=self.server.bridge
            if not secrets.compare_digest(self.headers.get('X-YSL-Token',''),b.token): raise BridgeError('token','本地会话校验失败',403)
            if self.path=='/api/ysl/refresh': self.jsend(b.discover(True)); return
            if self.path=='/api/ysl/quit':
                self.jsend({'ok':True,'message':'中转已关闭，磁盘缓存保留'}); threading.Thread(target=self.server.shutdown,daemon=True).start(); return
            self.jsend({'ok':False,'message':'不支持的写入接口'},405)
        except BridgeError as e: self.jsend(e.as_dict(),e.status)
        except Exception as e: self.jsend({'ok':False,'message':str(e)},500)
    def do_PUT(self): self.jsend({'ok':False,'message':'只读资源中转'},405)
    do_DELETE=do_PUT; do_PATCH=do_PUT

class Server(ThreadingHTTPServer):
    daemon_threads=True; allow_reuse_address=True
    def __init__(self,port,bridge):
        self.bridge=bridge; super().__init__(('127.0.0.1',port),Handler)

def default_cache():
    base=pathlib.Path(os.environ.get('LOCALAPPDATA',str(pathlib.Path.home()/'.cache')))
    return base/'YSLResourceBridge'

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=PORT); parser.add_argument('--cache',default=str(default_cache())); parser.add_argument('--no-browser',action='store_true')
    args=parser.parse_args(); cache=DiskCache(args.cache)
    logging.basicConfig(filename=str(cache.root/'bridge.log'),level=logging.INFO,format='%(asctime)s %(message)s')
    url=f'http://127.0.0.1:{args.port}/'
    try: server=Server(args.port,Bridge(cache))
    except OSError:
        try:
            c=http.client.HTTPConnection('127.0.0.1',args.port,timeout=2); c.request('GET','/api/ysl/health'); r=c.getresponse(); info=json.loads(r.read(8192)); c.close()
            if info.get('app')!='YSL Resource Bridge': raise RuntimeError('固定端口被其他程序占用')
            if not args.no_browser: webbrowser.open(url)
            return
        except Exception: raise RuntimeError(f'无法启动本地中转：端口 {args.port} 被占用，请查看日志。')
    if not args.no_browser: threading.Timer(0.35,lambda:webbrowser.open(url)).start()
    try: server.serve_forever(poll_interval=0.2)
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__=='__main__':
    try: main()
    except Exception as e:
        if os.name=='nt' and getattr(sys,'frozen',False):
            import ctypes; ctypes.windll.user32.MessageBoxW(0,str(e),'YSL 启动失败',16)
        else: raise
