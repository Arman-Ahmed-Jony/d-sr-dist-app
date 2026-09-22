import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { toDate } from '../converters';
import type { AppUser, UserRole } from '@/src/domain/types';

function mapUser(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    role: data.role as UserRole,
    distributorId: String(data.distributorId ?? ''),
    active: Boolean(data.active ?? true),
    createdAt: toDate(data.createdAt),
  };
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return mapUser(snap.id, snap.data() as Record<string, unknown>);
}

export async function listSrsByDistributor(distributorId: string): Promise<AppUser[]> {
  const q = query(
    collection(db, 'users'),
    where('distributorId', '==', distributorId),
    where('role', '==', 'sr'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapUser(d.id, d.data() as Record<string, unknown>));
}

export async function setUserActive(uid: string, active: boolean): Promise<void> {
  await setDoc(doc(db, 'users', uid), { active, updatedAt: serverTimestamp() }, { merge: true });
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { name: name.trim(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function createUserProfile(input: {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  distributorId: string;
}): Promise<void> {
  await setDoc(doc(db, 'users', input.uid), {
    name: input.name,
    email: input.email,
    role: input.role,
    distributorId: input.distributorId,
    active: true,
    createdAt: Timestamp.now(),
  });
}
