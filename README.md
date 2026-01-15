# GoalTimer

GoalTimer is a minimal, Android-first time tracker for daily goals. It runs on Expo (managed) with TypeScript, SQLite persistence, and a future-ready sync architecture.

## Setup

```bash
npm install
```

## Run (Expo Go)

```bash
npm run start
```

Then scan the QR code with Expo Go, or:

```bash
npm run android
```

## Development Build (required for Android foreground service)

Foreground tracking notifications use a real Android foreground service, which requires a development build:

```bash
npx expo prebuild
npx expo run:android
```

Or use EAS:

```bash
eas build --profile development --platform android
```

Then start the dev client:

```bash
npx expo start --dev-client
```

## Notifications limitation (Expo Go)

Expo Go cannot run a true Android foreground service that updates elapsed time every second in the notification bar. GoalTimer falls back to local notifications on iOS/web, and a dev build is required to enable the Android foreground service.

Android constraints:
- Foreground service notifications are persistent while tracking.
- System battery optimizations may still limit very long-running background work.

## Project structure

- `src/db` – SQLite setup, migrations, seed data
- `src/repos` – repository interfaces and SQLite implementations
- `src/services` – notification adapter, foreground tracking abstraction, sync/user identity stubs
- `modules/foreground-tracker` – Android foreground service native module
- `src/stores` – app state and timer logic
- `src/screens` – UI screens
- `src/components` – reusable UI components
- `src/theme` – design system tokens
- `src/utils` – date + aggregation helpers

## Scripts

- `npm run start` – start Expo
- `npm run android` – launch on Android emulator/device
- `npm run lint` – ESLint checks
- `npm run format` – Prettier format
