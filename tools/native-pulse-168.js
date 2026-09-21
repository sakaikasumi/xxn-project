/* CYN_LAMP_IMAGES168 is inserted by the builder from verified original Sprite pixels.
   The existing c62.164 controller remains responsible for pulse timing and lamp selection. */
function callYourNameSourcePulseState164(live){
 const fx=live.runtime?.stageFx362_21;if(!fx)return null;let q=fx.callYourNameSourcePulse164;if(q)return q;
 const images168=CYN_LAMP_IMAGES168.map(item=>{
  const [w,h]=item.size,raw=gunzipSync(b64bytes(item.rgbaGzip));if(raw.length!==w*h*4)throw Error('Original flare pixel length mismatch');
  const pad=2,pw=w+pad*2,ph=h+pad*2,rgba=new Uint8Array(pw*ph*4);
  for(let y=0;y<h;y++)rgba.set(raw.subarray(y*w*4,(y+1)*w*4),((y+pad)*pw+pad)*4);
  const texture=new THREE.DataTexture(rgba,pw,ph,THREE.RGBAFormat,THREE.UnsignedByteType);texture.name='Original '+item.name+' / '+item.pixelSHA256;
  texture.colorSpace=Number(item.textureMeta?.colorSpace)===0?THREE.NoColorSpace:THREE.SRGBColorSpace;texture.flipY=false;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.needsUpdate=true;
  return{...item,texture};
 });
 const capacity=160,g=new THREE.InstancedBufferGeometry(),plane=new THREE.PlaneGeometry(1,1);g.index=plane.index.clone();g.setAttribute('position',plane.getAttribute('position').clone());g.setAttribute('uv',plane.getAttribute('uv').clone());plane.dispose();
 for(const[name,size]of [['pulseCenter',2],['pulseSize',2],['pulseDepth',1],['pulseStrength',1],['pulseColor',3],['pulseImage168',4],['pulseExtent168',2]])g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(THREE.DynamicDrawUsage));g.instanceCount=0;
 const uniforms={viewport:{value:new THREE.Vector2(1,1)},depthMap:{value:null},nearFar:{value:new THREE.Vector2(.1,100)},depthEnabled:{value:0},image0168:{value:images168[0].texture},image1168:{value:images168[1].texture}};
 const vertexShader=`uniform vec2 viewport,nearFar;uniform sampler2D depthMap;uniform float depthEnabled;
 attribute vec2 pulseCenter,pulseSize,pulseExtent168;attribute float pulseDepth,pulseStrength;attribute vec3 pulseColor;attribute vec4 pulseImage168;
 varying vec2 vUv;varying vec3 vColor;varying float vStrength,vPage,vGain,vVisible;
 float eyeDepth168(float z){return nearFar.x*nearFar.y/max(.00001,nearFar.y-z*(nearFar.y-nearFar.x));}
 void main(){
  vUv=uv;vColor=pulseColor;vStrength=pulseStrength;vPage=pulseImage168.x;vGain=pulseImage168.z;
  // Optical flare visibility is tested at the emitting source, not by treating the whole
  // sprite as an opaque plane sliced through the floor. All vertices share this visibility.
  float visible=1.0;
  if(depthEnabled>.5){visible=0.0;for(int iy=-1;iy<=1;iy++){for(int ix=-1;ix<=1;ix++){
   vec2 at=pulseCenter+vec2(float(ix),float(iy))*1.5/max(viewport,vec2(1.0));
   float z=eyeDepth168(texture2D(depthMap,clamp(at,0.0,1.0)).r);
   visible+=smoothstep(pulseDepth-.10,pulseDepth-.02,z)/9.0;
  }}}
  vVisible=visible;float a=pulseImage168.y,cs=cos(a),sn=sin(a);vec2 p=position.xy*pulseExtent168;
  p=mat2(cs,sn,-sn,cs)*p;vec2 ndc=pulseCenter*2.0-1.0+p*2.0/max(viewport,vec2(1.0));gl_Position=vec4(ndc,0.0,1.0);
 }`;
 const fragmentShader=`uniform sampler2D image0168,image1168;varying vec2 vUv;varying vec3 vColor;varying float vStrength,vPage,vGain,vVisible;
 void main(){
  vec4 texel=vPage<.5?texture2D(image0168,vUv):texture2D(image1168,vUv);
  if(texel.a<.001||vStrength<=0.0||vVisible<=0.0)discard;
  // The original LIGHT_FLARE_FRAGMENT uses texture RGB and alpha cut-off, not a broad
  // generated mask. The sprite's existing rays, falloff and soft layers remain intact.
  vec3 rgb=max(texel.rgb,vec3(0.0))*max(vColor,vec3(0.0))*vStrength*vGain*vVisible;
  gl_FragColor=vec4(rgb,0.0);
 }`;
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor});material.name='MV322 original Sprite pixels / c62.168';
 const scene=new THREE.Scene(),camera=new THREE.Camera(),mesh=new THREE.Mesh(g,material);mesh.frustumCulled=false;scene.add(mesh);
 q=fx.callYourNameSourcePulse164={capacity,geometry:g,material,scene,camera,mesh,history:new Map(),lastTime:null,bloomPrev:null,bloomHold:0,images168,rows168:[]};return q;
}
function prepareCallYourNameNativePixels168(live,q){
 const rt=live.runtime,fx=rt.stageFx362_21,g=q.geometry,data=g.getAttribute('pulseImage168'),extent=g.getAttribute('pulseExtent168'),oldSize=g.getAttribute('pulseSize'),height=q.material.uniforms.viewport.value.y,rows=[];
 const special=q.images168.findIndex(x=>x.name==='EffectAtlas_mv322_Lens'),number=(x,f)=>Number.isFinite(Number(x))?Number(x):f;
 for(let i=0;i<g.instanceCount;i++){
  const row=q.rows168[i];let setting=null;
  try{setting=row?.entry?lightEvent362_41(rt,row.entry,'LightObjectSettingTimelineTrack')?.value:null;}catch(e){q.appearanceError168=String(e?.message||e);}
  const fullName=String(setting?.LensFlareSpriteName||''),name=fullName.split('/').pop();let page=q.images168.findIndex(x=>x.name===name);const authored=page>=0;if(page<0)page=special;
  const angle=authored?number(setting.LensFlareEffectAngle,0)*Math.PI/180:0,authoredScale=authored?number(setting.LensFlareEffectScale,0):0;
  const size=authoredScale>0?height*authoredScale:Math.max(oldSize.getX(i),oldSize.getY(i));
  // Keep the accepted pulse envelope. Positive HDR multiplier is read from the actual
  // selected setting; a missing/disabled setting cannot drop the accepted fallback pulse.
  const gain=authored?Math.max(1,Math.min(32,number(setting.LensFlareLightnessMultiplier,1))):1;
  const aspect=authored?Math.max(.01,number(setting.LensFlareEffectAspect,1)):1;
  const image=q.images168[page],ratio=image.size[0]/image.size[1];
  data.setXYZW(i,page,angle,gain,authored?1:0);extent.setXY(i,size*aspect*ratio,size);
  rows.push({source:row?.source?.id??null,sprite:image.name,selection:authored?'current native LightObject setting':'embedded MV322 sprite fallback',angle,gain,extent:[size*aspect*ratio,size],pixelSHA256:image.pixelSHA256});
 }
 q.rows168.length=g.instanceCount;data.needsUpdate=extent.needsUpdate=true;
 if(fx.report)fx.report.nativePulseAppearance168={version:'c62.168',source:'original decoded Sprite RGBA; no procedural circles, pillars, fans or fabricated crosses',occlusion:'physical source-area depth, not a billboard-floor intersection',fixtures:rows,error:q.appearanceError168||null};
}
function disposeNativePulse168(fx){
 const q=fx?.callYourNameSourcePulse164;if(!q?.images168)return;q.mesh.removeFromParent();q.geometry.dispose();q.material.dispose();for(const im of q.images168)im.texture.dispose();fx.callYourNameSourcePulse164=null;
}
