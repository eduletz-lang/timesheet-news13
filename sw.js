// bump this version string whenever you upload a new index.html to GitHub.
// The SW detects the change and fetches fresh files automatically.
const VERSION = 'timesheet-v2';
const CACHE = `shell-${VERSION}`;

// Only cache the app shell — never localStorage data
const SHELL = [
  './',
  './index.html',
  './manifest.json'
];

// ── Install: cache shell files ───────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

// ── Activate: delete OLD caches only — never touch localStorage ───────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE)     // keep only current cache
          .map(k => caches.delete(k))   // delete old shell caches
      ))
      .then(() => self.clients.claim()) // take control of open tabs
  );
});

// ── Fetch: network-first for HTML (so updates are instant), cache fallback ───
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go to network for the HTML page so updates show immediately
  if(url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname === ''){
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update the cache with the fresh HTML
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))  // offline fallback
    );
    return;
  }

  // For everything else: cache first, then network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
