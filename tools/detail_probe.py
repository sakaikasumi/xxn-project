#!/usr/bin/env python3
"""Follow only publicly referenced download pages, without executing their scripts."""
import datetime, hashlib, json, pathlib, re, http.client
from urllib.parse import urlsplit, urlunsplit
import discover as d

URLS = [
 'https://mystyle.archosaur.com/assets/260831/public/pcclick.js',
 'https://mystyle.archosaur.com/mobile.html',
 'https://mystyle.archosaur.com/page/yslzmpc/',
 'https://mystyle.archosaur.com/home/index.html',
]
def main():
    out = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'documents': [], 'downloads': [], 'errors': []}
    downloads = {}; docs = []
    for url in URLS:
        try:
            meta, data = d.request(url)
            text = data.decode('utf-8', 'replace')
            name = hashlib.sha256(url.encode()).hexdigest()[:16] + '.txt'
            (d.OUT/'raw'/name).write_bytes(data)
            candidates = d.candidates(text, url)
            out['documents'].append({**meta, 'evidenceFile': 'raw/'+name, 'links': candidates})
            print('DOCUMENT', url, meta['status'], len(data), flush=True)
            if url.endswith('.js'):
                print('SCRIPT_TEXT', text[:16000], flush=True)
            for item in candidates:
                p = urlsplit(item['url'])
                if re.search(r'\.(?:apk|exe|zip|7z|json|ini|manifest)$', p.path, re.I):
                    downloads.setdefault(item['url'], item)
                elif p.path.endswith('.js') and re.search(r'click|download|common|index', p.path, re.I):
                    docs.append(item['url'])
            print('RELEVANT_LINKS', json.dumps([i for i in candidates if re.search(r'click|download|\.apk|\.exe|version|config', i['url'], re.I)], ensure_ascii=False), flush=True)
        except Exception as e: out['errors'].append({'url':url,'error':str(e)})
    for url in list(dict.fromkeys(docs))[:4]:
        if url in URLS: continue
        try:
            meta, data = d.request(url)
            text = data.decode('utf-8','replace')
            print('EXTRA_SCRIPT', url, meta['status'], text[:18000], flush=True)
            for item in d.candidates(text,url):
                if re.search(r'\.(?:apk|exe|zip|7z|json|ini|manifest)(?:\?|$)',item['url'],re.I): downloads.setdefault(item['url'],item)
        except Exception as e: out['errors'].append({'url':url,'error':str(e)})
    for item in list(downloads.values())[:5]:
        try:
            meta,data=d.request(item['url'],sample=True)
            item['probe']={**meta,'hex':data.hex(),'ascii':data.decode('ascii','replace')}
        except Exception as e: item['error']=str(e)
        out['downloads'].append(item)
    # The footer explicitly publishes this HTTP URL. Inspect a bounded sample only.
    url='http://autopatch-projecti-tc-pkg.zulong.com/projectIgame_ob/media/yslzm.apk'
    try:
        p,ip=d.checked(url.replace('http://','https://',1))
        c=http.client.HTTPConnection(ip,80,timeout=12)
        c.request('GET',p.path,headers={'Host':p.hostname,'Range':'bytes=0-127','Accept-Encoding':'identity','User-Agent':'Mozilla/5.0'})
        r=c.getresponse(); data=r.read(128)
        out['explicitHttpProbe']={'url':url,'status':r.status,'headers':dict(r.getheaders()),'hex':data.hex()}
        c.close()
    except Exception as e: out['explicitHttpProbe']={'url':url,'error':str(e)}
    (d.OUT/'detail-probe.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
    print('DETAIL_SUMMARY',json.dumps({k:v for k,v in out.items() if k!='documents'},ensure_ascii=False),flush=True)

if __name__=='__main__': main()
