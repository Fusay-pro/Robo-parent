// Firebase Cloud Messaging service worker for background notifications.
// This file is served from /firebase-messaging-sw.js (root) — required by FCM.
// Fill in your real Firebase config below to enable background pushes.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// REPLACE these with values from your Firebase project (Settings → General → Your apps → Web app config)
// If left empty, background pushes won't work but the rest of the app is fine.
const FIREBASE_CONFIG = {
  apiKey:            '',
  authDomain:        '',
  projectId:         '',
  messagingSenderId: '',
  appId:             '',
};

if (FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId) {
  firebase.initializeApp(FIREBASE_CONFIG);
  const messaging = firebase.messaging();

  // Background push — when the tab is closed/backgrounded
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'RoboKids';
    const body  = payload.notification?.body || '';
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: payload.data || {},
    });
  });

  // Focus app or open URL on notification click
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
        for (const w of wins) {
          if (w.url.includes(self.location.origin) && 'focus' in w) {
            w.focus();
            if ('navigate' in w) w.navigate(url);
            return;
          }
        }
        if (clients.openWindow) clients.openWindow(url);
      })
    );
  });
}
