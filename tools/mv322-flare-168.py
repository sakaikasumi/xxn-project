from pathlib import Path
import re,base64,gzip,json,urllib.request,hashlib,traceback
from PIL import Image
import UnityPy
out=Path('artifacts/flare168');s=Path('artifacts/ES_c62.164_BloomRoute_SourcePulse.html').read_text()
def payload(id):
 m=re.search(r'<script\b[^>]*\bid="'+re.escape(id)+r'"[^>]*>([\s\S]*?)</script>',s);return json.loads(gzip.decompress(base64.b64decode(m.group(1).strip())))
rows=payload('cat-3dlive');catalog={r[0]:r for r in rows};deps=payload('cat-deps');scene='3dlive/livescenes/mv322_callyourname'
def strings(x):
 if isinstance(x,str):yield x
 elif isinstance(x,dict):
  for k,v in x.items():yield k;yield from strings(v)
 elif isinstance(x,list):
  for v in x:yield from strings(v)
sel=deps.get(scene) if isinstance(deps,dict) else [r for r in deps if scene in list(strings(r))]
rpt={'dependencyType':type(deps).__name__,'sceneDependency':sel,'matchingRows':[r for r in rows if 'mv322' in r[0]],'bundles':[],'spritePack':[]}
paths=list(dict.fromkeys(p for p in strings(sel) if p in catalog and p!=scene and 'livecharacters' not in p and 'motion' not in p))
# Include scene-named stage models even when the dependency table uses another nesting format.
paths+= [r[0] for r in rows if 'mv322' in r[0] and ('stage' in r[0] or 'atlas' in r[0]) and r[0] not in paths]
paths=list(dict.fromkeys(paths));rpt['candidatePaths']=paths
for p in paths[:14]:
 row=catalog[p];cache=out/(p.replace('/','_')+'.bundle');a={'path':p,'hash':row[1]};rpt['bundles'].append(a)
 try:
  if not cache.exists():
   rel=f'asset_bundles/Android/{p}.bundle.{row[1]}'
   for origin in ['https://es-cdn-bridge-a4820e.lovable.app/api/public/cdn/','https://assets.boysm.hekk.org/']:
    try:
     with urllib.request.urlopen(origin+rel,timeout=22) as res:b=res.read(24000000)
     assert b[:7]==b'UnityFS';cache.write_bytes(b);break
    except Exception as e:a.setdefault('fetchFailures',[]).append(str(e))
  b=cache.read_bytes();a['sha256']=hashlib.sha256(b).hexdigest();env=UnityPy.load(b);sprites=[];atlases=[];textureMeta={}
  for o in env.objects:
   if o.type.name=='Texture2D':
    d=o.read_typetree();textureMeta[str(o.path_id)]={'colorSpace':d.get('m_ColorSpace'),'name':d.get('m_Name')}
  for o in env.objects:
   if o.type.name not in ['Sprite','MonoBehaviour']:continue
   try:d=o.read_typetree()
   except Exception:continue
   if o.type.name=='MonoBehaviour' and 'Sprites' in d:atlases.append({'id':str(o.path_id),'data':d})
   if o.type.name!='Sprite':continue
   name=d.get('m_Name','');rd=d.get('m_RD',{});item={'name':name,'id':str(o.path_id),'rect':rd.get('textureRect'),'texture':rd.get('texture'),'file':o.assets_file.name,'bundle':p};sprites.append(item)
   if name in ['EffectAtlas_mv322_Lens','Flare']:
    im=o.read().image.convert('RGBA');fn=name+'.png';im.save(out/fn)
    # Bottom-up RGBA for unflipped WebGL DataTexture. No generated rays or Gaussian masks.
    pixels=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes();meta=textureMeta.get(str(rd.get('texture',{}).get('m_PathID')),{});pack={**item,'size':list(im.size),'png':fn,'rgbaGzip':base64.b64encode(gzip.compress(pixels)).decode(),'pixelSHA256':hashlib.sha256(pixels).hexdigest(),'textureMeta':meta};rpt['spritePack'].append(pack)
  a.update(sprites=sprites,atlases=atlases)
 except Exception:a['error']=traceback.format_exc()
(out/'mv322-pack.json').write_text(json.dumps(rpt['spritePack'],separators=(',',':')))
rpt['spritePack']=[{k:v for k,v in a.items() if k!='rgbaGzip'} for a in rpt['spritePack']]
(out/'mv322-findings.json').write_text(json.dumps(rpt,ensure_ascii=False,indent=2))
print('CANDIDATES',paths);print('PACK',[(x['name'],x['size']) for x in rpt['spritePack']])
