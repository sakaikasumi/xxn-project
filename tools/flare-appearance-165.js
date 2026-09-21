/* Appearance only. The c62.164 pulse controller owns timing, position, strength and depth. */
function callYourNameSourcePulseState164(live){
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
  float along=dot(p,axis),across=dot(p,vec2(-axis.y,axis.x));float w=width+abs(along)*.018;
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
  float support=(1.0-smoothstep(.64,1.0,abs(q.x)))*(1.0-smoothstep(.64,1.0,abs(q.y)));
  if(support<=0.0||vStrength<=0.0)discard;
  vec2 p=q*vSize/max(1.0,min(vSize.x,vSize.y));
  float cs=cos(vSprite165.y),sn=sin(vSprite165.y);vec2 pr=mat2(cs,-sn,sn,cs)*p;
  vec3 lightRGB;
  if(vSprite165.x>.5){
   float aspect=max(.05,vSprite165.z);vec2 fitted=pr/vec2(max(1.0,aspect),max(1.0,1.0/aspect));vec2 uv=fitted*.5+.5;
   if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))discard;
   vec2 atlasUV=vRect165.xy+uv*vRect165.zw;vec4 texel;
   if(vSprite165.x<1.5)texel=texture2D(atlas0165,atlasUV);
   else if(vSprite165.x<2.5)texel=texture2D(atlas1165,atlasUV);
   else if(vSprite165.x<3.5)texel=texture2D(atlas2165,atlasUV);
   else texel=texture2D(atlas3165,atlasUV);
   // Matches existing native LIGHT_FLARE_FRAGMENT362_42. Do not multiply premultiplied sprite RGB by alpha again.
   if(texel.a<.001)discard;lightRGB=max(texel.rgb,vec3(0.0));
  }else lightRGB=fallbackFlare165(pr);
  float vis=1.0;
  if(depthEnabled>.5){vec2 suv=gl_FragCoord.xy/max(viewport,vec2(1.0));float sceneD=eyeDepth(texture2D(depthMap,clamp(suv,0.0,1.0)).r);vis=smoothstep(vDepth-.10,vDepth+.18,sceneD);}
  vec3 rgb=max(vColor,vec3(0.0))*lightRGB*max(vStrength,0.0)*support*vis;
  gl_FragColor=vec4(rgb,0.0);
 }`;
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor});material.name='MV322 accepted SourceView pulses / native sprite or optical flare / c62.165';
 const scene=new THREE.Scene(),camera=new THREE.Camera(),mesh=new THREE.Mesh(g,material);mesh.frustumCulled=false;scene.add(mesh);
 q=fx.callYourNameSourcePulse164={capacity,geometry:g,material,scene,camera,mesh,history:new Map(),lastTime:null,bloomPrev:null,bloomHold:0,rows165:[],spriteCache165:new Map(),blank165};return q;
}
function prepareCallYourNamePulseAppearance165(live,q){
 const rt=live.runtime,fx=rt.stageFx362_21,g=q.geometry,count=g.instanceCount,rect=g.getAttribute('pulseSpriteRect165'),data=g.getAttribute('pulseSpriteData165');
 const pages=[],frameCache=new Map(),revision=(fx.banks||[]).map(b=>String(b.records?.size||0)+':'+String(b.textures?.size||0)).join('|');let nativeCount=0,fallbackCount=0;const names=new Set();
 for(let i=0;i<count;i++){
  const row=q.rows165[i];let name='',angle=0,sprite=null;
  try{
   const setting=row?.entry?lightEvent362_41(rt,row.entry,'LightObjectSettingTimelineTrack')?.value:null;
   name=typeof setting?.LensFlareSpriteName==='string'?setting.LensFlareSpriteName:'';
   const degrees=Number(setting?.LensFlareEffectAngle??0);angle=Number.isFinite(degrees)?degrees*Math.PI/180:0;
   if(name){names.add(name);if(frameCache.has(name))sprite=frameCache.get(name);else{
    let hit=q.spriteCache165.get(name),now=Number(rt.time)||0;
    if(!hit||hit.revision!==revision||(!hit.sprite&&Math.abs(now-hit.time)>.5)){hit={sprite:fxFindSprite362_22(fx.banks||[],name),time:now,revision};q.spriteCache165.set(name,hit);}
    sprite=hit.sprite;frameCache.set(name,sprite);
   }}
  }catch(error){q.lastAppearanceError165=String(error?.message||error);sprite=null;}
  const r=sprite?.record?.data?.m_RD?.textureRect,image=sprite?.texture?.image;let page=-1;
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
}
