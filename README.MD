# AGM Band Manager

AGM Band Manager is a mobile-first Progressive Web App (PWA) built for the **Amazing Voices worship team at Amazing Grace Ministries**.

The application provides one place for the worship team to manage songs, set lists, rehearsals, services, communication, practice resources, attendance, learning resources, and music tools.

The project is built with **React, Vite, Firebase, Firestore, Firebase Storage, Firebase Authentication, and Firebase Cloud Functions**.

---

## Features

### Song Library

The Song Library provides a shared collection of songs used by the worship team.

Features include:

- Add and edit songs
- Song title and artist/author
- Lyrics organized into sections
- Song mood/category
- YouTube links
- File attachments
- Voice recordings
- Automatically generated song artwork when a YouTube thumbnail is unavailable
- Search and filtering
- Track who added each song
- Use library songs directly when building set lists

Supported song categories include:

- Worship
- Praise
- Afrobeats
- Reggae
- Praise Break
- Rock & Roll
- Highlife
- Aria Aria (Woro)

---

## Set Lists

Set Lists allow assigned team members to prepare music for upcoming services.

Features include:

- Create draft set lists
- Publish set lists
- Select songs from the Song Library
- Add songs manually
- Assign songs to service sections
- Select a key for the entire set
- Attach a rehearsal loop
- Set-list notes
- Attach files
- Record voice notes
- Track who submitted or edited a set list
- Track published set-list views
- Generate and share set-list PDFs
- Include song lyrics in exported PDFs

Supported service sections include:

- Morning Worship
- Praise
- Worship
- Praise & Worship
- Offering

---

## Schedule

The Schedule manages services, rehearsals, assignments, and attendance.

### Automatic Rehearsals

Saturday rehearsals are automatically generated.

The app does **not** wait for the next calendar month to begin.

As soon as the **last Saturday of the current month has passed**, the application can automatically create the Saturday rehearsals for the following month.

For example:

> If September's final Saturday is September 26, October rehearsals can be generated beginning September 27.

This ensures the team can see and respond to the upcoming month's rehearsal schedule in advance.

The default rehearsal time is **10:00 AM**.

### Attendance

Members can respond:

- Going
- Maybe
- Can't Go

Attendance responses remain editable until the rehearsal attendance lock takes effect.

Administrators can review team attendance and accountability information.

---

## Comms

Comms provides internal communication for the worship team.

Messages can be sent to:

- `@all`
- `@band`
- `@vocals`

Members can filter the message feed to view communication for a specific team.

Additional features include:

- Replies
- Team labels
- Pinned information
- Important links and announcements
- Message editing
- Message deletion
- Swipe actions on mobile

---

## Loop Player

The built-in Loop Player allows musicians to practice using AGM rehearsal loops.

Features include:

- Search loops
- Search by BPM
- Search by key
- Play / pause
- Restart
- Continuous looping
- Target BPM / playback-speed adjustment
- Open a loop directly from a published set list

Loop metadata is stored in:

```text
public/loops/manifest.json
```

Audio files are stored under:

```text
public/loops/
```

Because several loop files are very large, this project uses **Git LFS** for loop audio.

