# Keith Medication Tracker

A warm, low-friction medication tracker for daily Mirtazapine check-ins.

## What It Does

- Autosaves the daily check-in.
- Keeps one entry per date.
- Includes a separate Kali notes field.
- Shows recent history and cautious pattern notes.
- Exports Markdown, CSV, and JSON backups.
- Works locally without Firebase, then switches to shared Firebase saving when config values are set.

## Local Commands

```powershell
npm install
npm run build
npm run serve
```

Open `http://127.0.0.1:4322`.

## Firebase

See `FIREBASE_SETUP.md`.

For GitHub Pages, add these as repository variables if shared saving is needed:

- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `PUBLIC_FIREBASE_APP_ID`

Without those variables, the published app still opens, but saves only in the current browser.
