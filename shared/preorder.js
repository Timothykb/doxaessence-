export function preorderReady(settings,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){
 if(settings.sale_mode!=='preorder')return true;
 const date=settings.preorder_dispatch_date,parsed=new Date(date+'T12:00:00Z');
 return /^\d{4}-\d{2}-\d{2}$/.test(date||'')&&Number.isFinite(parsed.valueOf())&&parsed.toISOString().slice(0,10)===date&&date>=today&&typeof settings.preorder_product_details==='string'&&settings.preorder_product_details.trim().length>=5&&typeof settings.preorder_returns==='string'&&settings.preorder_returns.trim().length>=10&&settings.preorder_notes_confirmed===true;
}
export const formatDispatch=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
