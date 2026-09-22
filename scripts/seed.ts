/**
 * Auth-only seed (Admin SDK).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
 *   SEED_DISTRIBUTOR_UID=... SEED_SR_UID=... \
 *   npx ts-node scripts/seed.ts
 *
 * 1. Create Auth users in Firebase Console (email/password).
 * 2. Copy their UIDs into SEED_DISTRIBUTOR_UID / SEED_SR_UID.
 * 3. Run this script.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const distributorUid = process.env.SEED_DISTRIBUTOR_UID ?? 'iSNNj7muIURV1kjIbpcWlXW6j163';
const srUid = process.env.SEED_SR_UID ?? 'aAy2xEOkHQfxrmhJjqxwNnYlWiR2';
const distributorId = process.env.SEED_DISTRIBUTOR_ID ?? 'dealer-1';

async function main() {
  if (!getApps().length) {
    initializeApp();
  }
  const db = getFirestore();

  await db.collection('distributors').doc(distributorId).set({
    name: 'Demo Distributor',
    active: true,
    createdAt: Timestamp.now(),
  });

  await db.collection('users').doc(distributorUid).set({
    name: 'Distributor Admin',
    email: 'distributor@example.com',
    role: 'distributor',
    distributorId,
    active: true,
    createdAt: Timestamp.now(),
  });

  await db.collection('users').doc(srUid).set({
    name: 'Sales Rep',
    email: 'sr@example.com',
    role: 'sr',
    distributorId,
    active: true,
    createdAt: Timestamp.now(),
  });

  console.log('Seeded distributor org + user profiles.');
  console.log({ distributorId, distributorUid, srUid });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
