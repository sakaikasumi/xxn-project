import fs from 'node:fs/promises';
import path from 'node:path';

const sourceUrl = process.env.SOURCE_URL;
if (!sourceUrl) throw new Error('SOURCE_URL is required');

const response = await fetch(sourceUrl);
if (!response.ok) throw new Error(`Source download failed: ${response.status} ${response.statusText}`);
let s = await response.text();
const originalLength = s.length;

const requireMarker = (marker, label) => {
  if (!s.includes(marker)) throw new Error(`Required marker missing: ${label}`);
};

s = `<!-- c62.164: fresh MV322 light reconstruction. Removes the failed LightObject-directional plume call, resolves ALL active BloomEffect PostProcess tracks instead of the first insertion-order group, and derives broad source-local pulses from the actual rendered LightObjectSourceView uniforms plus short Bloom clips. c62.162 embedded-worker audio fix is retained. -->\n` + s;
s = s.replaceAll('v2.6.3c62.162', 'v2.6.3c62.164');

const stagePostMarker = 'function renderStagePost362_21(live,pass){';
requireMarker(stagePostMarker, 'stage post');
const bloomResolver = String.raw`/* c62.164 — resolve the active BloomEffect across every director/track group.
   Older builds used Array.find(), so whichever Bloom track happened to be inserted first won forever.
   MV322 contains nested directors; short accent clips could therefore be active yet never reach either
   the full-scene Bloom or the SourceView-only Bloom pass. */
function resolveActiveBloom164(rt,fx){
 const candidates=[];
 for(const events of fx?.groups?.values?.()||[]){
  const first=events?.[0];if(first?.trackClass!=='PostProcessTimelineTrack')continue;
  const e=activeResourceEvent362_6(rt,events,rt.time);if(!e)continue;
  const tpl=stageFxTemplate362_21(rt,e,rt.time),setting=tpl?._setting??tpl?.Setting??tpl?.setting??null;
  if(!setting||typeof setting!=='object')continue;
  const binding=[first.binding?.name,e.binding?.name,...(first.binding?.hierarchy||[]),...(e.binding?.hierarchy||[])].filter(Boolean).join('/');
  const shaped=['Intensity','Threshold','SoftKnee','Diffusion'].every(k=>Object.hasOwn(setting,k));
  if(!/bloom/i.test(binding)&&!shaped)continue;
  const clock=eventClock321(rt.timeline,e,rt.time),intensity=Number(setting.Intensity||0),threshold=Math.max(0,Number(setting.Threshold||0)),diffusion=Math.max(0,Number(setting.Diffusion||0));
  const effective=(Math.pow(2,intensity/10)-1)*(1+diffusion*.08)/Math.max(.025,threshold+.025);
  candidates.push({events,event:e,setting,clock,binding,effective});
 }
 candidates.sort((a,b)=>{const al=Number(a.clock?.local??1e9),bl=Number(b.clock?.local??1e9);if(Math.abs(al-bl)>1e-5)return al-bl;const as=Number(a.event.start||0),bs=Number(b.event.start||0);if(as!==bs)return bs-as;return b.effective-a.effective;});
 const chosen=candidates[0]||null;
 if(fx?.report)fx.report.bloomResolver164={sceneTime:Number(rt.time),candidateCount:candidates.length,chosen:chosen?{binding:chosen.binding,trackPath:chosen.event.trackPath,assetPath:chosen.event.assetPath,start:Number(chosen.event.start||0),duration:Number(chosen.event.duration||0),local:Number(chosen.clock?.local??-1),enabled:!!chosen.setting.IsEnabled,intensity:Number(chosen.setting.Intensity||0),threshold:Number(chosen.setting.Threshold||0),diffusion:Number(chosen.setting.Diffusion||0),effective:Number(chosen.effective.toFixed(5))}:null,candidates:candidates.slice(0,12).map(x=>({binding:x.binding,trackPath:x.event.trackPath,start:Number(x.event.start||0),duration:Number(x.event.duration||0),local:Number(x.clock?.local??-1),enabled:!!x.setting.IsEnabled,intensity:Number(x.setting.Intensity||0),threshold:Number(x.setting.Threshold||0),diffusion:Number(x.setting.Diffusion||0),effective:Number(x.effective.toFixed(5))}))};
 return chosen;
}
`;
s = s.replace(stagePostMarker, bloomResolver + '\n' + stagePostMarker);

