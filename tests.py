"""Local fixtures only. Passing these is NOT evidence of game-resource coverage."""
import io, json, pathlib, tempfile, threading, unittest, zipfile, http.client
from urllib.parse import quote
from unittest.mock import patch
from bridge import *

URL='https://mystyle.archosaur.com/fixture.apk'
class FakeNetwork:
    def __init__(self,data,etag='"fixture-v1"',mode='good'):
        self.data=data; self.etag=etag; self.mode=mode; self.requests=0; self.received=0
    def fetch(self,url,method='GET',headers=None,cap=MAX_CHUNK,sample=False):
        self.requests+=1
        h={'content-type':'application/octet-stream','content-length':str(len(self.data))}
        if self.etag: h['etag']=self.etag
        meta={'url':url,'status':200,'headers':h}
        if self.mode=='html': h['content-type']='text/html'; return meta,b'<script>challenge</script>' if method!='HEAD' else b''
        if method=='HEAD': return meta,b''
        data=self.data
        if headers and headers.get('Range') and self.mode!='ignore':
            a,b=parse_range(headers['Range'],len(data)); data=data[a:b+1]
            h['content-range']=f'bytes {a}-{b}/{len(self.data)}';meta['status']=206
            if self.mode=='wrong_range': h['content-range']=f'bytes {a+1}-{b+1}/{len(self.data)}'
        if self.mode=='changed': h['etag']='"fixture-v2"'
        if self.mode=='short': data=data[:-1]
        self.received+=len(data)
        return meta,data[:cap] if sample else data

def zip_fixture():
    b=io.BytesIO()
    with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('config/test.json','{"fixture":true}')
        z.writestr('StreamingAssets/res_base/package/ui.png',b'NOT A REAL PNG')
    return b.getvalue()

class CoreTests(unittest.TestCase):
    def setUp(self): self.temp=tempfile.TemporaryDirectory(); self.cache=DiskCache(self.temp.name)
    def tearDown(self): self.temp.cleanup()
    def source(self,data=b'0123456789abcdef',mode='good',etag='"fixture-v1"'):
        n=FakeNetwork(data,etag,mode); return BlobSource(n,self.cache,URL),n
    def test_allow_official(self):
        self.assertEqual(validate_url('https://autopatch-projecti-put-hs.zulong.com/a').hostname,'autopatch-projecti-put-hs.zulong.com')
    def test_reject_hosts(self):
        for x in ['http://mystyle.archosaur.com/a','https://evilzulong.com/a','https://zulong.com.evil.test/a','https://127.0.0.1/a','https://u:p@zulong.com/a','https://zulong.com:8000/a','https://zulong.com/a#b','https://zulong.com/../a','https://zulong.com/a\nb']:
            with self.subTest(x=x),self.assertRaises(BridgeError):validate_url(x)
    def test_public_dns_required(self):
        with patch('socket.getaddrinfo',return_value=[(socket.AF_INET,socket.SOCK_STREAM,6,'',('127.0.0.1',443))]):
            with self.assertRaises(BridgeError) as cm:Network().fetch('https://zulong.com/')
            self.assertEqual(cm.exception.code,'private_address')
    def test_ranges(self):
        self.assertEqual(parse_range('bytes=0-7',10),(0,7))
        for s in ['bytes=0-','bytes=-3','bytes=0-1,3-4','bytes=9-10','bytes=5-1','items=0-2']:
            with self.subTest(s=s),self.assertRaises(BridgeError):parse_range(s,10)
    def test_empty_200_is_not_asset(self):
        b=Bridge(self.cache,FakeNetwork(b'',mode='ignore'))
        result=b.probe(URL)
        self.assertEqual(result['state'],'not_asset')
        self.assertEqual(result['bytesSampled'],0)

    def test_magic(self):
        self.assertEqual(magic(b'  <script>x'),'HTML/script');self.assertEqual(magic(b'MZabc'),'PE installer')
    def test_error_status(self):
        with self.assertRaises(BridgeError) as cm:guard_response({'status':404,'headers':{}},b'')
        self.assertEqual(cm.exception.status,404)
    def test_html_never_cached(self):
        with self.assertRaises(BridgeError):self.source(mode='html')
        self.assertEqual(self.cache.stats()['blocks'],0)
    def test_exact_range_and_cache(self):
        s,n=self.source();self.assertEqual(s.read(0,7),b'01234567');calls=n.requests
        self.assertEqual(s.read(0,7),b'01234567');self.assertEqual(n.requests,calls);self.assertEqual(self.cache.hits,1)
    def test_cache_survives_reopen(self):
        s,n=self.source();s.read(2,7);c=DiskCache(self.temp.name);s2=BlobSource(n,c,URL);calls=n.requests
        self.assertEqual(s2.read(2,7),b'234567');self.assertEqual(n.requests,calls)
    def test_cache_integrity(self):
        s,n=self.source();s.read(0,7);(self.cache.blocks/cache_key(URL,s.version,0,7)).write_bytes(b'corrupt!')
        calls=n.requests;self.assertEqual(s.read(0,7),b'01234567');self.assertGreater(n.requests,calls)
    def test_weak_or_no_validator(self):
        s,n=self.source(etag='W/"abc"');s.read(0,3);self.assertEqual(self.cache.stats()['blocks'],0)
    def test_wrong_range_rejected(self):
        s,n=self.source(mode='wrong_range')
        with self.assertRaises(BridgeError):s.read(0,7)
        self.assertEqual(self.cache.stats()['blocks'],0)
    def test_ignored_range_rejected(self):
        s,n=self.source(mode='ignore')
        with self.assertRaises(BridgeError):s.read(0,7)
    def test_changed_version_rejected(self):
        s,n=self.source(mode='changed')
        with self.assertRaises(BridgeError) as cm:s.read(0,7)
        self.assertEqual(cm.exception.code,'version_changed')
    def test_short_read_rejected(self):
        s,n=self.source(mode='short')
        with self.assertRaises(BridgeError):s.read(0,7)
    def test_zip_directory_and_entry(self):
        b=Bridge(self.cache,FakeNetwork(zip_fixture()));v=b.archive(URL,'config')
        self.assertEqual(v['totalEntries'],2);self.assertEqual(v['matched'],1)
        self.assertEqual(b.entry(URL,'config/test.json'),b'{"fixture":true}')
    def test_missing_entry(self):
        b=Bridge(self.cache,FakeNetwork(zip_fixture()))
        with self.assertRaises(BridgeError):b.entry(URL,'missing')
    def test_crc_checked(self):
        data=bytearray(zip_fixture());i=data.index(b'PK\x01\x02');data[i+16]^=0x55
        b=Bridge(self.cache,FakeNetwork(bytes(data)))
        with self.assertRaises(zipfile.BadZipFile):b.entry(URL,'config/test.json')
    def test_not_zip(self):
        s,n=self.source(b'MZ'+b'0'*150)
        with self.assertRaises(BridgeError) as cm:open_archive(s)
        self.assertEqual(cm.exception.code,'not_zip')
    def test_template_literals_and_comments(self):
        t='<!-- href="https://zulong.com/old.exe" --> var x=`https://zulong.com/current.exe`;var y=`https://zulong.com/${bad}.exe`;'
        a=extract_links(t,ROOT);self.assertEqual([x['url'] for x in a],['https://zulong.com/current.exe'])
    def test_plain_png_container_not_image(self):
        self.assertNotEqual(magic(b'NOT A REAL PNG'),'PNG')
    def test_catalog_seed_honesty(self):
        b=Bridge(self.cache,FakeNetwork(b'a'));v=b.discover(False)
        self.assertEqual(v['coverage'],'unknown');self.assertIsNone(v['gameAssetCount']);self.assertEqual(b.net.requests,0)

class HttpTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.bridge=Bridge(DiskCache(self.temp.name),FakeNetwork(zip_fixture()))
        self.server=Server(0,self.bridge);self.t=threading.Thread(target=self.server.serve_forever,daemon=True);self.t.start()
    def tearDown(self):self.server.shutdown();self.server.server_close();self.t.join();self.temp.cleanup()
    def req(self,path,method='GET',headers=None):
        c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3);c.request(method,path,headers=headers or {});r=c.getresponse();data=r.read();h=dict(r.getheaders());status=r.status;c.close();return status,data,h
    def test_health_and_unknown_catalog(self):
        s,d,h=self.req('/api/ysl/health');v=json.loads(d);self.assertEqual(s,200);self.assertFalse(v['capabilities']['ueModelDecode'])
        s,d,h=self.req('/api/ysl/catalog');self.assertEqual(json.loads(d)['state'],'not_obtained')
    def test_cross_origin_blocked(self):
        s,d,h=self.req('/api/ysl/health',headers={'Origin':'https://example.com'});self.assertEqual(s,403)
    def test_host_rebinding_blocked(self):
        s,d,h=self.req('/api/ysl/health',headers={'Host':'attacker.test'});self.assertEqual(s,403)
    def test_shutdown_requires_token(self):
        s,d,h=self.req('/api/ysl/quit','POST');self.assertEqual(s,403)
    def test_html_txt_identical(self):
        s,a,h=self.req('/YSL_v0.1.1.html');s,b,h=self.req('/YSL_v0.1.1.txt');self.assertEqual(a,b);self.assertIn(b'<html',a)
    def test_asset_range(self):
        s,d,h=self.req('/api/ysl/asset?url='+quote(URL,safe=''),headers={'Range':'bytes=0-7'})
        self.assertEqual(s,206);self.assertEqual(d,zip_fixture()[:8]);self.assertTrue(h['Content-Range'].startswith('bytes 0-7/'))
    def test_asset_range_required(self):
        s,d,h=self.req('/api/ysl/asset?url='+quote(URL,safe=''));self.assertEqual(s,416)

if __name__=='__main__':unittest.main()
