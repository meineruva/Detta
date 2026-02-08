# Detta Attendance System

> Monorepo for the Detta Attendance System.

## Architecture
- **Mobile**: Expo SDK 53+ (React Native)
- **Web**: Next.js 15
- **Shared**: TypeScript shared types
- **Functions**: Firebase Cloud Functions

## Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Expo CLI (`npm install -g expo-cli`)
- Android Studio / Xcode (for mobile simulation)

## Firebase Project Setup

1.  Go to [Firebase Console](https://console.firebase.google.com).
2.  Create a project named "detta-attendance".
3.  Add Web App: Copy config to `web/.env.local` (use `.env.example` as a guide).
4.  Add Android App: Download `google-services.json` to `mobile/`.
5.  Add iOS App: Download `GoogleService-Info.plist` to `mobile/`.
6.  Enable Authentication (Email/Google), Firestore, Storage.

## Environment Setup

```bash
# Web
cp web/.env.example web/.env.local
# Edit web/.env.local with actual values

# Mobile
cp mobile/.env.example mobile/.env
# Edit mobile/.env with actual values

# Functions
cp functions/.env.example functions/.env
```

## Development Commands

```bash
# Install all dependencies
npm install

# Start Mobile
cd mobile && npm start

# Start Web
cd web && npm run dev

# Start Functions
cd functions && npm run serve
```

## Firebase Emulators

To run the local development environment with Firebase Emulators:

1.  Make sure you have JDK installed (required for Firestore/PubSub emulators).
2.  Run `firebase emulators:start`.
3.  Access the Emulator UI at `http://localhost:4000`.

## Testing

To verify the shared types and imports:

```bash
# Mobile
cd mobile && npx tsc --noEmit test-import.ts

# Web
cd web && npx tsc --noEmit test-import.ts

# Functions
cd functions && npx tsc --noEmit src/test-import.ts
```

## Troubleshooting

- **"Error: no such file or directory, open '.../google-services.json'"**: Ensure you downloaded the Firebase credentials and placed them in the mobile/ directory.
- **"Unable to resolve module @detta/shared"**: Run `npm install` in the root directory to link workspaces.
- **"Firebase: No Firebase App '[DEFAULT]' has been created"**: Check your `.env` files and ensures initialization code in `lib/firebase.ts` (web) or `App.tsx` (mobile) is correct.
