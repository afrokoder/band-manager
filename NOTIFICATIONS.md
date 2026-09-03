# Band Manager notifications

Band Manager has two notification surfaces:

1. The in-app bell stores/read-tracks schedule, set list, reminder, and relevant Comms notifications.
2. Firebase Cloud Messaging + Cloud Functions sends device push notifications for important events.

## Phone / lock-screen push

Set `VITE_FIREBASE_VAPID_KEY` in the production environment from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates.

The build now emits `firebase-messaging-config.js` for the service worker. This lets Firebase initialize when the installed PWA is closed, so background pushes do not depend on the app page still being open.

Users enable phone notifications from the bell. Do not request notification permission automatically on login: Safari/iOS requires the permission request to be initiated by a user gesture.

### iPhone / iPad

Web Push requires iOS/iPadOS 16.4 or newer and Band Manager must be added to the Home Screen. The user then opens the Home Screen app, taps the notification bell, and taps **Enable**. iOS ultimately controls whether notifications are allowed on the lock screen, Notification Center, and banners.

### Android

Install/add Band Manager to the Home Screen, open the bell, and tap **Enable**. Android/browser notification settings ultimately control lock-screen and banner visibility.

## Push events

- Monthly automatic Saturday rehearsal creation: one push for the whole monthly batch.
- Manually created rehearsal.
- Service created. Assigned members are told they are assigned; tapping opens that exact service under Schedule.
- New published set list.
- Relevant Comms post for the user's audience/group.
- Wednesday-Friday missing rehearsal availability reminder.
- Wednesday-Friday assigned-service missing set-list reminder.

Adding a song to the Library does not send a notification.
