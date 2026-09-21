from pathlib import Path
import re,base64,gzip,json,collections
import UnityPy
out=Path('artifacts/flare168');s=Path('artifacts/ES_c62.164_BloomRoute_SourcePulse.html').read_text();rep={}
rep['payloads']=[];rep['commonRows']=[]
for m in re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script>',s):
 a,t=m.groups();mi=re.search(r'\bid=[\"\']([^\"\']+)',a)
 if not mi:continue
 id=mi.group(1)
 if id.startswith('cat-') or 'dep' in id.lower():
  rep['payloads'].append({'id':id,'length':len(t),'attrs':a})
  try:
   d=json.loads(gzip.decompress(base64.b64decode(t.strip())))
   if id.startswith('cat-'):
    rep['commonRows'] += [{'cat':id,'row':r} for r in d if isinstance(r,list) and isinstance(r[0],str) and (('/common/' in r[0] and not '/livecharacters/' in r[0]) or ('/atlas' in r[0]))][:120]
   else:
    rep[id]=str(d)[:2500]
  except Exception as e:rep['payloads'][-1]['error']=str(e)
r=json.loads((out/'3dlive_livescenes_mv322_callyourname.records.json').read_text());rep['recordCount']=len(r)
settings={};atlas=[];owners=[]
for row in r:
 d=row['data']
 def scan(x):
  if isinstance(x,dict):
   if 'LensFlareSpriteName' in x:
    key=str(x['LensFlareSpriteName']);ent=settings.setdefault(key,{'count':0,'examples':[]});ent['count']+=1
    if len(ent['examples'])<4:ent['examples'].append({'id':row['id'],**{k:v for k,v in x.items() if 'Flare' in k or 'Source' in k}})
   for v in x.values():scan(v)
  elif isinstance(x,list):
   for v in x:scan(v)
 scan(d)
 if '_atlasName' in d:atlas.append({'id':row['id'],**{k:v for k,v in d.items() if k in ['_atlasName','_meshId','_shader','_texturePropertyName','m_GameObject','m_Name']}})
 if 'LensFlareView' in d or '_sourceScaleFactor' in d:
  if len(owners)<5:owners.append({'id':row['id'],**d})
rep.update(settings=settings,atlas=atlas,ownerExamples=owners)
(out/'detail-summary.json').write_text(json.dumps(rep,ensure_ascii=False,indent=2))
print('compact summary bytes',len(json.dumps(rep)))
