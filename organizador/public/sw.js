/* Service worker: notificaciones push + funcionamiento como app instalada */
const CACHE = 'mipanel-v2'
const MAX_ASSETS = 60
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

// Red primero; si no hay conexión, usar caché (solo archivos propios, nunca la API)
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put('/', c)); return r }).catch(() => caches.match('/')))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c).then(() => trim(x))) }
      return r
    })))
  }
})

// Mantener la caché acotada: borrar los archivos más viejos de versiones anteriores
async function trim(cache) {
  const keys = (await cache.keys()).filter((k) => new URL(k.url).pathname.startsWith('/assets/'))
  if (keys.length > MAX_ASSETS) await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map((k) => cache.delete(k)))
}

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { title: 'Mi Panel', body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'Mi Panel', {
    body: d.body || '',
    tag: d.tag,
    renotify: !!d.tag,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: d.url || '/' },
    vibrate: [80, 40, 80],
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  // solo pantallas de la propia app (nunca links externos)
  let target = new URL((e.notification.data && e.notification.data.url) || '/', location.origin)
  if (target.origin !== location.origin) target = new URL('/', location.origin)
  const url = target.href
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if (new URL(c.url).origin === location.origin) {
        await c.focus()
        c.postMessage({ type: 'navigate', url })
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
