// Self-hosted firebase scripts (same-origin) — gstatic importScripts was failing in the SW context.
// firebase-compat references window at load; in a SW only self exists. Shim it so importScripts doesn't throw.
if (typeof window === 'undefined') { self.window = self; }
importScripts('/firebase-app-compat.js');
importScripts('/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAtJbz9F1FIAp1Q03_Sg8-1Q2FLU_Sgw-Y",
  authDomain: "auto-to-rental.firebaseapp.com",
  projectId: "auto-to-rental",
  storageBucket: "auto-to-rental.firebasestorage.app",
  messagingSenderId: "92546169504",
  appId: "1:92546169504:web:d4777694f582d34308a7c5"
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var n = payload.notification || {};
  var data = payload.data || {};
  self.registration.showNotification(n.title || "Auto to Rental", {
    body: n.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    image: n.image || data.image || undefined,
    data: data
  });
});

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var link = (e.notification.data && e.notification.data.link) || "/";
  var url = link.indexOf("http") === 0 ? link : ("https://autotorental.com" + link);
  e.waitUntil(clients.matchAll({ type: "window" }).then(function (cl) {
    for (var i = 0; i < cl.length; i++) { if (cl[i].url && "focus" in cl[i]) { cl[i].navigate && cl[i].navigate(url); return cl[i].focus(); } }
    return clients.openWindow(url);
  }));
});
