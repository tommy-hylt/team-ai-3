self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'New Message';
  const options = {
    body: data.body || 'You have a new message.',
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      const targetPath = decodeURIComponent(options.data.url);

      const isVisible = clientList.some(function(client) {
        const clientPath = decodeURIComponent(new URL(client.url).pathname);
        return clientPath.includes(targetPath) && client.visibilityState === 'visible';
      });

      if (isVisible) {
        console.log('Suppressing notification as chat is already visible');
        return;
      }

      // Delay 5 seconds to handle race conditions where SSE might have just arrived
      return new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
        return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(finalClientList) {
          const isStillVisible = finalClientList.some(function(client) {
            const finalPath = decodeURIComponent(new URL(client.url).pathname);
            return finalPath.includes(targetPath) && client.visibilityState === 'visible';
          });

          if (isStillVisible) {
            console.log('Suppressing notification after 5s delay (chat became visible)');
            return;
          }

          return self.registration.showNotification(title, options);
        });
      });
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
