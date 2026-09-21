import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve('test-runtime169'),spec=JSON.parse(await fs.readFile(path.join(root,'spec.json'),'utf8'));
const code=String.raw`
const tests=[];function check(name,ok,detail){tests.push({name,pass:!!ok,detail});if(!ok)throw Error(name+': '+JSON.stringify(detail));}
const b64bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function lightEvent362_41(rt,entry){return{value:entry.setting};}
const W=256,H=160,renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;document.body.appendChild(renderer.domElement);
const shaderErrors=[];renderer.debug.onShaderError=(gl,p,v,f)=>shaderErrors.push(gl.getProgramInfoLog(p)+' '+gl.getShaderInfoLog(v)+' '+gl.getShaderInfoLog(f));
check('HDR framebuffer available',renderer.extensions.has('EXT_color_buffer_float'));
const target=new THREE.WebGLRenderTarget(W,H,{type:THREE.FloatType,format:THREE.RGBAFormat,depthBuffer:false});target.texture.colorSpace=THREE.LinearSRGBColorSpace;
const oldLive={runtime:{time:60,stageFx362_21:{report:{}}}},newLive={runtime:{time:60,stageFx362_21:{report:{}}}};
const oldQ=oldFactory169(oldLive),newQ=callYourNameSourcePulseState164(newLive);
const setting={LensFlareSpriteName:'EffectAtlas_mv322/EffectAtlas_mv322_Lens',LensFlareEffectScale:.7,LensFlareEffectAngle:0,LensFlareLightnessMultiplier:7.1495866775512695};
function fill(q,n=1){const g=q.geometry;g.instanceCount=n;for(let i=0;i<n;i++){g.getAttribute('pulseCenter').setXY(i,.5,.48);g.getAttribute('pulseSize').setXY(i,95,85);g.getAttribute('pulseDepth').setX(i,8);g.getAttribute('pulseStrength').setX(i,2);g.getAttribute('pulseColor').setXYZ(i,.82,.96,1);}for(const a of Object.values(g.attributes))if(a.isInstancedBufferAttribute)a.needsUpdate=true;q.material.uniforms.viewport.value.set(W,H);q.material.uniforms.nearFar.value.set(.1,100);q.material.uniforms.depthEnabled.value=0;}
function prepareOld(){fill(oldQ);oldQ.rows168=[{source:{id:1},entry:{setting:{...setting}}}];oldPrepare169(oldLive,oldQ);}
function prepareNew(){fill(newQ);newQ.rows168=[{source:{id:1},entry:{setting:{...setting}}}];prepareCallYourNameNativePixels168(newLive,newQ);}
function draw(q,clear=0){renderer.setRenderTarget(target);renderer.setClearColor(new THREE.Color(clear,clear,clear),1);renderer.autoClear=true;renderer.render(q.scene,q.camera);const p=new Float32Array(W*H*4);renderer.readRenderTargetPixels(target,0,0,W,H,p);return p;}
function metrics(p){let sum=0,peak=0,saturated=0,bad=0,min=Infinity,soft=0,visible=0;for(let i=0;i<p.length;i+=4){const v=Math.max(p[i],p[i+1],p[i+2]);if(!Number.isFinite(v))bad++;min=Math.min(min,p[i],p[i+1],p[i+2]);sum+=v;peak=Math.max(peak,v);if(v>1)saturated++;if(v>.002){visible++;if(v<.18)soft++;}}return{sum,peak,saturated,bad,min,soft,visible};}
const baseAttrs=['pulseCenter','pulseSize','pulseDepth','pulseStrength','pulseColor'];
const base=q=>JSON.stringify(baseAttrs.map(k=>Array.from(q.geometry.getAttribute(k).array)));
prepareNew();const saved=base(newQ);prepareCallYourNameNativePixels168(newLive,newQ);check('Accepted timing/position/strength attributes unchanged by appearance prepare',base(newQ)===saved);
prepareOld();const om=metrics(draw(oldQ));prepareNew();const nm=metrics(draw(newQ));
check('c62.169 remains visibly luminous',nm.sum>100&&nm.peak>.4,nm);
check('Hard HDR peak reduced from c62.168',nm.peak<om.peak*.45,{old:om,new:nm});
check('Over-white area reduced from c62.168',nm.saturated<om.saturated*.35,{old:om,new:nm});
check('Soft transition pixels remain substantial',nm.soft>100,{old:om,new:nm});
check('No nonfinite or negative pixels',nm.bad===0&&nm.min>=0,nm);
const report=newLive.runtime.stageFx362_21.report.nativePulseAppearance168.fixtures[0];
check('Full native lightness multiplier is compressed instead of multiplied twice',report.nativeMultiplier>4&&report.appliedGain<1.1,report);
check('Resource Sprite is expanded only for soft halo room',Math.abs(report.renderExtent[1]/report.baseExtent[1]-1.18)<.001,report);

const encoded=d=>(100-.1*100/d)/(100-.1);
function depthMap(d){const a=new Float32Array(W*H*4);for(let i=0;i<W*H;i++){a[i*4]=a[i*4+1]=a[i*4+2]=encoded(d);a[i*4+3]=1;}const t=new THREE.DataTexture(a,W,H,THREE.RGBAFormat,THREE.FloatType);t.needsUpdate=true;t.minFilter=t.magFilter=THREE.NearestFilter;return t;}
newQ.material.uniforms.depthEnabled.value=1;newQ.material.uniforms.depthMap.value=depthMap(4);check('Foreground occlusion still suppresses whole flare',metrics(draw(newQ)).sum<1e-6);
newQ.material.uniforms.depthMap.value=depthMap(20);check('Visible source remains visible through depth route',metrics(draw(newQ)).sum>nm.sum*.95);
newQ.material.uniforms.depthEnabled.value=0;const add=metrics(draw(newQ,.125));check('Additive soft layer never darkens background',add.min>=.125-.00001,add.min);
newQ.geometry.getAttribute('pulseStrength').setX(0,0);newQ.geometry.getAttribute('pulseStrength').needsUpdate=true;check('Zero accepted pulse still produces zero custom light',metrics(draw(newQ)).sum===0);
prepareNew();check('No shader compile errors',shaderErrors.length===0,shaderErrors);check('No WebGL error',renderer.getContext().getError()===0);
window.result169={tests,old:om,soft:nm,scope:'actual decoded MV322 flare pixels + embedded Three.js; isolated render, not full song replay'};
`;
const imageConst='const CYN_LAMP_IMAGES168='+JSON.stringify(spec.images)+';';
const html='<!doctype html><style>body{margin:0;background:#07101b}canvas{display:block}</style><script type="module">import * as THREE from '+JSON.stringify(spec.three)+';import {gunzipSync} from '+JSON.stringify(spec.fflate)+';try{\\n'+imageConst+'\\n'+spec.oldFactory.replace('function callYourNameSourcePulseState164','function oldFactory169')+'\\n'+spec.oldPrepare.replace('function prepareCallYourNameNativePixels168','function oldPrepare169')+'\\n'+spec.newAppearance+'\\n'+code+'\\n}catch(e){window.failure169=String(e.stack||e);throw e;}<\\/script>';
await fs.writeFile(path.join(root,'harness.html'),html);
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);assert(file.startsWith(root+path.sep));const b=await fs.readFile(file);res.setHeader('content-type',file.endsWith('.html')?'text/html':'text/javascript');res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:256,height:160}});
 await page.goto('http://127.0.0.1:'+server.address().port+'/harness.html');
 await page.waitForFunction(()=>window.result169||window.failure169,null,{timeout:60000});
 const a=await page.evaluate(()=>({result:window.result169,error:window.failure169}));assert(!a.error,a.error);assert(a.result.tests.every(x=>x.pass));
 await fs.mkdir('artifacts/appearance169',{recursive:true});await page.screenshot({path:'artifacts/appearance169/c62.169-soft-flare.png'});
 const c=JSON.parse(await fs.readFile('artifacts/ES_c62.169_Checks.json','utf8'));c.gpu=a.result;await fs.writeFile('artifacts/ES_c62.169_Checks.json',JSON.stringify(c,null,2));console.log(JSON.stringify(a.result,null,2));
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