const oldGlobalBloom = " const events=[...fx.groups.values()].find(es=>es[0].trackClass==='PostProcessTimelineTrack'&&es[0].binding?.name==='BloomEffect'),e=events&&activeResourceEvent362_6(live.runtime,events,live.runtime.time),setting=e?stageFxTemplate362_21(live.runtime,e,live.runtime.time)?._setting:null;";
const newGlobalBloom = " const resolvedBloom164=resolveActiveBloom164(live.runtime,fx),e=resolvedBloom164?.event,setting=resolvedBloom164?.setting;";
requireMarker(oldGlobalBloom, 'global bloom selector');
s = s.replace(oldGlobalBloom, newGlobalBloom);

const oldSourceBloom = " const events=[...fx.groups.values()].find(es=>es[0].trackClass==='PostProcessTimelineTrack'&&es[0].binding?.name==='BloomEffect'),e=events&&activeResourceEvent362_6(rt,events,rt.time),setting=e?stageFxTemplate362_21(rt,e,rt.time)?._setting:null;";
const newSourceBloom = " const resolvedBloom164=resolveActiveBloom164(rt,fx),e=resolvedBloom164?.event,setting=resolvedBloom164?.setting;";
requireMarker(oldSourceBloom, 'source bloom selector');
s = s.replace(oldSourceBloom, newSourceBloom);

const oldCall = '   renderCallYourNameTimelineBurst161(this,pass);';
requireMarker(oldCall, 'old directional burst call');
s = s.replace(oldCall, '   renderCallYourNameSourcePulse164(this,pass);');

