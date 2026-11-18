import { checkoutApi, reconcileCheckout } from './checkout-api.js';
import { adminApi } from './admin-api.js';
import {newsletterApi,deliverWelcomes} from './newsletter-api.js';
const database='https://xjdvjdctwdswkcnpqqni.supabase.co';
const key='sb_publishable_NItr0oozm0pqLzXT4l4ZgQ_p6EinU5-';
async function rpc(name,token=key) {
 try {const response=await fetch(`${database}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});return response.ok?await response.json():null;}catch{return null;}
}
// The launch page is public. Private dashboard data is protected by Supabase Auth and RLS.
export default {
 async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if(url.pathname==='/api/newsletter/signup')return newsletterApi(request,env,ctx);
  if(url.pathname.startsWith('/api/checkout/') || url.pathname==='/api/mollie/webhook')return checkoutApi(request,env,ctx);
  if(url.pathname.startsWith('/api/admin/')) return adminApi(request,env);
  if (url.pathname.startsWith('/__access/')) return Response.redirect(new URL('/',url),303);
  const preview = /^\/preview(?:\/|$)/.test(url.pathname);
  if(url.pathname==='/api/preview-session') {
   if(request.method!=='POST'||request.headers.get('Origin')!==url.origin)return new Response('Forbidden',{status:403});
   const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
   if(!token || await rpc('is_doxa_admin',token)!==true)return new Response('Unauthorized',{status:401});
   return new Response(null,{status:204,headers:{'Set-Cookie':`doxa_preview=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/preview; Max-Age=3600`,'Cache-Control':'no-store'}});
  }
  let normalizedPath;
  try { normalizedPath=decodeURIComponent(url.pathname).replace(/\\/g,'/').replace(/\/{2,}/g,'/').toLowerCase(); } catch { return new Response('Bad path',{status:400}); }
  if(normalizedPath.startsWith('/storefront') || /^\/(?:website-demo|genesis-demo)(?:\/|$)/.test(normalizedPath))return new Response('Not found',{status:404});
  const productPath='/products/the-genesis/';
  const isProduct=url.pathname===productPath || url.pathname===productPath.slice(0,-1);
  const isCheckout=['/checkout/','/checkout'].includes(url.pathname);
  let assetRequest=request;
  if(preview) {
   let token;try{token=decodeURIComponent(request.headers.get('Cookie')?.match(/(?:^|; )doxa_preview=([^;]+)/)?.[1]||'');}catch{}
   if(!token || await rpc('is_doxa_admin',token)!==true)return Response.redirect(new URL('/admin/#website',url),303);
   const previewPath=url.pathname.replace(/^\/preview/,'') || '/';
   if(!['/','/products/the-genesis/','/products/the-genesis','/checkout/','/checkout'].includes(previewPath))return new Response('Not found',{status:404});
   assetRequest=new Request(new URL(previewPath==='/'?'/storefront/preorder/index.html':previewPath.startsWith('/checkout')?'/storefront/checkout/index.html':'/storefront/genesis/index.html',url),request);
  } else if(url.pathname==='/' || url.pathname==='/index.html' || url.pathname==='/api/site' || isProduct || isCheckout) {
   const content=await rpc('get_doxa_live_site');
   if(url.pathname==='/api/site')return Response.json(content||{},{status:content?200:404,headers:{'Cache-Control':'no-store'}});
   if((isProduct || isCheckout) && !content)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
   if(content)assetRequest=new Request(new URL(isCheckout?'/storefront/checkout/index.html':isProduct?'/storefront/genesis/index.html':content.home_mode==='preorder'?'/storefront/preorder/index.html':'/storefront/index.html',url),request);
  }
  const original = await env.ASSETS.fetch(assetRequest);
  const response = new Response(original.body,original);
  response.headers.set('X-Content-Type-Options','nosniff');
  response.headers.set('Referrer-Policy','same-origin');
  response.headers.set('X-Frame-Options','DENY');
  response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'sha256-dpqxzqTPp7EaP1BvCvEYxijHQ7z7LWMN624YieCQ9bk='; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://xjdvjdctwdswkcnpqqni.supabase.co wss://xjdvjdctwdswkcnpqqni.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (preview || url.pathname.startsWith('/admin') || url.pathname.startsWith('/order-status')) {
   response.headers.set('Cache-Control','private, no-store');
   response.headers.set('X-Robots-Tag','noindex, nofollow');
  }
  if(isProduct || isCheckout || url.pathname==='/' || url.pathname==='/index.html')response.headers.set('Cache-Control','no-store');
  if(url.pathname.startsWith('/order-status'))response.headers.set('Referrer-Policy','no-referrer');
  return response;
 },
 async scheduled(event,env,ctx){ctx.waitUntil(reconcileCheckout(env));ctx.waitUntil(deliverWelcomes(env));}
};
