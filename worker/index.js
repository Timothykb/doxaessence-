const CODE_HASH = '0e8a83e7120a9ba124bf0aa7220ee55df17c50d43e616439f96be4f7de257162';
const COOKIE = '__Host-doxa_access';

async function valid(code) {
  if (!code || code.length > 128) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('') === CODE_HASH;
}

function headers(extra = {}) {
  return { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'same-origin', ...extra };
}

function login(error = false) {
  return new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Doxa Essence — Privétoegang</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#590000;color:#f5f1e8;font-family:Arial,sans-serif;padding:24px}main{width:100%;max-width:420px;text-align:center}.brand{position:relative;width:200px;aspect-ratio:590/245;overflow:hidden;margin:0 auto 45px}.brand img{position:absolute;width:177.9661%;max-width:none;height:auto;left:-38.9831%;top:-77.5510%}h1{font:normal 44px/1.1 Georgia,serif;margin:0 0 20px}p{color:#e0cbc2;line-height:1.7}form{text-align:left;margin-top:32px}label{display:block;font-size:13px;margin-bottom:10px}input{width:100%;padding:16px;border:1px solid #a3a48c;border-radius:4px;font:16px Arial;background:#fffdf8;color:#590000}input:focus{outline:2px solid #f5f1e8;outline-offset:2px}button{width:100%;margin-top:16px;padding:17px;background:#f5f1e8;border:0;border-radius:4px;color:#590000;font-size:15px;cursor:pointer}button:hover{background:#e5d7c9}.error{color:#ffd1c8;font-size:14px}.note{font-size:12px;margin-top:30px}</style></head><body><main><div class="brand"><img src="/brand/doxa-logo.png" alt="Doxa Essence" width="1050" height="600"></div><h1>A story<br><em>you can wear.</em></h1><p>Deze website is privé.<br>Vul je toegangscode in om verder te kijken.</p><form method="post" action="/__access/login"><label for="code">Toegangscode</label><input id="code" name="code" type="password" autocomplete="current-password" required maxlength="128" ${error ? 'aria-describedby="error" aria-invalid="true"' : ''}>${error ? '<p class="error" id="error" role="alert">Deze code klopt niet. Probeer het opnieuw.</p>' : ''}<button type="submit">Website openen</button></form><p class="note">C1 — THE GENESIS · PRIVATE PREVIEW</p></main></body></html>`, {
    status: error ? 401 : 200,
    headers: headers({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" }),
  });
}

// Public unsubscribe page for the link in every email. It stays reachable
// while the rest of the site is behind the access gate. GET only shows a
// confirmation button, so link scanners in mail clients cannot unsubscribe.
const SUPABASE_URL = 'https://xjdvjdctwdswkcnpqqni.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NItr0oozm0pqLzXT4l4ZgQ_p6EinU5-'; // public browser key; RLS applies
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unsubscribePage(state, token = '') {
  const copy = {
    confirm: ['Afmelden voor e-mails', 'Wil je geen e-mails meer ontvangen van Doxa Essence? Bevestig hieronder.'],
    done: ['Je bent afgemeld', 'Je ontvangt geen e-mails meer van ons. Toch weer aanmelden kan altijd via de website.'],
    invalid: ['Deze link werkt niet', 'De afmeldlink is onvolledig of verlopen. Mail naar info@doxaessence.com, dan melden we je handmatig af.'],
    error: ['Er ging iets mis', 'Je afmelding kon nu niet worden opgeslagen. Probeer het later opnieuw of mail naar info@doxaessence.com.'],
  }[state];
  const form = state === 'confirm' ? `<form method="post" action="/afmelden"><input type="hidden" name="token" value="${token}"><button type="submit">Ja, meld mij af</button></form>` : '';
  return new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${copy[0]} — Doxa Essence</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#590000;color:#f3efe7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:24px}main{max-width:460px;text-align:center}p.brand{letter-spacing:.4em;font:400 22px Georgia,serif;margin:0 0 48px}h1{font:400 40px/1.1 Georgia,serif;margin:0 0 18px}p{line-height:1.7;color:#e6d3c8}button{margin-top:28px;width:100%;padding:17px;border:0;border-radius:999px;background:#f3efe7;color:#590000;font:600 13px system-ui;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}button:focus-visible{outline:2px solid #f3efe7;outline-offset:3px}</style></head><body><main><p class="brand">DOXA ESSENCE</p><h1>${copy[0]}</h1><p>${copy[1]}</p>${form}</main></body></html>`, {
    status: state === 'invalid' ? 400 : state === 'error' ? 502 : 200,
    headers: headers({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" }),
  });
}

async function unsubscribe(request, url) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    const token = url.searchParams.get('token') || '';
    return unsubscribePage(UUID.test(token) ? 'confirm' : 'invalid', UUID.test(token) ? token.toLowerCase() : '');
  }
  if (request.method !== 'POST') return new Response('Niet toegestaan', { status: 405, headers: headers() });
  if (request.headers.get('Origin') !== url.origin) return new Response('Niet toegestaan', { status: 403, headers: headers() });
  let token;
  try { token = String((await request.formData()).get('token') || ''); } catch { return unsubscribePage('invalid'); }
  if (!UUID.test(token)) return unsubscribePage('invalid');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/unsubscribe_doxa_newsletter`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) return unsubscribePage('error');
    return unsubscribePage((await response.json()) === true ? 'done' : 'invalid');
  } catch { return unsubscribePage('error'); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Only the supplied brand logo is public, so the access screen can display it.
    if (url.pathname === '/brand/doxa-logo.png' && ['GET', 'HEAD'].includes(request.method)) return env.ASSETS.fetch(request);
    if (url.pathname === '/afmelden' || url.pathname === '/afmelden/') return unsubscribe(request, url);
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
