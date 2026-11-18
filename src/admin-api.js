import { supabase } from './supabase.js';
export async function adminRequest(path,body) {
 const {data,error}=await supabase.auth.getSession();
 if(error||!data.session)throw Error('Je sessie is verlopen. Log opnieuw in.');
 const response=await fetch('/api/admin/'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${data.session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(40000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'De actie is niet gelukt.');return result;
}
