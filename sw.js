const CACHE_NAME = 'quiz-familia-v1'; // Mude para v2 se alterar o HTML/CSS no futuro

// Arquivos vitais para o app abrir (App Shell)
// O CSV não entra aqui pois é tratado dinamicamente
const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

// 1. INSTALAÇÃO: Cacheia o "esqueleto" do app
self.addEventListener('install', event => {
    self.skipWaiting(); // Força o SW a ativar imediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. ATIVAÇÃO: Limpa caches antigos (v1, v2...) para liberar espaço
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

// 3. INTERCEPTAÇÃO DE REDE (A Mágica)
self.addEventListener('fetch', event => {

    // ESTRATÉGIA A: Para o CSV (Network First - Rede Primeiro)
    if (event.request.url.includes('flashcards.csv')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Se deu certo (tem internet), retorna o arquivo novo E atualiza o cache
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Se deu erro (sem internet), tenta pegar o último salvo no cache
                    return caches.match(event.request).then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Se não tem nem na rede nem no cache, retorna erro
                        throw new Error('Sem internet e sem cache do CSV');
                    });
                })
        );
    }

    // ESTRATÉGIA B: Para o HTML/CSS/Imagens (Cache First - Cache Primeiro)
    // Isso faz o app carregar instantaneamente
    else {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Retorna do cache se existir, senão busca na rede
                    return response || fetch(event.request);
                })
        );
    }
});