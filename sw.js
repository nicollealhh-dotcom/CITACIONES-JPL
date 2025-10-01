const CACHE_NAME = 'citaciones-jpl-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/services/geminiService.ts',
  '/components/FileUpload.tsx',
  '/components/CitationView.tsx',
  '/components/CorrespondenceView.tsx',
  '/components/HelpModal.tsx',
  '/components/icons.tsx',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react-dom@^19.1.1/client',
  'https://aistudiocdn.com/react-dom@^19.1.1/',
  'https://aistudiocdn.com/react@^19.1.1/',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/@google/genai@^1.15.0',
  'https://esm.sh/jspdf@2.5.1',
  'https://esm.sh/html2canvas@1.4.1',
  'https://esm.sh/xlsx@0.18.5'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        const requests = urlsToCache.map(url => {
            if (url.startsWith('http')) {
                return new Request(url, { mode: 'no-cors' });
            }
            return url;
        });
        return cache.addAll(requests);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
