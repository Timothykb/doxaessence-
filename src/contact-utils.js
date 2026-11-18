// Keep the original consent separate from customer status; neither implies the other.
export function mergeContacts(customers,launch,legacy) {
 const contacts=new Map();
 function get(email){const key=email.trim().toLowerCase();if(!contacts.has(key))contacts.set(key,{email:key,name:'',customer:false,newsletter:false,samples:false,sources:[],joined:null});return contacts.get(key);}
 function source(c,label,created){if(!c.sources.includes(label))c.sources.push(label);if(created&&(!c.joined||created<c.joined))c.joined=created;}
 for(const r of customers){const c=get(r.email);c.name=r.name||c.name;c.customer=true;source(c,'Klantbestand',r.created_at);}
 for(const r of launch){const c=get(r.email);c.name ||= r.first_name||'';c.newsletter ||= r.email_consent===true;source(c,'Huidige inschrijflijst',r.created_at);}
 for(const r of legacy){const c=get(r.email);c.newsletter ||= r.newsletter===true;c.samples ||= r.samples===true;source(c,'Eerdere inschrijflijst',r.created_at);}
 return [...contacts.values()].sort((a,b)=>a.email.localeCompare(b.email,'nl'));
}
export function filterContacts(rows,term,group){const search=term.trim().toLowerCase();return rows.filter(c=>(!search||(c.name+' '+c.email).toLowerCase().includes(search))&&(group==='all'||group==='customers'&&c.customer||group==='newsletter'&&c.newsletter||group==='both'&&c.customer&&c.newsletter||group==='samples'&&c.samples));}
