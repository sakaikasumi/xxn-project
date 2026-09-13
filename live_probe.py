"""Bounded REAL official-source inspection; results are not fixture tests."""
import hashlib,json,pathlib,re,shutil,subprocess,tempfile
from bridge import Bridge,DiskCache,SEEDS,BridgeError,stamp,extract_links,magic
OUT=pathlib.Path('out');OUT.mkdir(exist_ok=True)
result={'checkedAt':stamp(),'kind':'real_network','downloads':[],'documents':[],'installerInspection':[],'gameManifestObtained':False}
with tempfile.TemporaryDirectory() as tmp:
    b=Bridge(DiskCache(tmp))
    extra=[]
    try:
        url='https://mystyle.archosaur.com/d/index.html'
        meta,data=b.net.fetch(url); text=data.decode('utf-8','replace');(OUT/'mobile-download-page.txt').write_text(text,encoding='utf-8')
        links=extract_links(text,url);result['documents'].append({**meta,'links':links});print('MOBILE_DOWNLOAD_LINKS',json.dumps(links,ensure_ascii=False),flush=True)
        for item in links:
            if re.search(r'\.(?:apk|exe)$',item['url'],re.I):extra.append({'name':'mobile-page','url':item['url'],'source':url})
    except BridgeError as e:result['documents'].append(e.as_dict())
    seeds=list({x['url']:x for x in SEEDS+extra}.values())
    for seed in seeds[:4]:
        try:
            p=b.probe(seed['url']);result['downloads'].append({**seed,'probe':p});print('PROBE',json.dumps(result['downloads'][-1],ensure_ascii=False),flush=True)
            if p['state']=='sample_received' and p['magic']=='ZIP/APK':
                try:
                    cat=b.archive(seed['url'],'config',0);result['archive']=cat;print('ARCHIVE',json.dumps(cat,ensure_ascii=False),flush=True)
                except Exception as e:result['archiveError']=str(e)
            if p['state']=='sample_received' and p['magic']=='PE installer' and p['size'] and p['size']<=16*1024*1024:
                src=b.source(seed['url']);parts=[]
                for start in range(0,src.size,2*1024*1024):parts.append(src.read(start,min(src.size-1,start+2*1024*1024-1)))
                raw=b''.join(parts);file=pathlib.Path(tmp)/'installer.exe';file.write_bytes(raw)
                # Do not execute installer. Strings and archive listing only.
                values=[]
                for text in (raw.decode('latin1','ignore'),raw.decode('utf-16le','ignore')):
                    values+=re.findall(r'https?://[A-Za-z0-9./_%?=&:+-]{8,400}',text)
                urls=sorted(set(x for x in values if 'zulong' in x or 'archosaur' in x))
                item={'url':seed['url'],'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'embeddedUrls':urls,'executed':False}
                seven=shutil.which('7z') or shutil.which('7zz')
                if seven:
                    run=subprocess.run([seven,'l',str(file)],capture_output=True,text=True,errors='replace',timeout=25)
                    item['archiveList']=run.stdout[:24000];item['archiveExit']=run.returncode
                result['installerInspection'].append(item);print('INSTALLER_INSPECTION',json.dumps(item,ensure_ascii=False),flush=True)
        except Exception as e:result['downloads'].append({**seed,'error':str(e)});print('PROBE_ERROR',seed['url'],str(e),flush=True)
    result['requests']=b.net.requests;result['receivedBytes']=b.net.received
(OUT/'live-probe.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('LIVE_SUMMARY',json.dumps({'requests':result['requests'],'receivedBytes':result['receivedBytes'],'gameManifestObtained':False},ensure_ascii=False),flush=True)
