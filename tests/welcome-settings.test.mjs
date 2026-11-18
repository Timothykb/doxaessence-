import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
class Element{
 constructor(){this.handlers={};this.children=[];this.value='';this.textContent='';this.disabled=false;this.nodes=new Map();}
 addEventListener(k,f){this.handlers[k]=f;}
 append(...v){this.children.push(...v);}
 replaceChildren(...v){this.children=v;}
 querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Element());return this.nodes.get(k);}
 attachShadow(){return new Element();}
}
let root;const doc={createElement(){const e=new Element();if(!root)root=e;return e;},querySelector(){return new Element();}};
const form=root=new Element();root=undefined;
// The DOM adapter models only actual fields and events used by the editor.
const oldCreate=doc.createElement;
doc.createElement=()=>{const e=oldCreate();if(e===root){const f=e.querySelector('form');f.elements={subject:new Element(),body:new Element(),button:new Element(),*[Symbol.iterator](){yield this.subject;yield this.body;yield this.button;}};f.reset=()=>{f.elements.subject.value='';f.elements.body.value='';};f.reportValidity=()=>true;}return e;};
let stored={subject:'Actual current subject',body:'Hi {{first_name}},\nCurrent saved welcome.\nTimothy\nDOXA ESSENCE'},fail=false,updates=0;
const client={from(table){const q={select(){return q;},eq(){return q;},order(){return q;},limit:async()=>({data:[]}),update(v){updates++;if(!fail)stored={...v};return q;},single:async()=>fail?{error:Error('Denied')}:{data:{...stored}}};return q;}};
const source=(await readFile(new URL('../src/welcome-settings.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export /g,'');
const api=await new (Object.getPrototypeOf(async function(){}).constructor)('document','supabase','renderMail','welcomeState',source+'\nreturn {loadWelcome,clearWelcome};')(doc,client,m=>{assert.equal(m.includeSocial,true);return m.blocks[0].text;},()=> 'Accepted');
await api.loadWelcome();const editor=root.querySelector('form'),status=root.querySelector('[role="status"]');
assert.equal(editor.elements.subject.value,'Actual current subject');assert.match(editor.elements.body.value,/Current saved welcome/);assert.equal(editor.elements.subject.disabled,false);
editor.elements.subject.value=' New subject ';editor.elements.body.value=' New welcome for {{first_name}} ';await editor.handlers.submit({preventDefault(){}});
assert.deepEqual(stored,{subject:'New subject',body:'New welcome for {{first_name}}'});assert.match(status.textContent,/Opgeslagen en actief/);assert.equal(updates,1);
fail=true;editor.elements.body.value='Unconfirmed edit';await editor.handlers.submit({preventDefault(){}});assert.match(status.textContent,/Opslaan niet bevestigd/);assert.equal(stored.body,'New welcome for {{first_name}}');
api.clearWelcome();assert.equal(editor.elements.subject.disabled,true);assert.equal(editor.elements.body.value,'');
console.log('PASS: current saved automatic email populates editor; save updates the same settings and verifies returned content; failed save never claims activation; signout clears private text.');
