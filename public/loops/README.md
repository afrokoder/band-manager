# AGM Loop Files

Place loop audio files in this folder, then add an entry to `manifest.json`.

Example:

```json
[
  {
    "name": "Praise Loop 01",
    "src": "/loops/praise-loop-01.mp3",
    "bpm": 110,
    "key": "D"
  }
]
```

Supported browser audio formats such as MP3, WAV, M4A/AAC, and OGG can be used depending on the device/browser.
The in-app player has Play/Pause, Restart, Loop on/off, and BPM-based speed control. It intentionally has no progress bar.

## ⚠️ Git LFS — required before building/deploying

The audio files in this folder are tracked with **Git LFS** (see `.gitattributes`).
A fresh clone only contains tiny pointer stubs, not the real audio. If you build
and deploy without pulling LFS, the site will ship 133-byte text stubs named
`*.mp3`, and the Loop Player will silently fail to play (the browser can't decode
a text file as audio).

Before `npm run build` / `firebase deploy`, make sure the real files are present:

```bash
# one-time setup
brew install git-lfs   # or: apt install git-lfs
git lfs install

# download the actual audio into this folder
git lfs pull
```

Verify a file is real audio (not a pointer) — this should print an audio header,
not `version https://git-lfs...`:

```bash
file "public/loops/"*.mp3
```

Note: these loops are large (hundreds of MB total). Keep new loops short and at a
modest bitrate to limit Firebase Hosting bandwidth and in-app load times.
