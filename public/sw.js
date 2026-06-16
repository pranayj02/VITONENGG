/* eslint-disable no-undef */
// Service Worker for Web Push Notifications — VITON ERP

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Viton ERP", body: "You have a new notification." };
  }

  const title = data.title || "Viton ERP";
  const options = {
    body: data.body || "",
    icon: "/Logo.JPG",
    badge: "/Logo.JPG",
    tag: data.tag || "viton-notification",
    data: {
      url: data.url || "/dashboard",
      type: data.type || "general",
    },
    actions: data.actions || [],
    renotify: true,
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus().then((c) => c.navigate(urlToOpen));
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Push subscription changed");
});
