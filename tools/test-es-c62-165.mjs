import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve('test-runtime165'),spec=JSON.parse(await fs.readFile(path.join(root,'spec.json'),'utf8'));
const browserCode=String.raw`
const tests=[];function check(name,value,detail){tests.push({name,pass:!!value,detail});if(!value)throw new Error(name+': '+JSON.stringify(detail));}
const W=400,H=280,renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;document.body.appendChild(renderer.domElement);
const shaderErrors=[];renderer.debug.onShaderError=(gl,program,vs,fs)=>shaderErrors.push(gl.getProgramInfoLog(program)+' '+gl.getShaderInfoLog(vs)+' '+gl.getShaderInfoLog(fs));
check('Float framebuffer support',renderer.extensions.has('EXT_color_buffer_float'));
const target=new THREE.WebGLRenderTarget(W,H,{type:THREE.FloatType,format:THREE.RGBAFormat,depthBuffer:false});target.texture.colorSpace=THREE.LinearSRGBColorSpace;
const live=()=>({runtime:{time:60,stageFx362_21:{banks:[],report:{}}}});
const oldLive=live(),newLive=live(),old=baselinePulseState164(oldLive),q=callYourNameSourcePulseState164(newLive);
let spriteMap=new Map(),lookupCalls=0;
function lightEvent362_41(rt,entry){return{value:entry.setting};}
function fxFindSprite362_22(banks,name){lookupCalls++;return spriteMap.get(name)||null;}
function fill(z,n=1){const g=z.geometry;g.instanceCount=n;for(let i=0;i<n;i++){g.getAttribute('pulseCenter').setXY(i,.5,.52);g.getAttribute('pulseSize').setXY(i,190,170);g.getAttribute('pulseDepth').setX(i,8);g.getAttribute('pulseStrength').setX(i,2.2);g.getAttribute('pulseColor').setXYZ(i,1,1,1);}for(const a of Object.values(g.attributes))if(a.isInstancedBufferAttribute)a.needsUpdate=true;z.material.uniforms.viewport.value.set(W,H);z.material.uniforms.nearFar.value.set(.1,100);z.material.uniforms.depthEnabled.value=0;}
const baseAttributes=['pulseCenter','pulseSize','pulseDepth','pulseStrength','pulseColor'];
const captureBase=z=>JSON.stringify(Object.fromEntries(baseAttributes.map(k=>[k,Array.from(z.geometry.getAttribute(k).array)])));
function draw(z,clear=.0){renderer.setRenderTarget(target);renderer.setClearColor(new THREE.Color(clear,clear,clear),1);renderer.autoClear=true;renderer.render(z.scene,z.camera);const out=new Float32Array(W*H*4);renderer.readRenderTargetPixels(target,0,0,W,H,out);return out;}
function metrics(p){let peak=0,sum=0,saturated=0,negative=0,bad=0;for(let i=0;i<p.length;i+=4){const v=Math.max(p[i],p[i+1],p[i+2]);if(!Number.isFinite(v))bad++;if(Math.min(p[i],p[i+1],p[i+2])<-.00001)negative++;peak=Math.max(peak,v);sum+=v;if(v>1)saturated++;}return{peak,sum,saturated,negative,bad};}
fill(old);fill(q);const before=captureBase(q);prepareCallYourNamePulseAppearance165(newLive,q);check('Appearance preparation preserves all accepted input arrays',captureBase(q)===before);
const oldPixels=draw(old),newPixels=draw(q),om=metrics(oldPixels),nm=metrics(newPixels);
check('Old white-blob shader reproduced',om.saturated>1000,om);
check('New fallback produces nonzero light',nm.sum>10,nm);
check('Narrow bright core is retained',nm.peak>=om.peak*.8,{old:om.peak,new:nm.peak});
check('Broad over-white area reduced',nm.saturated<om.saturated*.2,{old:om.saturated,new:nm.saturated});
check('No nonfinite or negative light output',nm.bad===0&&nm.negative===0,nm);
check('Missing sprite cannot disable accepted pulses',q.geometry.instanceCount===1&&newLive.runtime.stageFx362_21.report.sourcePulseAppearance165.opticalFallbackInstances===1);
const centerX=200,centerY=Math.floor(H*.52);function pix(p,x,y){const k=(y*W+x)*4;return p[k];}
check('Optical horizontal ray brighter than neighbouring halo',pix(newPixels,centerX+35,centerY)>pix(newPixels,centerX+35,centerY+12)*2,{ray:pix(newPixels,centerX+35,centerY),halo:pix(newPixels,centerX+35,centerY+12)});
check('No bright quad edge',pix(newPixels,centerX+94,centerY)<.005);
const encoded=d=>(100-.1*100/d)/(100-.1);
const depthBytes=new Float32Array(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const d=x>=188&&x<=211?4:20,k=(y*W+x)*4;depthBytes[k]=depthBytes[k+1]=depthBytes[k+2]=encoded(d);depthBytes[k+3]=1;}
const depthTex=new THREE.DataTexture(depthBytes,W,H,THREE.RGBAFormat,THREE.FloatType);depthTex.needsUpdate=true;depthTex.minFilter=depthTex.magFilter=THREE.NearestFilter;
q.material.uniforms.depthMap.value=depthTex;q.material.uniforms.depthEnabled.value=1;const hidden=draw(q);
check('Foreground character-depth strip occludes flash',Math.abs(pix(hidden,200,centerY))<1e-6);
check('Light outside foreground strip remains visible',pix(hidden,235,centerY)>.02);
q.material.uniforms.depthEnabled.value=0;
const additive=draw(q,.125);let minIncrement=Infinity;for(let i=0;i<additive.length;i+=4)minIncrement=Math.min(minIncrement,additive[i]-.125,additive[i+1]-.125,additive[i+2]-.125);
check('Additive appearance never darkens background',minIncrement>-.00001,minIncrement);
q.geometry.getAttribute('pulseStrength').setX(0,0);q.geometry.getAttribute('pulseStrength').needsUpdate=true;check('Zero accepted strength yields no light',metrics(draw(q)).sum===0);fill(q);
function makeSprite(seed=0,alpha=64){const w=32,h=16,a=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4;if(x>=16){a[k]=255;a[k+2]=255;a[k+3]=255;}else if((Math.abs(x-7.5)<2&&Math.abs(y-7.5)<2)||((x===7||x===8)&&y>2&&y<13)||((y===7||y===8)&&x>2&&x<13)){a[k]=a[k+1]=a[k+2]=210-seed;a[k+3]=alpha;}}
 const texture=new THREE.DataTexture(a,w,h);texture.needsUpdate=true;texture.minFilter=texture.magFilter=THREE.LinearFilter;return{texture,record:{data:{m_RD:{textureRect:{x:0,y:0,width:16,height:16}}}}};}
const sprite=makeSprite();spriteMap.set('test/star',sprite);q.rows165[0]={entry:{setting:{LensFlareSpriteName:'test/star',LensFlareEffectAngle:0}}};prepareCallYourNamePulseAppearance165(newLive,q);const atlasPixels=draw(q),am=metrics(atlasPixels);
check('Resolved atlas sprite route renders',newLive.runtime.stageFx362_21.report.sourcePulseAppearance165.nativeSpriteInstances===1&&am.sum>10,am);
check('Sprite alpha is not incorrectly multiplied twice',am.peak>1.7,am.peak);
let channelDiff=0;for(let i=0;i<atlasPixels.length;i+=4)channelDiff=Math.max(channelDiff,Math.abs(atlasPixels[i]-atlasPixels[i+1]),Math.abs(atlasPixels[i+1]-atlasPixels[i+2]));
check('Atlas rectangle does not bleed magenta neighbour',channelDiff<1e-5,channelDiff);
spriteMap.set('test/transparent',makeSprite(0,0));q.rows165[0]={entry:{setting:{LensFlareSpriteName:'test/transparent'}}};prepareCallYourNamePulseAppearance165(newLive,q);check('Transparent atlas RGB is discarded',metrics(draw(q)).sum===0);
fill(q,5);for(let i=0;i<5;i++){spriteMap.set('test/page'+i,makeSprite(i));q.rows165[i]={entry:{setting:{LensFlareSpriteName:'test/page'+i}}};}prepareCallYourNamePulseAppearance165(newLive,q);
const pageReport=newLive.runtime.stageFx362_21.report.sourcePulseAppearance165;check('Four atlas pages supported without changing instance count',pageReport.atlasPages===4&&pageReport.nativeSpriteInstances===4&&q.geometry.instanceCount===5,pageReport);check('Fifth atlas uses visible fallback rather than dropping light',pageReport.opticalFallbackInstances===1&&q.geometry.getAttribute('pulseSpriteData165').getX(4)===0);
check('Multi-page GPU draw is finite',metrics(draw(q)).bad===0);
fill(q);q.rows165[0]={entry:{setting:{LensFlareSpriteName:'test/retry'}}};prepareCallYourNamePulseAppearance165(newLive,q);const missed=newLive.runtime.stageFx362_21.report.sourcePulseAppearance165.opticalFallbackInstances;newLive.runtime.time+=.6;spriteMap.set('test/retry',sprite);prepareCallYourNamePulseAppearance165(newLive,q);check('Late-loaded atlas recovers without losing pulses',missed===1&&newLive.runtime.stageFx362_21.report.sourcePulseAppearance165.nativeSpriteInstances===1);
check('No shader compile errors',shaderErrors.length===0,shaderErrors);check('No WebGL error',renderer.getContext().getError()===0);
window.testResults={tests,oldMetrics:om,newMetrics:nm,shaderErrors,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER),note:'Isolated browser WebGL tests using the actual embedded Three.js and output material. Synthetic atlas/depth fixtures; not a full MV322 replay.'};
const copyScene=new THREE.Scene(),copyCamera=new THREE.Camera(),copyMat=new THREE.ShaderMaterial({uniforms:{map:{value:target.texture}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position,1.0);}',fragmentShader:'uniform sampler2D map;varying vec2 v;void main(){vec3 c=texture2D(map,v).rgb+vec3(.018,.026,.040);gl_FragColor=vec4(pow(clamp(c,0.,1.),vec3(1./2.2)),1.);}',depthTest:false,depthWrite:false,toneMapped:false}),copyQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),copyMat);copyScene.add(copyQuad);
window.preview=which=>{fill(which==='old'?old:q);if(which!=='old'){q.rows165[0]={};prepareCallYourNamePulseAppearance165(newLive,q);}draw(which==='old'?old:q);renderer.setRenderTarget(null);renderer.render(copyScene,copyCamera);};
window.preview('new');
`;
const imports={};
// es-file specifiers are rewritten by the builder. The normal relative Three imports remain intact.
const pageHtml=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#07101b}canvas{display:block}</style><script type="module">import * as THREE from ${JSON.stringify(spec.three)};\ntry{${spec.oldFactory.replace('function callYourNameSourcePulseState164','function baselinePulseState164')}\n${spec.appearance}\n${browserCode}}catch(e){window.testFailure=String(e.stack||e);throw e;}<\/script>`;
await fs.writeFile(path.join(root,'harness.html'),pageHtml);
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('path');const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript; charset=utf-8');res.end(data);}catch{res.writeHead(404);res.end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:400,height:280}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}/harness.html`);await page.waitForFunction(()=>window.testResults||window.testFailure,{},{timeout:60000});const state=await page.evaluate(()=>({results:window.testResults,failure:window.testFailure}));assert(!state.failure,state.failure);assert.equal(errors.length,0,errors.join('\n'));assert(state.results.tests.every(t=>t.pass));
 await fs.mkdir('artifacts/appearance-comparison',{recursive:true});await page.evaluate(()=>window.preview('old'));await page.screenshot({path:'artifacts/appearance-comparison/c164-isolated.png'});await page.evaluate(()=>window.preview('new'));await page.screenshot({path:'artifacts/appearance-comparison/c165-isolated.png'});
 const checks=JSON.parse(await fs.readFile('artifacts/ES_c62.165_Checks.json','utf8'));checks.gpuTests=state.results;await fs.writeFile('artifacts/ES_c62.165_Checks.json',JSON.stringify(checks,null,2));console.log(JSON.stringify(state.results,null,2));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
