import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as acorn from 'acorn';

const baselinePath='artifacts/ES_c62.164_BloomRoute_SourcePulse.html';
const bytes=await fs.readFile(baselinePath);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
assert.equal(blob,'094fba263722fa5a0bb5e11161f44162fbeda809','Only the accepted c62.164 baseline may be used');
const html=bytes.toString('utf8');
function scripts(text){const out=[];for(const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){out.push({attrs:m[1],text:m[2],start:m.index+m[0].indexOf('>')+1,path:(m[1].match(/data-es-path="([^"]+)"/)||[])[1]});}return out;}
const chunks=scripts(html),main=chunks.find(x=>x.text.includes('function callYourNameSourcePulseState164(live)'));
assert(main,'Main module missing');
const ast=acorn.parse(main.text,{ecmaVersion:'latest',sourceType:'module'});
const funcs=new Map(ast.body.filter(x=>x.type==='FunctionDeclaration').map(x=>[x.id.name,x]));
const fn=name=>{const n=funcs.get(name);assert(n,name);return main.text.slice(n.start,n.end);};
const oldFactory=fn('callYourNameSourcePulseState164'),oldRender=fn('renderCallYourNameSourcePulse164');
const factory=String.raw`function callYourNameSourcePulseState164(live){
 const fx=live.runtime?.stageFx362_21;if(!fx)return null;let q=fx.callYourNameSourcePulse164;if(q)return q;
 const capacity=160,g=new THREE.InstancedBufferGeometry(),plane=new THREE.PlaneGeometry(1,1);g.index=plane.index.clone();g.setAttribute('position',plane.getAttribute('position').clone());g.setAttribute('uv',plane.getAttribute('uv').clone());plane.dispose();
 for(const [name,size] of [['pulseCenter',2],['pulseSize',2],['pulseDepth',1],['pulseStrength',1],['pulseColor',3],['pulseSpriteRect165',4],['pulseSpriteData165',4]])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage));g.instanceCount=0;
 const blank165=new THREE.DataTexture(new Uint8Array([0,0,0,0]),1,1);blank165.needsUpdate=true;
 const uniforms={viewport:{value:new THREE.Vector2(1,1)},depthMap:{value:null},nearFar:{value:new THREE.Vector2(.1,100)},depthEnabled:{value:0},atlas0165:{value:blank165},atlas1165:{value:blank165},atlas2165:{value:blank165},atlas3165:{value:blank165}};
 const vertexShader=`uniform vec2 viewport;
 attribute vec2 pulseCenter,pulseSize;
 attribute float pulseDepth,pulseStrength;
 attribute vec3 pulseColor;
 attribute vec4 pulseSpriteRect165,pulseSpriteData165;
 varying vec2 vLocal,vSize;
 varying float vDepth,vStrength;
 varying vec3 vColor;
 varying vec4 vRect165,vSprite165;
 void main(){
  vLocal=position.xy*2.0;vSize=pulseSize;vDepth=pulseDepth;vStrength=pulseStrength;vColor=pulseColor;vRect165=pulseSpriteRect165;vSprite165=pulseSpriteData165;
  vec2 ndc=pulseCenter*2.0-1.0;vec2 off=position.xy*pulseSize*2.0/max(viewport,vec2(1.0));gl_Position=vec4(ndc+off,0.0,1.0);
 }`;
 const fragmentShader=`uniform sampler2D depthMap,atlas0165,atlas1165,atlas2165,atlas3165;
 uniform vec2 viewport,nearFar;
 uniform float depthEnabled;
 varying vec2 vLocal,vSize;
 varying float vDepth,vStrength;
 varying vec3 vColor;
 varying vec4 vRect165,vSprite165;
 float eyeDepth(float z){return nearFar.x*nearFar.y/max(.00001,nearFar.y-z*(nearFar.y-nearFar.x));}
 float opticalRay165(vec2 p,vec2 axis,float width,float reach){
  float along=dot(p,axis),across=dot(p,vec2(-axis.y,axis.x));
  float w=width+abs(along)*.018;
  return exp(-across*across/max(.000001,w*w))*exp(-abs(along)/reach);
 }
 vec3 fallbackFlare165(vec2 p){
  float r=length(p);
  float core=4.6*exp(-dot(p,p)*1100.0);
  float closeGlow=.31*exp(-r*13.0);
  float halo=.052*exp(-dot(p,p)*5.2);
  float rays=.42*opticalRay165(p,vec2(1.0,0.0),.008,.34)
             +.22*opticalRay165(p,vec2(0.0,1.0),.006,.27)
             +.36*opticalRay165(p,vec2(.6,.8),.007,.34)
             +.36*opticalRay165(p,vec2(-.6,.8),.007,.34)
             +.10*opticalRay165(p,vec2(.92388,.38268),.004,.28)
             +.10*opticalRay165(p,vec2(-.92388,.38268),.004,.28);
  return vec3(core+closeGlow+halo+rays);
 }
 void main(){
  vec2 q=vLocal;
  // Optical support only. The accepted CPU emitter centre, footprint, strength and clock are unchanged.
  float support=(1.0-smoothstep(.64,1.0,abs(q.x)))*(1.0-smoothstep(.64,1.0,abs(q.y)));
  if(support<=0.0||vStrength<=0.0)discard;
  vec2 p=q*vSize/max(1.0,min(vSize.x,vSize.y));
  float cs=cos(vSprite165.y),sn=sin(vSprite165.y);vec2 pr=mat2(cs,-sn,sn,cs)*p;
  vec3 lightRGB;
  if(vSprite165.x>.5){
   float aspect=max(.05,vSprite165.z);vec2 fitted=pr/vec2(max(1.0,aspect),max(1.0,1.0/aspect));vec2 uv=fitted*.5+.5;
   if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))discard;
   vec2 atlasUV=vRect165.xy+uv*vRect165.zw;
   vec4 texel;
   if(vSprite165.x<1.5)texel=texture2D(atlas0165,atlasUV);
   else if(vSprite165.x<2.5)texel=texture2D(atlas1165,atlasUV);
   else if(vSprite165.x<3.5)texel=texture2D(atlas2165,atlasUV);
   else texel=texture2D(atlas3165,atlasUV);
   // Same texture contract as LIGHT_FLARE_FRAGMENT362_42: alpha is a cut-off, not a second RGB multiplier.
   if(texel.a<.001)discard;
   lightRGB=max(texel.rgb,vec3(0.0));
  }else{
   // Continuous narrow core / fine multi-directional rays. Never reinstate the broad white Gaussian ball.
   lightRGB=fallbackFlare165(pr);
  }
  float vis=1.0;
  if(depthEnabled>.5){vec2 suv=gl_FragCoord.xy/max(viewport,vec2(1.0));float sceneD=eyeDepth(texture2D(depthMap,clamp(suv,0.0,1.0)).r);vis=smoothstep(vDepth-.10,vDepth+.18,sceneD);}
  vec3 rgb=max(vColor,vec3(0.0))*lightRGB*max(vStrength,0.0)*support*vis;
  gl_FragColor=vec4(rgb,0.0);
 }`;
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor});material.name='MV322 accepted SourceView pulses / native sprite or optical flare / c62.165';
 const scene=new THREE.Scene(),camera=new THREE.Camera(),mesh=new THREE.Mesh(g,material);mesh.frustumCulled=false;scene.add(mesh);
 q=fx.callYourNameSourcePulse164={capacity,geometry:g,material,scene,camera,mesh,history:new Map(),lastTime:null,bloomPrev:null,bloomHold:0,rows165:[],spriteCache165:new Map(),blank165};return q;
}`;
const helper=String.raw`function prepareCallYourNamePulseAppearance165(live,q){
 const rt=live.runtime,fx=rt.stageFx362_21,g=q.geometry,count=g.instanceCount,rect=g.getAttribute('pulseSpriteRect165'),data=g.getAttribute('pulseSpriteData165');
 const pages=[],frameCache=new Map(),revision=(fx.banks||[]).map(b=>String(b.records?.size||0)+':'+String(b.textures?.size||0)).join('|');let nativeCount=0,fallbackCount=0;const names=new Set();
 for(let i=0;i<count;i++){
  const row=q.rows165[i];let name='',angle=0,sprite=null;
  try{
   const setting=row?.entry?lightEvent362_41(rt,row.entry,'LightObjectSettingTimelineTrack')?.value:null;
   name=typeof setting?.LensFlareSpriteName==='string'?setting.LensFlareSpriteName:'';
   const degrees=Number(setting?.LensFlareEffectAngle??0);angle=Number.isFinite(degrees)?degrees*Math.PI/180:0;
   if(name){
    names.add(name);
    if(frameCache.has(name))sprite=frameCache.get(name);
    else{
     let hit=q.spriteCache165.get(name),now=Number(rt.time)||0;
     if(!hit||hit.revision!==revision||(!hit.sprite&&Math.abs(now-hit.time)>.5)){
      hit={sprite:fxFindSprite362_22(fx.banks||[],name),time:now,revision};q.spriteCache165.set(name,hit);
     }
     sprite=hit.sprite;frameCache.set(name,sprite);
    }
   }
  }catch(error){q.lastAppearanceError165=String(error?.message||error);sprite=null;}
  const r=sprite?.record?.data?.m_RD?.textureRect,image=sprite?.texture?.image;
  let page=-1;
  if(r&&image&&[r.x,r.y,r.width,r.height,image.width,image.height].every(v=>Number.isFinite(Number(v)))&&r.width>1&&r.height>1&&image.width>0&&image.height>0){
   page=pages.indexOf(sprite.texture);if(page<0&&pages.length<4){page=pages.length;pages.push(sprite.texture);}
   if(page>=0){rect.setXYZW(i,(Number(r.x)+.5)/image.width,(Number(r.y)+.5)/image.height,(r.width-1)/image.width,(r.height-1)/image.height);data.setXYZW(i,page+1,angle,r.width/r.height,0);nativeCount++;continue;}
  }
  rect.setXYZW(i,0,0,1,1);data.setXYZW(i,0,0,1,0);fallbackCount++;
 }
 q.rows165.length=count;rect.needsUpdate=true;data.needsUpdate=true;
 for(let i=0;i<4;i++)q.material.uniforms['atlas'+i+'165'].value=pages[i]||q.blank165;
 if(fx.report)fx.report.sourcePulseAppearance165={version:'c62.165',instances:count,nativeSpriteInstances:nativeCount,opticalFallbackInstances:fallbackCount,atlasPages:pages.length,spriteNames:[...names],lastError:q.lastAppearanceError165||null,locked:'c62.164 centres, footprint, brightness, triggers, histories, Bloom selection and physical depth unchanged'};
}
function disposeCallYourNamePulseAppearance165(fx){
 const q=fx?.callYourNameSourcePulse164;if(!q?.blank165)return;
 q.mesh?.removeFromParent();q.geometry?.dispose();q.material?.dispose();q.blank165?.dispose();q.spriteCache165?.clear();fx.callYourNameSourcePulse164=null;
}`;
let render=oldRender;
function one(text,needle,replacement,label){assert.equal(text.split(needle).length-1,1,label);return text.replace(needle,replacement);}
render=one(render,'report.push({source:row.source?.id??null','q.rows165[count]=row;report.push({source:row.source?.id??null','Capture accepted row without changing filters');
render=one(render,'r.autoClear=false;r.render(q.scene,q.camera);','r.autoClear=false;prepareCallYourNamePulseAppearance165(live,q);r.render(q.scene,q.camera);','Prepare only appearance at existing draw');
assert.equal(render.replace('q.rows165[count]=row;','').replace('prepareCallYourNamePulseAppearance165(live,q);',''),oldRender,'Accepted rendering/trigger code lock');
const oldDispose=fn('disposeStageFx362_21');
const newDispose=one(oldDispose,'if(!fx)return;disposeFloorSourceBloom362_146(fx);','if(!fx)return;disposeCallYourNamePulseAppearance165(fx);disposeFloorSourceBloom362_146(fx);','Dispose only added appearance resources');
const edits=[['callYourNameSourcePulseState164',factory+'\n'+helper],['renderCallYourNameSourcePulse164',render],['disposeStageFx362_21',newDispose]].map(([name,replacement])=>({...funcs.get(name),replacement})).sort((a,b)=>b.start-a.start);
let text=main.text;for(const e of edits)text=text.slice(0,e.start)+e.replacement+text.slice(e.end);
const newAst=acorn.parse(text,{ecmaVersion:'latest',sourceType:'module'}),newFuncs=new Map(newAst.body.filter(x=>x.type==='FunctionDeclaration').map(x=>[x.id.name,text.slice(x.start,x.end)]));
const changed=new Set(edits.map(e=>e.id.name));let lockedFunctions=0;for(const [name]of funcs){if(changed.has(name))continue;assert.equal(newFuncs.get(name),fn(name),'Unexpected function change: '+name);lockedFunctions++;}
let result=html.slice(0,main.start)+text+html.slice(main.start+main.text.length);
result='<!-- c62.165: appearance-only on accepted c62.164. Exact emitter/time/audio/Bloom locks; selected native flare sprite, with narrow-core multi-ray fallback if unavailable. -->\n'+result;
const newChunks=scripts(result);let parsed=0,unchangedModules=0;for(let i=0;i<chunks.length;i++){
 const a=chunks[i],b=newChunks[i];assert(b&&a.attrs===b.attrs,'Script structure changed');if(a!==main){assert.equal(b.text,a.text,'Unrelated script modified');unchangedModules++;}
 if(/application\/json|importmap|application\/x-es-binary/i.test(a.attrs))continue;
 if(a.path||!/type\s*=/.test(a.attrs)||/type=["']module["']/.test(a.attrs)){acorn.parse(b.text,{ecmaVersion:'latest',sourceType:'module',allowReturnOutsideFunction:true});parsed++;}
}
assert(result.includes('audio-only hotfix on c62.161'),'Audio fix missing');
await fs.mkdir('artifacts',{recursive:true});await fs.mkdir('test-runtime165/modules',{recursive:true});
for(const c of newChunks.filter(x=>x.path)){
 assert(!c.path.split('/').includes('..'));
 const dest=path.join('test-runtime165/modules',c.path.replace(/^\//,''));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,c.text.replaceAll('es-file:/','/modules/'));
}
const three=newChunks.find(c=>c.path?.endsWith('/three.module.js'))||newChunks.find(c=>c.path&&/\/three(?:\.min)?\.m?js$/.test(c.path));assert(three,'Embedded Three module not found');
const file='artifacts/ES_c62.165_FlareAppearance';await fs.writeFile(file+'.html',result);await fs.writeFile(file+'.txt',result);assert.deepEqual(await fs.readFile(file+'.html'),await fs.readFile(file+'.txt'));
const checks={version:'c62.165',baselineGitBlob:blob,baselineSHA256:sha(bytes),outputSHA256:sha(Buffer.from(result)),bytes:Buffer.byteLength(result),htmlTxtIdentical:true,unchangedFunctions:lockedFunctions,unchangedScripts:unchangedModules,syntaxCheckedScripts:parsed,acceptedControllerByteIdenticalAfterTwoAppearanceHooks:true,lockedFunctions:['callYourNameObservedAccent164','callYourNameSourceStrength164','callYourNameSourceColor164','resolveActiveBloom164'],audio:'All embedded decoder resources, bootstrap and unrelated functions byte-identical',spritePolicy:'Actual current LensFlareSpriteName and loaded atlas if resolved; otherwise explicit narrow-core multi-ray fallback. Not a claim of native rendering parity.',gpuTests:'pending'};
await fs.writeFile('artifacts/ES_c62.165_Checks.json',JSON.stringify(checks,null,2));
await fs.writeFile('test-runtime165/spec.json',JSON.stringify({oldFactory,factory,helper,three:'/modules'+three.path}));
console.log(JSON.stringify(checks,null,2));