const floorBloomMarker = 'function renderFloorSourceBloom362_146(live,pass){';
requireMarker(floorBloomMarker, 'floor bloom');
const sourcePulse = String.raw`/* c62.164 — MV322 broad source-local flash.
   Do not infer a beam direction from LightObject rotations. c62.160 proved the physical SourceView
   anchors and depth route can display the effect, while the c62.161/163 graph-triggered direction path
   never produced a visible result. This pass reads the uniforms actually driving the rendered copied
   SourceView surfaces, reacts to their real rises, and also reacts to short Bloom clips resolved across
   all directors. The result is a soft floor/room wash behind performers, not an upward cone. */
function callYourNameObservedAccent164(time){
 const t=Number(time||0),a0=59.78,a1=59.98,h=60.13,d=60.72;if(t<=a0||t>=d)return 0;const sm=x=>x*x*(3-2*x);if(t<a1)return sm(THREE.MathUtils.clamp((t-a0)/(a1-a0),0,1));if(t<=h)return 1;return 1-sm(THREE.MathUtils.clamp((t-h)/(d-h),0,1));
}
function callYourNameSourceStrength164(row){
 const u=row?.uniforms||{};let peak=0;const take=v=>{if(v)peak=Math.max(peak,Math.abs(Number(v.x)||0),Math.abs(Number(v.y)||0),Math.abs(Number(v.z)||0));};take(u.tint?.value);
 if(Number(u.sourceGradationActive?.value||0)>.5){const bc=u.baseColor145?.value,bl=Math.abs(Number(u.baseLightness145?.value||0));if(bc)peak=Math.max(peak,Math.max(Math.abs(Number(bc.x)||0),Math.abs(Number(bc.y)||0),Math.abs(Number(bc.z)||0))*Math.max(bl,.0001));const gc=u.gradColors145?.value,gl=u.gradLightness145?.value;if(gc?.length){let cm=0;for(const q of gc)cm=Math.max(cm,Math.abs(Number(q.x)||0),Math.abs(Number(q.y)||0),Math.abs(Number(q.z)||0));let lm=1;if(gl?.length){lm=0;for(const q of gl)lm=Math.max(lm,Math.abs(Number(q)||0));}peak=Math.max(peak,cm*lm*Math.max(bl,.0001));}}
 return peak;
}
function callYourNameSourceColor164(row,out){
 const u=row?.uniforms||{},t=u.tint?.value,bc=u.baseColor145?.value,v=t||bc;out.set(Math.max(0,Number(v?.x??1)),Math.max(0,Number(v?.y??1)),Math.max(0,Number(v?.z??1)));const m=Math.max(.0001,out.x,out.y,out.z);out.multiplyScalar(1/m).lerp(new THREE.Vector3(.82,.96,1),.58);return out;
}
function callYourNameSourcePulseState164(live){
 const fx=live.runtime?.stageFx362_21;if(!fx)return null;let q=fx.callYourNameSourcePulse164;if(q)return q;
 const capacity=160,g=new THREE.InstancedBufferGeometry(),plane=new THREE.PlaneGeometry(1,1);g.index=plane.index.clone();g.setAttribute('position',plane.getAttribute('position').clone());g.setAttribute('uv',plane.getAttribute('uv').clone());plane.dispose();
 for(const [name,size] of [['pulseCenter',2],['pulseSize',2],['pulseDepth',1],['pulseStrength',1],['pulseColor',3]])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage));g.instanceCount=0;
 const uniforms={viewport:{value:new THREE.Vector2(1,1)},depthMap:{value:null},nearFar:{value:new THREE.Vector2(.1,100)},depthEnabled:{value:0}};
 const vertexShader='uniform vec2 viewport;attribute vec2 pulseCenter,pulseSize;attribute float pulseDepth,pulseStrength;attribute vec3 pulseColor;varying vec2 vLocal;varying float vDepth,vStrength;varying vec3 vColor;void main(){vLocal=position.xy*2.0;vDepth=pulseDepth;vStrength=pulseStrength;vColor=pulseColor;vec2 ndc=pulseCenter*2.0-1.0;vec2 off=position.xy*pulseSize*2.0/max(viewport,vec2(1.0));gl_Position=vec4(ndc+off,0.0,1.0);}';
 const fragmentShader='uniform sampler2D depthMap;uniform vec2 viewport,nearFar;uniform float depthEnabled;varying vec2 vLocal;varying float vDepth,vStrength;varying vec3 vColor;float eyeDepth(float z){return nearFar.x*nearFar.y/max(.00001,nearFar.y-z*(nearFar.y-nearFar.x));}void main(){vec2 q=vLocal;float rr=dot(q,q);if(rr>=1.05)discard;float core=exp(-(q.x*q.x*4.4+q.y*q.y*4.9))*1.20;float halo=exp(-(q.x*q.x*1.55+q.y*q.y*2.15))*.62;float floorBand=exp(-(q.x*q.x*1.25+q.y*q.y*14.0))*.52;float softEdge=1.0-smoothstep(.70,1.02,sqrt(rr));float shape=(core+halo+floorBand)*softEdge;if(shape<.0006)discard;float vis=1.0;if(depthEnabled>.5){vec2 suv=gl_FragCoord.xy/max(viewport,vec2(1.0));float sceneD=eyeDepth(texture2D(depthMap,clamp(suv,0.0,1.0)).r);vis=smoothstep(vDepth-.10,vDepth+.18,sceneD);}gl_FragColor=vec4(vColor*shape*vStrength*vis,0.0);}';
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor});material.name='MV322 actual SourceView pulse / c62.164';const scene=new THREE.Scene(),camera=new THREE.Camera(),mesh=new THREE.Mesh(g,material);mesh.frustumCulled=false;scene.add(mesh);q=fx.callYourNameSourcePulse164={capacity,geometry:g,material,scene,camera,mesh,history:new Map(),lastTime:null,bloomPrev:null,bloomHold:0};return q;
}
function renderCallYourNameSourcePulse164(live,pass){
 const rt=live.runtime,fx=rt?.stageFx362_21;if(!fx||pass.id!=='main'||!pass.target||pass.meta?.diagnostic362_6)return;const songId=Number(fx.set?.song?._id??fx.set?.song?.id??0);if(songId!==322)return;
 const rows=lightControllerState362_42(rt).sourceSurfaces362_141||[];if(!rows.length)return;const q=callYourNameSourcePulseState164(live);if(!q)return;const now=Number(rt.time),jump=q.lastTime!=null&&(now<q.lastTime||now-q.lastTime>.36);if(jump){q.history.clear();q.bloomPrev=null;q.bloomHold=0;}const frameDt=q.lastTime==null?0:Math.max(0,Math.min(.25,now-q.lastTime));q.lastTime=now;
 const resolved=resolveActiveBloom164(rt,fx),bloomScalar=Math.log2(1+Math.max(0,Number(resolved?.effective||0))),bloomRise=q.bloomPrev==null?0:Math.max(0,bloomScalar-q.bloomPrev),clipLocal=Number(resolved?.clock?.local??1e9),clipDuration=Math.max(0,Number(resolved?.event?.duration||0));q.bloomPrev=bloomScalar;
 const pulseEnd=Math.max(.035,Math.min(.36,clipDuration*.35));const clipPulse=clipDuration>0&&clipDuration<=3.0&&clipLocal>=0&&clipLocal<pulseEnd?1-THREE.MathUtils.smoothstep(clipLocal,0,pulseEnd):0;
 const bloomRaw=Math.max(clipPulse,THREE.MathUtils.clamp(bloomRise*1.35,0,1.25));q.bloomHold=Math.max(bloomRaw,q.bloomHold*Math.exp(-frameDt*7.0));const observed=callYourNameObservedAccent164(now),globalDrive=Math.max(observed,q.bloomHold);
 const g=q.geometry,center=g.getAttribute('pulseCenter'),size=g.getAttribute('pulseSize'),depth=g.getAttribute('pulseDepth'),strength=g.getAttribute('pulseStrength'),color=g.getAttribute('pulseColor'),w=pass.target.width,h=pass.target.height,cam=pass.camera,local=new THREE.Vector3(),world=new THREE.Vector3(),view=new THREE.Vector3(),col=new THREE.Vector3(),report=[];let count=0;
 for(const row of rows){if(count>=q.capacity||!row?.overlay||!fxVisible362_23(row.overlay)||!lightPassAllows362_42(live,pass,row.bank,row.source))continue;const mesh=row.overlay;mesh.updateWorldMatrix(true,false);const geo=mesh.geometry;if(!geo)continue;if(!geo.boundingBox)geo.computeBoundingBox();if(geo.boundingBox)local.copy(geo.boundingBox.min).add(geo.boundingBox.max).multiplyScalar(.5);else local.set(0,0,0);world.copy(local).applyMatrix4(mesh.matrixWorld);view.copy(world).applyMatrix4(cam.matrixWorldInverse);const sourceDepth=-view.z;if(!(sourceDepth>cam.near&&sourceDepth<cam.far))continue;const ndc=world.clone().project(cam);if(ndc.z<-1||ndc.z>1||Math.abs(ndc.x)>1.18||Math.abs(ndc.y)>1.18)continue;
  const bright=callYourNameSourceStrength164(row),key=mesh.uuid,prev=q.history.get(key);let baseline=bright,localRaw=0,hold=0;if(prev&&!jump&&frameDt>0){const a=1-Math.exp(-frameDt*1.25);baseline=THREE.MathUtils.lerp(prev.baseline,bright,a);const rise=Math.max(0,bright-prev.value),above=Math.max(0,bright-baseline);localRaw=Math.max(THREE.MathUtils.clamp(rise*5.2,0,1.35),THREE.MathUtils.clamp(above*2.4,0,.9));hold=Math.max(localRaw,prev.hold*Math.exp(-frameDt*7.8));}q.history.set(key,{value:bright,baseline,hold,time:now});const drive=Math.max(globalDrive,hold);if(!(drive>.025))continue;
  const ux=ndc.x*.5+.5,uy=ndc.y*.5+.5,floorLike=uy<.49,persp=THREE.MathUtils.clamp(7.5/sourceDepth,.66,1.30),damp=THREE.MathUtils.clamp(drive,0,1.4);const pw=h*(floorLike?.135:.105)*(1+.34*damp)*persp,ph=h*(floorLike?.120:.105)*(1+.28*damp)*persp;center.setXY(count,ux,uy+(floorLike?ph*.035/h:0));size.setXY(count,pw,ph);depth.setX(count,sourceDepth);const out=THREE.MathUtils.clamp(drive*(1.48+Math.min(1.5,bright)*.34),0,2.45);strength.setX(count,out);callYourNameSourceColor164(row,col);color.setXYZ(count,col.x,col.y,col.z);report.push({source:row.source?.id??null,view:row.entry?.view?.id??null,floorLike,brightness:Number(bright.toFixed(4)),local:Number(hold.toFixed(4)),global:Number(globalDrive.toFixed(4)),strength:Number(out.toFixed(4)),screen:[Number(ux.toFixed(4)),Number(uy.toFixed(4))]});count++;
 }
 for(const a of [center,size,depth,strength,color])a.needsUpdate=true;g.instanceCount=count;if(!count){fx.report.callYourNameSourcePulse164={sceneTime:now,active:0,observedAccent:observed,bloomClipPulse:clipPulse,bloomRise};return;}const physical=pass.floorOcclusion151,depthReady=!!(physical?.ready&&physical.target?.depthTexture&&physical.target.width===w&&physical.target.height===h);q.material.uniforms.viewport.value.set(w,h);q.material.uniforms.nearFar.value.set(cam.near,cam.far);q.material.uniforms.depthEnabled.value=depthReady?1:0;q.material.uniforms.depthMap.value=depthReady?physical.target.depthTexture:null;const r=live.renderer,oldAuto=r.autoClear;r.setRenderTarget(pass.target);r.setScissorTest(false);try{r.autoClear=false;r.render(q.scene,q.camera);}finally{r.autoClear=oldAuto;}fx.report.callYourNameSourcePulse164={sceneTime:now,active:count,observedAccent:observed,bloomClipPulse:clipPulse,bloomRise:Number(bloomRise.toFixed(5)),bloomBinding:resolved?.binding||null,depthOcclusion:depthReady?'physical stage + character depth':'unavailable',driver:'actual SourceView uniforms + all-director Bloom clip/rise; no LightObject direction inference',fixtures:report};
}

`;
s = s.replace(floorBloomMarker, sourcePulse + floorBloomMarker);

