# SR Dist — Setup

Expo React Native app for distributors and sales reps (SRs).
Auth mirrors the `sr-order` stack: Firebase email/password + Firestore user profiles.

## Stack

- Expo + Expo Router + TypeScript
- Firebase Auth / Firestore
- i18n (`bn` default, `en` fallback)

## Quick start

1. Copy `.env.example` to `.env` and fill Firebase web config values.
2. Optionally mirror the same values in `app.json` → `expo.extra`.
3. Install: `npm install`
4. Run: `npm start` then press `a` for Android / `i` for iOS.

## Firebase project

1. Create (or use) a Firebase project for this app.
2. Enable **Email/Password** under Authentication → Sign-in method.
3. Create a **Cloud Firestore** database (production mode is fine; deploy rules next).
4. Enable the **Cloud Firestore API** in Google Cloud Console if login hangs / shows offline errors.
5. Register a Web app in the Firebase Console and copy the config into `.env`.

## Deploy rules

```bash
npx -y firebase-tools@latest use <PROJECT_ID>
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
```

## Bootstrap users

Demo accounts (already seeded for project `sr-dist-app`):

| Email | Password | Role |
|-------|----------|------|
| `distributor@example.com` | `Password123!` | distributor |
| `sr@example.com` | `Password123!` | sr |

UIDs: distributor `iSNNj7muIURV1kjIbpcWlXW6j163`, SR `aAy2xEOkHQfxrmhJjqxwNnYlWiR2`, org `dealer-1`.

To re-seed profiles and dummy catalog/order data with Admin credentials:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
SEED_DISTRIBUTOR_UID=iSNNj7muIURV1kjIbpcWlXW6j163 \
SEED_SR_UID=aAy2xEOkHQfxrmhJjqxwNnYlWiR2 \
npx ts-node scripts/seed.ts
```

The script writes stable IDs (`prod-*`, `shop-*`, `order-*`) so re-runs overwrite the same dummy docs and leave other Firestore data alone.

Dummy data (org `dealer-1`):

| Collection | Count | Notes |
|------------|-------|-------|
| Products | 7 | 6 active + 1 inactive (`Lentil 20kg`) |
| Shops | 6 | Motijheel, Dhanmondi, Gulshan, Uttara, Mirpur, New Market |
| Orders | 10 | Mix of draft / submitted / confirmed / cancelled; discount + free-pcs lines |

Log in with each account — distributor routes to `(distributor)/(app)/dashboard`, SR to `(sr)/(app)/dashboard`.

## Roles

| Role | Firestore `users/{uid}.role` | Notes |
|------|------------------------------|--------|
| Distributor | `distributor` | Admin for an org (`distributorId`) |
| Sales rep | `sr` | Field user under the same `distributorId` |

Inactive profiles (`active: false`) are signed out after login with an error message.
