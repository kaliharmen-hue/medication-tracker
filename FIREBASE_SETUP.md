# Firebase Setup

This app works in local-only preview mode until Firebase keys are added.

## Create the Firebase project

1. Create a Firebase project.
2. Add a web app.
3. Copy the web app config values into `.env`, using `.env.example` as the template.
4. Enable Authentication with Anonymous sign-in.
5. Create a Firestore database.

## Firestore Rules

For a private family tracker, keep the site URL private and use rules like this while testing:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /dailyEntries/{entryId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

These rules allow anyone who can open the app to anonymously read and write tracker entries. That is convenient for two trusted people sharing one tracker, but it is not suitable for a public link.

For stronger privacy later, add real sign-in and restrict by approved user IDs.
