import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as acorn from 'acorn';
const bytes=await fs.readFile('artifacts/ES_c62.164_BloomRoute_SourcePulse.html');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
assert.equal(blob,'094fba263722fa5a0bb5e11161f44162fbeda809','Accepted c62.164 baseline only');
const html=bytes.toString('utf8');
function scripts(text){const out=[];for(const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))out.push({attrs:m[1],text:m[2],start:m.index+m[0].indexOf('>')+1,path:(m[1].match(/data-es-path="([^"]+)"/)||[])[1]});return out;}
function functions(text){return new Map(acorn.parse(text,{ecmaVersion:'latest',sourceType:'module'}).body.filter(x=>x.type==='FunctionDeclaration').map(x=>[x.id.name,x]));}
const chunks=scripts(html),main=chunks.find(x=>x.text.includes('function callYourNameSourcePulseState164(live)'));assert(main);
const funcs=functions(main.text),fn=name=>{const n=funcs.get(name);assert(n,name);return main.text.slice(n.start,n.end);};
const appearance=await fs.readFile('tools/flare-appearance-165.js','utf8'),appearanceFns=functions(appearance);
const oldFactory=fn('callYourNameSourcePulseState164'),oldRender=fn('renderCallYourNameSourcePulse164');
const factoryNode=appearanceFns.get('callYourNameSourcePulseState164'),factory=appearance.slice(factoryNode.start,factoryNode.end);
function one(text,needle,replacement,label){assert.equal(text.split(needle).length-1,1,label);return text.replace(needle,replacement);}
let render=one(oldRender,'report.push({source:row.source?.id??null','q.rows165[count]=row;report.push({source:row.source?.id??null','Capture accepted row');
render=one(render,'r.autoClear=false;r.render(q.scene,q.camera);','r.autoClear=false;prepareCallYourNamePulseAppearance165(live,q);r.render(q.scene,q.camera);','Prepare appearance at existing draw');
assert.equal(render.replace('q.rows165[count]=row;','').replace('prepareCallYourNamePulseAppearance165(live,q);',''),oldRender,'Exact controller lock');
const oldDispose=fn('disposeStageFx362_21'),newDispose=one(oldDispose,'if(!fx)return;disposeFloorSourceBloom362_146(fx);','if(!fx)return;disposeCallYourNamePulseAppearance165(fx);disposeFloorSourceBloom362_146(fx);','Dispose added resources');
const edits=[['callYourNameSourcePulseState164',appearance],['renderCallYourNameSourcePulse164',render],['disposeStageFx362_21',newDispose]].map(([name,replacement])=>({...funcs.get(name),replacement})).sort((a,b)=>b.start-a.start);
let text=main.text;for(const e of edits)text=text.slice(0,e.start)+e.replacement+text.slice(e.end);
const newFuncs=functions(text),changed=new Set(edits.map(e=>e.id.name));let lockedFunctions=0;
for(const [name]of funcs){if(changed.has(name))continue;const n=newFuncs.get(name);assert(n);assert.equal(text.slice(n.start,n.end),fn(name),'Unexpected change: '+name);lockedFunctions++;}
let result=html.slice(0,main.start)+text+html.slice(main.start+main.text.length);
result='<!-- c62.165: appearance-only on accepted c62.164. Exact emitter/time/audio/Bloom locks; native flare sprite, narrow-core multi-ray fallback if unavailable. -->\n'+result;
const newChunks=scripts(result);let parsed=0,unchangedModules=0;
assert.equal(newChunks.length,chunks.length);
for(let i=0;i<chunks.length;i++){
 const a=chunks[i],b=newChunks[i];assert(b&&a.attrs===b.attrs,'Script structure');if(a!==main){assert.equal(b.text,a.text,'Unrelated script changed');unchangedModules++;}
 if(/application\/json|importmap|application\/x-es-binary/i.test(a.attrs))continue;
 if(a.path||!/type\s*=/.test(a.attrs)||/type=["']module["']/.test(a.attrs)){acorn.parse(b.text,{ecmaVersion:'latest',sourceType:'module',allowReturnOutsideFunction:true});parsed++;}
}
assert(result.includes('audio-only hotfix on c62.161'),'Audio marker');
await fs.mkdir('artifacts',{recursive:true});await fs.mkdir('test-runtime165/modules',{recursive:true});
for(const c of newChunks.filter(x=>x.path)){
 assert(!c.path.split('/').includes('..'));const dest=path.join('test-runtime165/modules',c.path.replace(/^\//,''));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,c.text.replaceAll('es-file:/','/modules/'));
}
const three=newChunks.find(c=>c.path?.endsWith('/three.module.js'))||newChunks.find(c=>c.path&&/\/three(?:\.min)?\.m?js$/.test(c.path));assert(three,'Embedded Three module');
const file='artifacts/ES_c62.165_FlareAppearance';await fs.writeFile(file+'.html',result);await fs.writeFile(file+'.txt',result);assert.deepEqual(await fs.readFile(file+'.html'),await fs.readFile(file+'.txt'));
const checks={version:'c62.165',baselineGitBlob:blob,baselineSHA256:sha(bytes),outputSHA256:sha(Buffer.from(result)),bytes:Buffer.byteLength(result),htmlTxtIdentical:true,unchangedFunctions:lockedFunctions,unchangedScripts:unchangedModules,syntaxCheckedScripts:parsed,acceptedControllerByteIdenticalAfterTwoAppearanceHooks:true,lockedFunctions:['callYourNameObservedAccent164','callYourNameSourceStrength164','callYourNameSourceColor164','resolveActiveBloom164'],audio:'All embedded decoder resources, bootstrap and unrelated functions byte-identical',spritePolicy:'Current LensFlareSpriteName and loaded atlas when available; explicit narrow-core multi-ray fallback otherwise. Native rendering parity is not claimed.',gpuTests:'pending'};
await fs.writeFile('artifacts/ES_c62.165_Checks.json',JSON.stringify(checks,null,2));
await fs.writeFile('test-runtime165/spec.json',JSON.stringify({oldFactory,factory,appearance,three:'/modules'+three.path}));
console.log(JSON.stringify(checks,null,2));
