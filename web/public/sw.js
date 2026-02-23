self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'New Message';
  const options = {
    body: data.body || 'You have a new message.',
    icon: '/vite.svg', // Assuming vite.svg is there or default
    badge: '/vite.svg',
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      const isVisible = clientList.some(function(client) {
        return client.url.includes(options.data.url) && client.visibilityState === 'visible';
      });

      if (isVisible) {
        console.log('Suppressing notification as chat is already visible');
        return;
      }

      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      const url = event.notification.data.url;
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
