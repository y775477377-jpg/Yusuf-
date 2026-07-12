// ==================================================================
// service-worker.js
// ------------------------------------------------------------------
// يقوم فقط بتخزين "هيكل التطبيق" (HTML/CSS/JS/الأيقونات) مؤقتاً حتى
// يفتح التطبيق فوراً كأي تطبيق مثبّت ويعمل حتى مع ضعف الاتصال.
// طلبات Firebase وأي طلب خارجي تمر مباشرة إلى الشبكة دائماً (لا يتم
// تخزين بيانات الفواتير/الحسابات نفسها لأنها حيّة ويجب أن تبقى محدثة).
// ==================================================================

const CACHE_NAME = "abu-mohammed-app-shell-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // اسمح لكل طلبات Firebase / الشبكة الخارجية / API بالمرور مباشرة (لا تخزين مؤقت)
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) {
    return; // اترك المتصفح يتعامل معها بشكل طبيعي (fetch افتراضي)
  }

  // فقط GET يُخزَّن؛ باقي الطلبات تمر مباشرة
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => cached);

      // شبكة أولاً مع رجوع فوري للكاش عند فشل الاتصال (يحافظ على تحديث الملفات دوماً)
      return cached || networkFetch;
    })
  );
});
