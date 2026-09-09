/**
 * Service Worker - Viaje de Egresados
 * Estrategia:
 *  - App shell (HTML/CSS/JS/íconos): cache-first con actualización en segundo plano.
 *  - Peticiones a Supabase (API/datos): siempre red (network-only), nunca cache,
 *    porque los datos deben persistir en la nube y estar siempre actualizados.
 */

const CACHE_VERSION = 'viaje-egresados-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/config.js',
  '/js/lib/supabase.js',
  '/js/api.js',
  '/js/utils.js',
  '/js/stats.js',
  '/js/charts.js',
  '/js/router.js',
  '/js/app.js',
  '/js/screens/inicio.js',
  '/js/screens/nueva-venta.js',
  '/js/screens/ventas.js',
  '/js/screens/productos.js',
  '/js/screens/ingresos.js',
  '/js/screens/estadisticas.js',
  '/js/screens/meta.js',
  '/js/screens/compartir.js',
  '/js/screens/configuracion.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isSupabaseRequest(url) {
  return url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear llamadas a Supabase: los datos siempre deben venir de la nube.
  if (isSupabaseRequest(url) || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