See [Git LFS Setup](#git-lfs-setup-important) before cloning or contributing.

---

## Studio Mode

Studio Mode provides a lightweight multitrack rehearsal environment directly inside the browser.

Features include:

- Create Studio projects
- Add multiple tracks
- Record audio
- Rename tracks
- Mute tracks
- Adjust track volume
- Drag recorded regions
- Move regions between tracks
- Cut
- Copy
- Paste
- Slice
- Delete regions
- Add AGM backing loops
- Edit loop regions
- Record while listening to backing tracks
- Favorite projects
- Search saved projects
- Export WAV mixes
- MP3 export when supported by the browser

Studio projects and recordings are stored locally using **IndexedDB**.

They are not automatically uploaded to Firebase.

---

## Music Tools

AGM Band Manager includes several tools for musicians.

### Metronome

- Adjustable BPM
- Start / pause
- ±5 BPM controls
- BPM slider
- Tempo presets
- Visual beat indicator

### Tuner

Guitar-focused tuner with:

- Microphone pitch detection
- Six standard guitar strings
- Reference tones
- Cents indicator

### Loop Player

Practice using AGM rehearsal loops directly inside the app.

---

## More

The More area includes:

### Library
- Music Library
- Files & Media

### Tools
- Tuner
- Metronome
- Loop Player

### Rehearsal Mode
- Studio Mode

### Grow
- Learn
- Notes

### Play
- Bible games
- Music games
- Ear training

### Insights
Administrator-only reporting and analytics.

### Additional
- Rules & Policies
- About

---

## Notifications

The application supports in-app and push notifications for events such as:

- Upcoming rehearsals
- Upcoming services
- Service assignments
- Published set lists
- Attendance reminders
- Set-list reminders
- Comms posts

Firebase Cloud Functions are used for server-side notification processing.

---

# Technology Stack

### Frontend

- React 18
- Vite
- JavaScript
- CSS
- Progressive Web App (PWA)

### Backend

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Functions
- Firebase Cloud Messaging

### Local Browser Storage

- IndexedDB for Studio Mode projects and recordings

### Hosting

- Firebase Hosting

---

# Requirements

Install the following before running the project:

- Node.js
- npm
- Git
- Git LFS
- Firebase CLI

Firebase Cloud Functions require **Node.js 20 or newer**.

Check your versions:

```bash
node --version
npm --version
git --version
git lfs version
firebase --version
```

---

# Git LFS Setup — IMPORTANT

This repository contains large audio files used by the AGM Loop Player.

These files must be managed using **Git Large File Storage (Git LFS)** rather than normal Git objects.

The repository tracks:

```text
public/loops/*.wav
public/loops/*.mp3
public/loops/*.m4a
```

The project's `.gitattributes` should contain:

```gitattributes
public/loops/*.wav filter=lfs diff=lfs merge=lfs -text
public/loops/*.mp3 filter=lfs diff=lfs merge=lfs -text
public/loops/*.m4a filter=lfs diff=lfs merge=lfs -text
```

## Install Git LFS

### macOS

If Git LFS is not already installed:

```bash
git lfs version
```

If the command is unavailable, install Git LFS.

Official releases:

https://github.com/git-lfs/git-lfs/releases

For an Intel Mac:

```bash
uname -m
```

If the result is:

```text
x86_64
```

download the **Darwin AMD64** Git LFS release.

For Apple Silicon:

```text
arm64
```

download the **Darwin ARM64** release.

After extracting the download:

```bash
cd ~/Downloads/git-lfs-<version>
sudo ./install.sh
```

Then initialize Git LFS:

```bash
git lfs install
```

Verify:

```bash
git lfs version
```

---

## Clone This Repository

Make sure Git LFS is installed **before cloning**.

```bash
git lfs install
git clone <repository-url>
cd band-manager
```

Git LFS should download the loop files automatically.

If the repository was cloned before Git LFS was installed, run:

```bash
git lfs install
git lfs pull
```

Verify the tracked files:

```bash
git lfs ls-files
```

The AGM `.wav`, `.mp3`, and `.m4a` loop files should appear in the output.

---

## Adding New Loop Files

Place new loop files in:

```text
public/loops/
```

Supported tracked formats are:

```text
.wav
.mp3
.m4a
```

Before committing, verify that Git LFS recognizes the files:

```bash
git lfs ls-files
```

Then stage normally:

```bash
git add public/loops/
git add public/loops/manifest.json
git commit -m "Add new rehearsal loops"
git push
```

During a push containing new audio, Git may display:

```text
Uploading LFS objects
```

This is expected.

### Do Not Bypass Git LFS

Do not force large audio files into normal Git history.

GitHub rejects normal Git files larger than its individual-file limit, and large audio files can dramatically increase repository size.

If an audio file is accidentally committed without LFS, fix the commit before pushing rather than repeatedly retrying the push.

---

# Installation

After cloning:

```bash
npm install
```

Install Cloud Function dependencies:

```bash
cd functions
npm install
cd ..
```

Start the development server:

```bash
npm run dev
```

Vite will provide a local development URL.

---

# Firebase Configuration

The application requires a Firebase project configured for:

- Authentication
- Firestore
- Storage
- Cloud Functions
- Cloud Messaging
- Hosting

Firebase initialization is located in:

```text
src/firebase.js
```

Do not commit private environment configuration or credentials.

Environment files should remain ignored:

```text
.env
.env.local
.env.*
```

---

# Firebase Deployment

## Build the frontend

```bash
npm run build
```

## Deploy Firestore and Storage rules

```bash
firebase deploy --only firestore:rules,storage
```

## Deploy Cloud Functions

Cloud Functions require Node.js 20+.

```bash
firebase deploy --only functions
```

## Deploy Hosting

```bash
firebase deploy --only hosting
```

Or deploy the Firebase resources together when appropriate:

```bash
firebase deploy
```

---

# Recommended Git Workflow

Create a development branch:

```bash
git checkout -b your_branch
```

Make your changes and check the repository:

```bash
git status
```

For changes involving loops, verify LFS before committing:

```bash
git lfs ls-files
```

Then:

```bash
git add .
git commit -m "Describe your changes"
git push origin your_branch
```

Create a pull request and merge the branch after review.

After changes are merged, build and deploy the appropriate Firebase resources for users to receive the update.

---

# Files That Should Not Be Committed

Keep local/generated files out of Git.

Example `.gitignore` entries:

```gitignore
# Dependencies
node_modules/
functions/node_modules/

# Builds
dist/
.firebase/

# Environment variables
.env
.env.local
.env.*

# IDE
.idea/
.vscode/

# macOS
.DS_Store
```

Do **not** add `public/loops/` to `.gitignore`.

Those files are intentionally part of the project and are managed through Git LFS.

---

# Project Structure

```text
band-manager/
├── functions/
│   ├── index.js
│   └── package.json
│
├── public/
│   ├── loops/
│   │   ├── manifest.json
│   │   └── rehearsal audio files
│   └── manifest.json
│
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   ├── Comms/
│   │   ├── More/
│   │   ├── Schedule/
│   │   ├── Setlist/
│   │   ├── Songs/
│   │   └── ui/
│   │
│   ├── contexts/
│   ├── hooks/
│   ├── utils/
│   ├── App.jsx
│   ├── firebase.js
│   ├── index.css
│   └── main.jsx
│
├── firestore.rules
├── storage.rules
├── firebase.json
├── .gitattributes
├── .gitignore
├── package.json
└── README.md
```

---

# Security

Firestore and Storage access is controlled through:

```text
firestore.rules
storage.rules
```

When adding new Firebase features, update and test the appropriate security rules before deploying.

Never commit:

- Firebase service-account credentials
- API secrets
- Private keys
- `.env` files containing secrets

---

# AGM Band Manager

Built for the **Amazing Voices worship team** at **Amazing Grace Ministries — St. Paul, Minnesota**.

The goal of AGM Band Manager is to make worship-team preparation easier by bringing scheduling, songs, set lists, communication, rehearsal resources, and music tools into one mobile-first application.