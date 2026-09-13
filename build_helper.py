"""Build helper: pack exactly matching HTML/TXT and smoke-test the Windows executable."""
import hashlib,http.client,json,os,pathlib,re,shutil,subprocess,sys,tempfile,time,zipfile
ROOT=pathlib.Path(__file__).resolve().parent
OUT=ROOT/'out';OUT.mkdir(exist_ok=True)

def prepare():
    out=ROOT/'dist';out.mkdir(exist_ok=True)
    html=(ROOT/'client.html').read_bytes()
    (out/'YSL_v0.1.html').write_bytes(html);(out/'YSL_v0.1.txt').write_bytes(html)
    (out/'README.txt').write_bytes((ROOT/'README.md').read_bytes())
    (OUT/'client-check.js').write_text(re.search(r'<script>(.*?)</script>',html.decode(),re.S)[1],encoding='utf-8')
    for name in ('evidence.json','out/live-probe.json','out/test-results.txt','out/browser-smoke.txt'):
        p=ROOT/name
        if p.exists():shutil.copy2(p,out/p.name)
    with zipfile.ZipFile(out/'YSL_v0.1_source.zip','w',zipfile.ZIP_DEFLATED) as z:
        for name in ('bridge.py','client.html','tests.py','live_probe.py','build_helper.py','README.md','evidence.json'):
            z.write(ROOT/name,name)
        for p in OUT.glob('*'):
            if p.is_file() and p.suffix in ('.json','.txt','.png'):z.write(p,'evidence/'+p.name)
    print('PACKAGE_FILES',json.dumps({p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir() if p.is_file()}),flush=True)

def smoke_exe():
    exe=ROOT/'dist'/'YSL_v0.1.exe'
    with tempfile.TemporaryDirectory() as tmp:
        child=subprocess.Popen([str(exe),'--no-browser','--cache',tmp,'--port','18764'])
        try:
            last=None
            for _ in range(40):
                try:
                    c=http.client.HTTPConnection('127.0.0.1',18764,timeout=2);c.request('GET','/api/ysl/health');r=c.getresponse();v=json.loads(r.read());c.close()
                    if v.get('ok'):break
                except Exception as e:last=e;time.sleep(.5)
            else:raise RuntimeError('Executable health failed: '+str(last))
            def get(path):
                c=http.client.HTTPConnection('127.0.0.1',18764,timeout=5);c.request('GET',path);r=c.getresponse();data=r.read();status=r.status;c.close();assert status==200;return data
            assert get('/YSL_v0.1.html')==get('/YSL_v0.1.txt')==(ROOT/'client.html').read_bytes()
            assert json.loads(get('/api/ysl/catalog'))['state']=='not_obtained'
            c=http.client.HTTPConnection('127.0.0.1',18764,timeout=5);c.request('POST','/api/ysl/quit',headers={'X-YSL-Token':v['token']});r=c.getresponse();assert r.status==200;r.read();c.close()
            child.wait(timeout=10);assert child.returncode==0
            report={'windowsExecutable':'passed','health':True,'htmlTxtIdentical':True,'quitExitsProcess':True,'gameResourcesVerified':False}
            (OUT/'exe-smoke.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('EXE_SMOKE',json.dumps(report),flush=True)
        finally:
            if child.poll() is None:child.terminate();child.wait(timeout=10)
    shutil.copy2(OUT/'exe-smoke.json',ROOT/'dist'/'exe-smoke.json')
    print('EXE_FILE',exe.stat().st_size,hashlib.sha256(exe.read_bytes()).hexdigest(),flush=True)

if __name__=='__main__':
    if '--smoke-exe' in sys.argv:smoke_exe()
    else:prepare()
