# AGM Band Manager Agent Guide

## Project Overview

AGM Band Manager is a mobile-first Progressive Web App for the Amazing Voices worship team at Amazing Grace Ministries. It uses React 18, Vite, JavaScript, CSS, Firebase Authentication, Cloud Firestore, Firebase Storage, Firebase Cloud Functions, Firebase Cloud Messaging, and Firebase Hosting. Studio Mode projects and recordings are stored locally in IndexedDB.

## Requirements and Setup

Required tools: Node.js, npm, Git, Git LFS, and the Firebase CLI. Cloud Functions require Node.js 20 or newer.

Install the frontend dependencies:

```bash
npm install
```

When working on Cloud Functions, install their dependencies separately:

```bash
npm --prefix functions install
```

Create the local environment file from `.env.example` and populate it with the Firebase web app configuration:

```bash
cp .env.example .env
```

Firebase initialization is in `src/firebase.js`. Authentication uses Email/Password and Google sign-in. Cloud Messaging requires `VITE_FIREBASE_VAPID_KEY`.

## Development and Build

```bash
npm run dev
npm run build
```

The Vite development server normally runs at `http://localhost:5173`. The production build is written to `dist/`.

## Project Layout

- `src/components/`: feature and shared UI components.
- `src/contexts/`, `src/hooks/`, and `src/utils/`: application state, data hooks, and utilities.
- `src/firebase.js`: Firebase initialization.
- `functions/`: Cloud Functions source and dependencies.
- `public/loops/`: rehearsal audio and its manifest.
- `firestore.rules` and `firestore.indexes.json`: Firestore security rules and indexes.
- `storage.rules`: Storage security rules.
- `firebase.json`: Firebase service configuration.

## Git LFS

Rehearsal audio under `public/loops/` uses Git LFS, including `.wav`, `.mp3`, and `.m4a` files. Install Git LFS before cloning or pulling audio changes, and do not bypass LFS for large audio files.

```bash
git lfs install
git lfs pull
git lfs ls-files
```

Do not add `public/loops/` to `.gitignore`.

## Firebase Deployment

Use the `dev@amazinggracemn.org` Firebase account and the `band-manager-agm` project.

For now, deploy only Firebase Hosting and Firestore. Do not deploy Cloud Functions or Storage, and do not use an unscoped `firebase deploy`.

```bash
npm run build
npx -y firebase-tools@latest deploy --only hosting,firestore --project band-manager-agm
```

## Security and Generated Files

Firestore and Storage access are controlled by `firestore.rules` and `storage.rules`. When adding Firebase features, update and test the appropriate security rules before deployment.

Never commit private environment files, Firebase service-account credentials, API secrets, or private keys. Keep dependencies, `dist/`, `.firebase/`, environment files, IDE files, and `.DS_Store` out of version control.
