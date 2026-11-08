// Service worker do sistema Melhoraço: só recebe notificações (não guarda páginas em cache).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Melhoraço", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Melhoraço";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/sistema/icon-192.png",
      badge: "/sistema/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/sistema/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/sistema/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
