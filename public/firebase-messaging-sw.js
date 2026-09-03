importScripts('/firebase-messaging-config.js')
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js')

if (self.__FIREBASE_CONFIG__?.projectId) {
  firebase.initializeApp(self.__FIREBASE_CONFIG__)
  const messaging = firebase.messaging()

  // Cloud Functions send data-only FCM messages. That avoids duplicate browser
  // notifications and lets us consistently control tap navigation.
  messaging.onBackgroundMessage(payload => {
    const data = payload.data || {}
    self.registration.showNotification(data.title || 'Band Manager', {
      body: data.body || 'New update',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || undefined,
      data: { link: data.link || '/', tab: data.tab || '' },
    })
  })
}

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.link || '/'
  event.waitUntil((async () => {
    const absoluteTarget = new URL(target, self.location.origin).href
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => client.url.startsWith(self.location.origin))
    if (existing) {
      await existing.navigate(absoluteTarget)
      return existing.focus()
    }
    return self.clients.openWindow(absoluteTarget)
  })())
})
