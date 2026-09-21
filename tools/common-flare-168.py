from pathlib import Path
import re,base64,gzip,json,urllib.request,hashlib,traceback,collections
import UnityPy
out=Path('artifacts/flare168');rep=json.loads((out/'detail-summary.json').read_text());summary={k:v for k,v in rep.items() if k not in ['commonRows','payloads']};summary['commonBundles']=[]
s=Path('artifacts/ES_c62.164_BloomRoute_SourcePulse.html').read_text();m=re.search(r'<script\b[^>]*\bid="cat-3dlive"[^>]*>([\s\S]*?)</script>',s);rows=json.loads(gzip.decompress(base64.b64decode(m.group(1).strip())))
for path in ['3dlive/common/model','3dlive/livescenes/common/allstage']:
 row=next(r for r in rows if r[0]==path);cache=out/(path.replace('/','_')+'.bundle');rpt={'row':row};summary['commonBundles'].append(rpt)
 try:
  if not cache.exists():
   rel=f'asset_bundles/Android/{path}.bundle.{row[1]}'
   for origin in ['https://es-cdn-bridge-a4820e.lovable.app/api/public/cdn/','https://assets.boysm.hekk.org/']:
    try:
     with urllib.request.urlopen(origin+rel,timeout=30) as r:b=r.read(24000000)
     assert b[:7]==b'UnityFS';cache.write_bytes(b);break
    except Exception as e:rpt.setdefault('fetchFailures',[]).append(str(e))
  b=cache.read_bytes();rpt['sha256']=hashlib.sha256(b).hexdigest();env=UnityPy.load(b);sprites=[];atlases=[];interesting=[]
  for o in env.objects:
   if o.type.name not in ['Sprite','Texture2D','MonoBehaviour']:continue
   try:d=o.read_typetree()
   except Exception:continue
   name=d.get('m_Name','')
   if o.type.name=='MonoBehaviour' and ('Sprites' in d or '_atlasName' in d):atlases.append({'id':str(o.path_id),'data':d})
   if o.type.name=='Sprite':
    rd=d.get('m_RD',{});item={'id':str(o.path_id),'name':name,'rect':rd.get('textureRect'),'texture':rd.get('texture'),'file':o.assets_file.name};sprites.append(item)
    if re.search('flare|star|glow|spark|light',name,re.I):
     im=o.read().image;fn=re.sub(r'[^a-zA-Z0-9_-]','_',name)+'_'+str(o.path_id)+'.png';im.save(out/fn);item['png']=fn
     # Export cropped, padded, correctly oriented RGBA pixels. No shape synthesis.
     item['size']=list(im.size);item['rgbaGzip']=base64.b64encode(gzip.compress(im.convert('RGBA').tobytes())).decode();item['pixelSHA256']=hashlib.sha256(im.convert('RGBA').tobytes()).hexdigest()
   if o.type.name=='Texture2D' and re.search('flare|atlas',name,re.I):interesting.append({'id':str(o.path_id),'name':name,'width':d.get('m_Width'),'height':d.get('m_Height'),'colorSpace':d.get('m_ColorSpace')})
  (out/(cache.stem+'.sprite-pixels.json')).write_text(json.dumps(sprites,separators=(',',':')))
  rpt['sprites']=[{k:v for k,v in x.items() if k!='rgbaGzip'} for x in sprites];rpt['atlases']=atlases;rpt['textures']=interesting
 except Exception as e:rpt['error']=traceback.format_exc()
(out/'findings.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2,default=str))
print('settings',list(summary.get('settings',{})));print('atlases',summary.get('atlas'));print('common',[(x['row'][0],len(x.get('sprites',[]))) for x in summary['commonBundles']])
