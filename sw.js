const CACHE="ironminds-final-v1";
self.addEventListener("install",event=>{self.skipWaiting()});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.origin!==location.origin){
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(fetch(event.request,{cache:"no-store"}).catch(()=>caches.match(event.request)));
});
