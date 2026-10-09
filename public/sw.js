// Seenlog service worker: lets the app open and show your saved list without a connection.
const V = 'seenlog-v1', PAGES = V + '-pages', ASSETS = V + '-assets', IMGS = V + '-img';
const SKIP = ['/api/', '/admin', '/login', '/reset-password'];
const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="background:#1d0c11;color:#f3e6cf;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px"><div><h1>You are offline</h1><p>Open Seenlog once while connected and your list will be here next time.</p></div>';

self.addEventListener('install', (e) => { e.waitUntil(caches.open(PAGES).then((c) => c.add('/')).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(V)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(name, max) { const c = await caches.open(name); const ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (SKIP.some((p) => u.pathname.startsWith(p))) return;
    if (u.pathname.startsWith('/_next/static/')) {
      e.respondWith(caches.open(ASSETS).then(async (c) => { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; }));
      return;
    }
    if (r.mode === 'navigate') {
      e.respondWith((async () => {
        const c = await caches.open(PAGES);
        try { const res = await fetch(r); if (res.ok && !res.redirected) { c.put(r, res.clone()); trim(PAGES, 40); } return res; }
        catch { return (await c.match(r)) || (await c.match('/')) || new Response(OFFLINE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }
      })());
    }
    return;
  }
  if (r.destination === 'image' && /(^|\.)(tmdb\.org|anilist\.co|supabase\.co)$/.test(u.hostname)) {
    e.respondWith(caches.open(IMGS).then(async (c) => {
      const hit = await c.match(r);
      const net = fetch(r).then((res) => { if (res.ok || res.type === 'opaque') { c.put(r, res.clone()); trim(IMGS, 400); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
