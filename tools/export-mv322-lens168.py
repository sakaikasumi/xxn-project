from pathlib import Path
import json,gzip,base64,urllib.request,hashlib
from PIL import Image
import UnityPy
out=Path('artifacts/flare168')
url='https://assets.boysm.hekk.org/asset_bundles/Android/3dlive/livesceneassets/mv322_callyourname.bundle.381211ef4c2560102f7f173f3e8720d8'
with urllib.request.urlopen(url,timeout=45) as response: data=response.read()
assert len(data)==26924676 and data[:7]==b'UnityFS'
env=UnityPy.load(data);pack=json.loads((out/'mv322-pack.json').read_text());evidence=[];tex={}
for obj in env.objects:
 if obj.type.name=='Texture2D':
  d=obj.read_typetree();tex[str(obj.path_id)]={'name':d.get('m_Name'),'colorSpace':d.get('m_ColorSpace')}
for obj in env.objects:
 if obj.type.name!='Sprite':continue
 d=obj.read_typetree()
 if d.get('m_Name')!='EffectAtlas_mv322_Lens':continue
 im=obj.read().image.convert('RGBA');im.save(out/'EffectAtlas_mv322_Lens.png');pixels=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes();rd=d['m_RD'];item={'name':d['m_Name'],'id':str(obj.path_id),'file':obj.assets_file.name,'bundle':'3dlive/livesceneassets/mv322_callyourname','bundleSHA256':hashlib.sha256(data).hexdigest(),'size':list(im.size),'pixelSHA256':hashlib.sha256(pixels).hexdigest(),'textureMeta':tex.get(str(rd.get('texture',{}).get('m_PathID')),{}),'rgbaGzip':base64.b64encode(gzip.compress(pixels)).decode()};pack=[x for x in pack if x['name']!=item['name']]+[item];evidence.append({k:v for k,v in item.items() if k!='rgbaGzip'})
assert evidence,'Referenced sprite not found'
(out/'mv322-pack.json').write_text(json.dumps(pack,separators=(',',':')))
(out/'sprite-evidence.json').write_text(json.dumps({'sourceURL':url,'sprites':[{k:v for k,v in item.items() if k!='rgbaGzip'} for item in pack]},indent=2))
chars=' .:-=+*#%@';small=im.resize((49,33));ascii='\n'.join(''.join(chars[min(9,int(max(small.getpixel((x,y))[:3])/256*10))] for x in range(49)) for y in range(33));(out/'sprite-preview.txt').write_text(ascii);print(ascii)
