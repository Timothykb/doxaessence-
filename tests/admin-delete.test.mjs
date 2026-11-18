import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {csvCell,searchTerm} from '../src/admin-utils.js';
class Element {
 constructor(){this.children=[];this.handlers={};this.value='';this.dataset={};this.hidden=false;this.disabled=false;this.open=false;}
 addEventListener(name,fn){this.handlers[name]=fn;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(){} removeAttribute(){} focus(){}
 showModal(){this.open=true;} close(){this.open=false;}
 querySelectorAll(){return this.children.flatMap(child=>child.type==='checkbox'?[child]:child.querySelectorAll());}
}
const elements=new Map(); const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const doc={getElementById:get,createElement:()=>new Element(),querySelectorAll:()=>[]};
get('source').value='launch';
let records=[{id:'1',email:'one@example.invalid',first_name:'One',email_consent:true,created_at:new Date().toISOString()},{id:'2',email:'two@example.invalid',first_name:'Two',email_consent:true,created_at:new Date().toISOString()}];
let deletionError=false, calls=[];
const client={auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user:{email:'admin@example.invalid'}}}})},rpc(name,args){
 return {abortSignal:async()=>{if(name==='is_doxa_admin')return {data:true};calls.push({name,args});if(deletionError)return {error:{message:'test failure'}};records=records.filter(r=>!args.selected_emails.includes(r.email));return {data:1};}};
},from(table){let head=false;const q={select(cols,options){head=options?.head;return q;},gte(){return q;},order(){return q;},limit(){return q;},range(){return q;},or(){return q;},ilike(){return q;},abortSignal:async()=>({data:head?null:table==='doxa_waitlist'?[]:records,count:table==='doxa_waitlist'?0:records.length})};return q;}};
const source=(await readFile(new URL('../src/admin.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
await new (Object.getPrototypeOf(async function(){}).constructor)('document','window','location','supabase','csvCell','searchTerm','refreshCommerce','clearCommerce','refreshMail','clearMail','loadSite','clearSite','refreshContacts','clearContacts',source)(doc,{addEventListener(){}},{hash:'#audience',origin:'http://localhost'},client,csvCell,searchTerm,async()=>{},()=>{},async()=>{},()=>{},async()=>{},()=>{},async()=>{},()=>{});
assert.equal(get('delete-selected').disabled,true);
let box=get('rows').children[0].children[0].children[0];box.checked=true;box.handlers.change();
assert.equal(get('delete-selected').disabled,false);
get('delete-selected').handlers.click();assert.equal(get('delete-dialog').open,true);assert.equal(get('delete-emails').children[0].textContent,'one@example.invalid');
get('delete-cancel').handlers.click();assert.equal(calls.length,0);assert.equal(get('delete-dialog').open,false);
get('delete-selected').handlers.click();await get('delete-confirm').handlers.click();
assert.deepEqual(calls[0],{name:'delete_doxa_registrations',args:{selected_emails:['one@example.invalid']}});
assert.equal(records.length,1);assert.equal(records[0].email,'two@example.invalid');assert.equal(get('delete-selected').disabled,true);assert.equal(get('delete-dialog').open,false);
box=get('rows').children[0].children[0].children[0];box.checked=true;box.handlers.change();get('delete-selected').handlers.click();deletionError=true;await get('delete-confirm').handlers.click();
assert.equal(get('delete-dialog').open,true);assert.equal(records.length,1);assert.match(get('delete-error').textContent,/kon niet worden bevestigd/);assert.equal(get('delete-confirm').disabled,false);
get('delete-cancel').handlers.click();get('source').value='legacy';await get('source').handlers.change();assert.equal(get('delete-selected').disabled,true);
console.log('PASS: selection, cancel without deletion, exact selected payload, success refresh, failure preserves dialog and contacts, source change clears selection.');
