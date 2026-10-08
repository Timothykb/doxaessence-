const CODE_HASH = '0e8a83e7120a9ba124bf0aa7220ee55df17c50d43e616439f96be4f7de257162';
const COOKIE = '__Host-doxa_access';

async function valid(code) {
  if (!code || code.length > 128) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('') === CODE_HASH;
}

function headers(extra = {}) {
  return { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', ...extra };
}

function login(error = false) {
  return new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Doxa Essence — Privétoegang</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#590000;color:#f5f1e8;font-family:Arial,sans-serif;padding:24px}main{width:100%;max-width:420px;text-align:center}.brand{position:relative;width:200px;aspect-ratio:590/245;overflow:hidden;margin:0 auto 45px}.brand img{position:absolute;width:177.9661%;max-width:none;height:auto;left:-38.9831%;top:-77.5510%}h1{font:normal 44px/1.1 Georgia,serif;margin:0 0 20px}p{color:#e0cbc2;line-height:1.7}form{text-align:left;margin-top:32px}label{display:block;font-size:13px;margin-bottom:10px}input{width:100%;padding:16px;border:1px solid #a3a48c;border-radius:4px;font:16px Arial;background:#fffdf8;color:#590000}input:focus{outline:2px solid #f5f1e8;outline-offset:2px}button{width:100%;margin-top:16px;padding:17px;background:#f5f1e8;border:0;border-radius:4px;color:#590000;font-size:15px;cursor:pointer}button:hover{background:#e5d7c9}.error{color:#ffd1c8;font-size:14px}.note{font-size:12px;margin-top:30px}</style></head><body><main><div class="brand"><img src="/brand/doxa-logo.png" alt="Doxa Essence" width="1050" height="600"></div><h1>A story<br><em>you can wear.</em></h1><p>Deze website is privé.<br>Vul je toegangscode in om verder te kijken.</p><form method="post" action="/__access/login"><label for="code">Toegangscode</label><input id="code" name="code" type="password" autocomplete="current-password" required maxlength="128" ${error ? 'aria-describedby="error" aria-invalid="true"' : ''}>${error ? '<p class="error" id="error" role="alert">Deze code klopt niet. Probeer het opnieuw.</p>' : ''}<button type="submit">Website openen</button></form><p class="note">C1 — THE GENESIS · PRIVATE PREVIEW</p></main></body></html>`, {
    status: error ? 401 : 200,
    headers: headers({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" }),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Only the supplied brand logo is public, so the access screen can display it.
    if (url.pathname === '/brand/doxa-logo.png' && ['GET', 'HEAD'].includes(request.method)) return env.ASSETS.fetch(request);
    if (url.pathname === '/__access/login' && request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return new Response('Niet toegestaan', { status: 403, headers: headers() });
      if (Number(request.headers.get('Content-Length') || 0) > 1024) return new Response('Te groot', { status: 413, headers: headers() });
      let code;
      try { code = String((await request.formData()).get('code') || '').trim().toLowerCase(); }
      catch { return login(true); }
      if (!await valid(code)) return login(true);
      return new Response(null, { status: 303, headers: headers({ Location: '/', 'Set-Cookie': `${COOKIE}=${code}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400` }) });
    }
    if (url.pathname === '/__access/logout' && request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return new Response('Niet toegestaan', { status: 403, headers: headers() });
      return new Response(null, { status: 303, headers: headers({ Location: '/', 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` }) });
    }
    const cookie = request.headers.get('Cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`));
    if (!await valid(cookie?.slice(COOKIE.length + 1))) return login();
    const response = await env.ASSETS.fetch(request);
    const protectedResponse = new Response(response.body, response);
    for (const [name, value] of Object.entries(headers())) protectedResponse.headers.set(name, value);
    return protectedResponse;
  },
};