if (!s.includes('audio-only hotfix on c62.161')) throw new Error('c62.162 audio fix marker was lost');
if (!s.includes('renderCallYourNameSourcePulse164(this,pass);')) throw new Error('c62.164 pulse call was not installed');
if (s.includes('renderCallYourNameTimelineBurst161(this,pass);')) throw new Error('old directional burst call is still active');
if ((s.match(/resolveActiveBloom164\(/g) || []).length < 4) throw new Error('Bloom resolver was not wired into all paths');

const outDir = path.resolve('artifacts');
await fs.mkdir(outDir, { recursive: true });
const htmlPath = path.join(outDir, 'ES_c62.164_BloomRoute_SourcePulse.html');
const txtPath = path.join(outDir, 'ES_c62.164_BloomRoute_SourcePulse.txt');
await fs.writeFile(htmlPath, s, 'utf8');
await fs.writeFile(txtPath, s, 'utf8');
const info = {
  sourceBytes: Buffer.byteLength(await response.clone?.text?.().catch?.(()=>'' ) || '', 'utf8'),
  sourceCharacters: originalLength,
  outputCharacters: s.length,
  outputBytes: Buffer.byteLength(s, 'utf8'),
  audioFixRetained: s.includes('audio-only hotfix on c62.161'),
  bloomResolverCalls: (s.match(/resolveActiveBloom164\(/g) || []).length,
  newPulseCalls: (s.match(/renderCallYourNameSourcePulse164\(/g) || []).length,
  oldDirectionalCallActive: s.includes('renderCallYourNameTimelineBurst161(this,pass);')
};
await fs.writeFile(path.join(outDir, 'ES_c62.164_Checks.json'), JSON.stringify(info, null, 2));
console.log(info);
