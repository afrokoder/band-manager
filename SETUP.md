# Band Manager — Setup Guide

## 1. Install dependencies

```bash
cd BandManager
npm install
```

## 2. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**, name it `band-manager`
3. Enable Google Analytics if you want (optional)

### Enable Authentication
- Firebase Console → **Authentication** → Get started
- Enable **Email/Password**
- Enable **Google** (sign-in providers)

### Create Firestore Database
- Firebase Console → **Firestore Database** → Create database
- Choose **Start in test mode** (you can add rules later)
- Select a region close to you

### Enable Storage
- Firebase Console → **Storage** → Get started
- Accept the default rules for now

### Enable Cloud Messaging (Push Notifications)
- Firebase Console → **Project Settings** → **Cloud Messaging**
- Under **Web Push certificates**, click **Generate key pair**
- Copy the key — you'll need it for `VITE_FIREBASE_VAPID_KEY`

## 3. Get your Firebase config

- Firebase Console → **Project Settings** (gear icon) → **Your apps**
- Click **Add app** → Web (</> icon) → Register app
- Copy the `firebaseConfig` object values

## 4. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all the values from step 3.

## 5. Firestore Security Rules (recommended)

Go to Firestore → Rules and replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read all profiles, write only their own
    match /users/{userId} {
      allow read:  if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    // Songs: all authenticated users can read, band members can write
    match /songs/{songId} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null;
    }
    // Setlists, rehearsals, messages: all authenticated
    match /{collection}/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 6. Storage Rules (recommended)

Go to Storage → Rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /songs/{allPaths=**} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 20 * 1024 * 1024;
    }
  }
}
```

## 7. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 8. Seed starter songs (optional)

Open the browser console on the running app and run:

```js
import('/src/utils/seedData.js').then(m => {
  import('/src/firebase.js').then(f => m.seedSongs(f.db))
})
```

## 9. Build for production

```bash
npm run build
```

Deploy the `dist/` folder to Firebase Hosting, Vercel, Netlify, or any static host.

### Deploy to Firebase Hosting (recommended)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select dist as public dir, SPA: yes
npm run build
firebase deploy
```

---

## Features

| Feature | Status |
|---------|--------|
| Auth (Email + Google) | ✅ |
| Member profiles (name, role, group) | ✅ |
| Song library with real-time Firestore | ✅ |
| Lyrics & chord chart viewer | ✅ |
| File upload (PDF/chord charts) | ✅ |
| Setlist builder (drag & drop) | ✅ |
| PDF export of setlists | ✅ |
| Rehearsal scheduler | ✅ |
| RSVP per rehearsal | ✅ |
| Real-time comms feed | ✅ |
| @band / @vocals / @all audience tags | ✅ |
| Push notifications (FCM) | ✅ |
| PWA (installable) | ✅ |
