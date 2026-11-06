const CACHE_NAME = 'studycast-v5'; // 👈 Versión actualizada para borrar la memoria vieja
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalar y guardar archivos en caché
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Fuerza a la nueva versión a activarse de inmediato
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activar y borrar las memorias (cachés) viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Toma el control de la app inmediatamente
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
