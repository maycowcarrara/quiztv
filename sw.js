const CACHE_NAME = 'quiz-familia-v11'; // Mudar versão para forçar a atualização imediata (camada expra)

const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

// 1. INSTALAÇÃO: Cacheia os arquivos essenciais
self.addEventListener('install', event => {
    self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. ATIVAÇÃO: Limpa caches antigos para não acumular lixo
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Limpando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 3. INTERCEPTAÇÃO DE REDE (A Mágica Melhorada)
self.addEventListener('fetch', event => {

    // DEFINIÇÃO DO QUE PRECISA SER FRESCO (NETWORK FIRST)
    // 1. O arquivo CSV de perguntas
    // 2. O próprio site (HTML) - identificado por mode === 'navigate'
    const isCriticalUpdate = event.request.url.includes('flashcards.csv') || event.request.mode === 'navigate';

    // ESTRATÉGIA A: Network First (Tenta Internet -> Atualiza Cache -> Se falhar, usa Cache)
    if (isCriticalUpdate) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Se a internet funcionou, clonamos a resposta e salvamos no cache novo
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Se a internet falhou (OFFLINE), entregamos o que tem no cache
                    return caches.match(event.request).then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Se não tem nem na rede nem no cache (primeira vez sem net), erro.
                        throw new Error('Você está offline e não há versão salva.');
                    });
                })
        );
    }

    // ESTRATÉGIA B: Cache First (Para Imagens, Ícones, CSS externos, Fontes)
    // Carrega instantâneo do cache para performance
    else {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request);
                })
        );
    }
});