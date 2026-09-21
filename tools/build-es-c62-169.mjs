import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as acorn from 'acorn';

const sourcePath='artifacts/ES_c62.168_NativeFlarePixels.html';
const bytes=await fs.readFile(sourcePath);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(bytes),'474c366558817a5db6fb9f828d7345edd59e3b8be5dea7df440077f17ba0fc08','c62.168 baseline mismatch');
const html=bytes.toString('utf8');

function chunks(s){return[...s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(m=>({attrs:m[1],text:m[2],start:m.index+m[0].indexOf('>')+1,path:(m[1].match(/data-es-path="([^"]+)"/)||[])[1],type:((m[1].match(/\btype=["']([^"']+)["']/)||[])[1]||'').toLowerCase()}));}
function functions(s){return new Map(acorn.parse(s,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,n]));}

const scripts=chunks(html),main=scripts.find(x=>x.text.includes('function prepareCallYourNameNativePixels168(live,q)'));
assert(main,'c62.168 main module not found');
const fns=functions(main.text),get=name=>{const n=fns.get(name);assert(n,name);return main.text.slice(n.start,n.end);};
const appearance=await fs.readFile('tools/native-pulse-169.js','utf8');
const appFns=functions(appearance);
for(const name of ['callYourNameSourcePulseState164','prepareCallYourNameNativePixels168','disposeNativePulse168'])assert(appFns.has(name),name);

const edits=['callYourNameSourcePulseState164','prepareCallYourNameNativePixels168','disposeNativePulse168'].map(name=>{
 const old=fns.get(name),nu=appFns.get(name);
 return{...old,replacement:appearance.slice(nu.start,nu.end),name};
}).sort((a,b)=>b.start-a.start);

let mainText=main.text;
for(const e of edits)mainText=mainText.slice(0,e.start)+e.replacement+mainText.slice(e.end);
const newFns=functions(mainText),changed=new Set(edits.map(e=>e.name));
let locked=0;
for(const[name,n] of fns){
 if(changed.has(name))continue;
 const b=newFns.get(name);assert(b,'missing '+name);
 assert.equal(mainText.slice(b.start,b.end),main.text.slice(n.start,n.end),'Unexpected unrelated function change: '+name);
 locked++;
}

let result=html.slice(0,main.start)+mainText+html.slice(main.start+main.text.length);
result=result.replace(/<title>[^<]*<\/title>/,'<title>ES Private Viewer c62.169 柔化原始闪光</title>').replace('<span class="version">v2.6.3c62.168</span>','<span class="version">v2.6.3c62.169</span>');
result='<!-- c62.169: c62.168 original flare pixels retained. Only the custom flare appearance is softened: full native lightness multiplier is compressed, sharp pixels are reduced, and two resource-derived blur layers provide a wider soft transition. Timing, lamp positions, pulse selection, audio and global Bloom are unchanged. -->\n'+result;

const after=chunks(result),types=new Set(['','module','text/javascript','application/javascript','application/x-es-module']);
assert.equal(after.length,scripts.length);
let parsed=0,unchangedScripts=0;
await fs.mkdir('test-runtime169/modules',{recursive:true});
for(let i=0;i<after.length;i++){
 const a=scripts[i],b=after[i];assert.equal(a.attrs,b.attrs,'script attrs');
 if(a!==main){assert.equal(a.text,b.text,'Unrelated script changed');unchangedScripts++;}
 if(types.has(b.type)){
  acorn.parse(b.text,{ecmaVersion:'latest',sourceType:'module',allowReturnOutsideFunction:true});parsed++;
  if(b.path){const dest=path.join('test-runtime169/modules',b.path.replace(/^\//,''));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b.text.replaceAll('es-file:/','/modules/'));}
 }
}
assert(result.includes('audio-only hotfix on c62.161'),'c62.162 audio fix marker missing');
const renderOld=get('renderCallYourNameSourcePulse164'),renderNode=newFns.get('renderCallYourNameSourcePulse164'),renderNew=mainText.slice(renderNode.start,renderNode.end);
assert.equal(renderNew,renderOld,'Accepted c62.168 render/timing/anchor controller changed');

await fs.mkdir('artifacts',{recursive:true});
const out='artifacts/ES_c62.169_SoftNativeFlare.html';
await fs.writeFile(out,result);
const imageMatch=main.text.match(/const CYN_LAMP_IMAGES168=(\[[\s\S]*?\]);\nfunction callYourNameSourcePulseState164/);
assert(imageMatch,'embedded flare image constant not found');
const images=JSON.parse(imageMatch[1]);
const three=after.find(c=>c.path?.endsWith('/three.module.js')),fflate=after.find(c=>c.path==='/vendor/fflate.js');assert(three&&fflate);
await fs.writeFile('test-runtime169/spec.json',JSON.stringify({images,oldFactory:get('callYourNameSourcePulseState164'),oldPrepare:get('prepareCallYourNameNativePixels168'),newAppearance:appearance,three:'/modules'+three.path,fflate:'/modules'+fflate.path}));

const checks={version:'c62.169',bytes:Buffer.byteLength(result),sha256:sha(Buffer.from(result)),baselineSHA256:sha(bytes),unchangedFunctions:locked,unchangedScripts,syntaxScripts:parsed,controllerLock:'renderCallYourNameSourcePulse164 byte-identical to c62.168',audioLock:'all unrelated scripts and functions byte-identical; c62.162 embedded worker retained',change:'compress duplicate optical gain and add two texture-derived blur layers around the original Sprite pixels',gpu:'pending'};
await fs.writeFile('artifacts/ES_c62.169_Checks.json',JSON.stringify(checks,null,2));
console.log(JSON.stringify(checks,null,2));
