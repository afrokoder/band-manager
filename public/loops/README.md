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
