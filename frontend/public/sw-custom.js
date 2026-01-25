/**
 * Custom Service Worker for StockPro Push Notifications
 * This file extends the workbox-generated service worker with notification handling
 */

// Handle push events (for future server-side push)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);

  let data = {
    title: 'StockPro Notification',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    tag: data.tag || `stockpro-${Date.now()}`,
    requireInteraction: data.requireInteraction !== false,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Determine which page to open based on notification data
  if (data.productId) {
    targetUrl = '/products';
  } else if (data.equipmentId) {
    targetUrl = '/temperatures';
  } else if (data.url) {
    targetUrl = data.url;
  }

  // Handle action button clicks
  if (event.action) {
    switch (event.action) {
      case 'view-products':
        targetUrl = '/products';
        break;
      case 'view-temperatures':
        targetUrl = '/temperatures';
        break;
      case 'dismiss':
        return; // Just close the notification
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            // Navigate to the target URL and focus
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // No existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
  // Could log analytics here
});

// Message handler for communication with the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, data, tag } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: data || {},
      tag: tag || `stockpro-${Date.now()}`,
      requireInteraction: true,
    });
  }
});

console.log('[SW] Custom service worker loaded');
