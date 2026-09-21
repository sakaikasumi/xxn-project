from pathlib import Path
import re,base64,gzip,json,hashlib,urllib.request,traceback
import UnityPy
out=Path('artifacts/flare168');out.mkdir(parents=True,exist_ok=True)
s=Path('artifacts/ES_c62.164_BloomRoute_SourcePulse.html').read_text()
m=re.search(r'<script\b[^>]*\bid=[\"\']cat-3dlive[\"\'][^>]*>([\s\S]*?)</script>',s)
assert m,'3dlive catalog absent'
raw=m.group(1).strip();data=gzip.decompress(base64.b64decode(raw));rows=json.loads(data)
candidates=[r for r in rows if 'flare' in r[0].lower() or r[0]=='3dlive/livescenes/mv322_callyourname']
report={'catalogCandidates':candidates,'bundles':[]}
for row in candidates[:16]:
 p,h=row[:2];rel=f'asset_bundles/Android/{p}.bundle.{h}';res={'path':p,'hash':h};report['bundles'].append(res)
 try:
  cache=out/(re.sub(r'[^a-zA-Z0-9_-]','_',p)+'.bundle')
  if cache.exists():b=cache.read_bytes();url='prior cached download'
  else:
   urls=['https://es-cdn-bridge-a4820e.lovable.app/api/public/cdn/'+rel,'https://assets.boysm.hekk.org/'+rel]
   failures=[];b=None
   for url in urls:
    try:
     with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25) as r:b=r.read(24000000)
     assert b[:7]==b'UnityFS',str(b[:40]);break
    except Exception as e:failures.append(str(e));b=None
   if b is None:raise RuntimeError('; '.join(failures))
   cache.write_bytes(b)
  res.update(bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),source=url)
  env=UnityPy.load(b);objs=[];records=[];sprites=[];textures=[]
  for o in env.objects:
   if o.type.name in ['MonoBehaviour','MonoScript','GameObject','Transform','Material','Sprite','Texture2D']:
    try:d=o.read_typetree()
    except Exception as e:objs.append({'id':str(o.path_id),'type':o.type.name,'error':str(e)[:200]});continue
    name=d.get('m_Name','');entry={'id':str(o.path_id),'type':o.type.name,'name':name,'file':o.assets_file.name}
    if o.type.name=='MonoBehaviour':
     def interesting(x):
      if isinstance(x,dict):return any('flare' in str(k).lower() or interesting(v) for k,v in x.items())
      if isinstance(x,list):return any(interesting(v) for v in x[:30])
      if isinstance(x,str):return 'flare' in x.lower()
      return False
     if interesting(d):
      records.append({'id':str(o.path_id),'data':d})
      entry['flareFields']={k:v for k,v in d.items() if 'flare' in k.lower() or k in ['_meshId','_atlasName','_sprite','Sprites','Texture','m_GameObject']}
    if o.type.name=='Sprite':
     rd=d.get('m_RD',{});sprites.append({'id':str(o.path_id),'name':name,'rect':rd.get('textureRect'),'uvTransform':rd.get('uvTransform'),'texture':rd.get('texture'),'settingsRaw':rd.get('settingsRaw'),'pixelsToUnits':d.get('m_PixelsToUnits'),'spriteRect':d.get('m_Rect')})
     im=o.read().image;fn=re.sub(r'[^a-zA-Z0-9_-]','_',name)+'_'+str(o.path_id)+'.png';im.save(out/fn);entry['png']=fn
    if o.type.name=='Texture2D':
     textures.append({'id':str(o.path_id),'name':name,'width':d.get('m_Width'),'height':d.get('m_Height'),'format':d.get('m_TextureFormat'),'colorSpace':d.get('m_ColorSpace')})
    objs.append(entry)
  res.update(objects=objs,sprites=sprites,textures=textures)
  detail=out/(cache.stem+'.records.json');detail.write_text(json.dumps(records,ensure_ascii=False,default=str));res['recordsFile']=str(detail)
 except Exception as e:res['error']=traceback.format_exc()
(out/'resource-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2,default=str))
print(json.dumps({'candidateCount':len(candidates),'bundles':[{'path':x['path'],'bytes':x.get('bytes'),'sprites':len(x.get('sprites',[])),'errors':x.get('error')} for x in report['bundles']]},ensure_ascii=False))
