/* YoldaYakala service worker — derlemede vite.config.ts tarafından dist/sw.js olarak üretilir.
 * Sürüm ve dosya listesi derlemede doldurulur. */
const VERSION = '81693bff3f';
const APP = 'yy-app-' + VERSION;
const TILES = 'yy-tiles-v1';
const GUIDE = 'yy-guide-v1';
const ASSETS = ["./assets/maplibre-2Cf-5a7S.css","./assets/index-DLByQ9_K.css","./assets/three-CKHCukkA.js","./assets/cities-BBcyJVcz.js","./assets/maplibre-TWgQ9Yuf.js","./assets/turf-CvUHM9PB.js","./assets/index-adI-Dzuf.js","./assets/Passport-DDYUK5LE.js","./assets/Profile-bR2A1IpC.js","./assets/Wishlist-BpkLeDix.js","./assets/PhotoImport-C4QzXDG4.js","./assets/cityMap-9dJfuLPB.js","./assets/world-og_Rt1_e.js","./assets/landWorker-C08gotk7.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./icons/apple-180.png"];
const MAX_TILES = 1500;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(['./', ...ASSETS])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('yy-app-') && k !== APP).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Sayfa: önce ağ (güncelleme gelsin), çevrimdışıysa önbellekteki uygulama
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(APP).then(c => c.put('./', copy)); return r; })
      .catch(() => caches.match('./', { cacheName: APP })));
    return;
  }
  // Uygulama dosyaları (adlarında içerik özeti var): önce önbellek
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(APP).then(c => c.put(req, copy)); }
      return r;
    })));
    return;
  }
  // Harita karoları ve stili: önbellekten hemen göster, arkada tazele (gezilen şehirler çevrimdışı da görünür)
  if (url.hostname === 'tiles.openfreemap.org') {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok) { c.put(req, r.clone()); trim(c); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Rehber (Wikipedia, Overpass): önce ağ, olmazsa son kayıtlı sonuç
  if (/(^|\.)wikipedia\.org$/.test(url.hostname) || url.hostname === 'overpass-api.de' || url.hostname === 'upload.wikimedia.org') {
    e.respondWith(fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(GUIDE).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => caches.match(req, { cacheName: GUIDE }).then(h => h || Response.error())));
  }
});

let trimming = false;
async function trim(cache) {
  if (trimming) return; trimming = true;
  try {
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
  } finally { trimming = false; }
}
