const CACHE_NAME = 'quiz-familia-v10';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
    // Não colocamos o CSV aqui, o fetch dinâmico cuida dele
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    // Limpa caches antigos (v1, v2...) automaticamente
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    // Se for o CSV, usa estratégia: Tenta Rede -> Se falhar, Tenta Cache
    if (event.request.url.includes('flashcards.csv')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Se baixou com sucesso, salva uma cópia no cache para o futuro
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Se falhou (sem internet), tenta pegar a última versão salva
                    return caches.match(event.request);
                })
        );
    } else {
        // Para o resto (HTML, Ícones), usa Cache Primeiro
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});