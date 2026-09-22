import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  getAuth,
  type User,
} from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { auth, firebaseConfig } from '@/src/data/firebase';
import { getUserProfile, createUserProfile } from '@/src/data/repos/usersRepo';
import type { AppUser, UserRole } from '@/src/domain/types';

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout() {
  return firebaseSignOut(auth);
}

export async function loadProfile(uid: string): Promise<AppUser | null> {
  return getUserProfile(uid);
}

function getSecondaryAuth() {
  const name = 'Secondary';
  const app = getApps().some((a) => a.name === name)
    ? getApp(name)
    : initializeApp(firebaseConfig, name);
  return getAuth(app);
}

/** Create Auth user + Firestore profile without replacing the current session. */
export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  distributorId: string;
}): Promise<string> {
  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(
    secondaryAuth,
    input.email.trim(),
    input.password,
  );
  await createUserProfile({
    uid: cred.user.uid,
    name: input.name,
    email: input.email.trim(),
    role: input.role,
    distributorId: input.distributorId,
  });
  await firebaseSignOut(secondaryAuth);
  return cred.user.uid;
}
