# Detta Cloud Functions

Backend logic for the Detta Attendance System using Firebase Cloud Functions (2nd Gen).

## Setup

1.  `npm install`
2.  Ensure `firebase-tools` is installed globally: `npm install -g firebase-tools`
3.  Add `serviceAccountKey.json` to the root of this directory (for local admin SDK usage).
4.  Copy `.env.example` to `.env`.

## Development

- `npm run build`: Compile TypeScript
- `npm run serve`: Start emulators
- `npm run shell`: Start interactive shell
- `npm run logs`: View logs

## Deployment

Deploy to Firebase:

```bash
firebase deploy --only functions
```

## Shared Types

This package uses `@detta/shared` for type definitions. Path mapping is configured in `tsconfig.json`.
