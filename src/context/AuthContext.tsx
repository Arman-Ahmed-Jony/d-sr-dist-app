import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import type { AppUser } from '@/src/domain/types';
import {
  login as loginService,
  logout as logoutService,
  loadProfile,
  subscribeAuth,
} from '@/src/services/authService';
import { loadCachedProfile } from '@/src/data/offline/catalogStore';
import { isOfflineError } from '@/src/data/offline/isOfflineError';

const PROFILE_LOAD_TIMEOUT_MS = 15_000;

type AuthContextValue = {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function formatAuthError(e: unknown): string {
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case 'unavailable':
      case 'firestore/unavailable':
        return 'Cannot reach Firestore. Check that the Cloud Firestore API is enabled for this project and try again.';
      case 'permission-denied':
      case 'firestore/permission-denied':
        return 'Signed in, but this account cannot read its user profile. Check Firestore rules and the users document.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait and try again.';
      default:
        break;
    }
  }
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    if (msg.includes('client is offline') || msg.includes('unavailable')) {
      return 'Cannot reach Firestore. Check that the Cloud Firestore API is enabled for this project and try again.';
    }
    if (msg.includes('profile load timed out')) {
      return e.message;
    }
    return e.message;
  }
  return 'Failed to load profile';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveProfile = useCallback(async (user: User) => {
    try {
      const p = await withTimeout(
        loadProfile(user.uid),
        PROFILE_LOAD_TIMEOUT_MS,
        'Profile load timed out. Firestore may be unavailable — enable the Cloud Firestore API and retry.',
      );
      if (!p) {
        throw new Error(
          'User profile not found in Firestore. Create a users/{uid} document for this account.',
        );
      }
      if (!p.active) {
        throw new Error('This account is inactive. Contact your distributor admin.');
      }
      return p;
    } catch (error) {
      const cached = await loadCachedProfile(user.uid);
      if (cached?.active && isOfflineError(error)) return cached;
      throw error;
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeAuth(async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        // Keep `error` so login can show profile/Firestore failures after forced sign-out.
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const p = await resolveProfile(user);
        setProfile(p);
        setError(null);
      } catch (e) {
        const message = formatAuthError(e);
        setError(message);
        setProfile(null);
        // Avoid a half-logged-in session that loops on login with no recovery path.
        try {
          await logoutService();
        } catch {
          // ignore logout failures; error message already set
        }
        setFirebaseUser(null);
        setError(message);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [resolveProfile]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await loginService(email, password);
    } catch (e) {
      setError(formatAuthError(e));
      setLoading(false);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    await logoutService();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const p = await resolveProfile(firebaseUser);
      setProfile(p);
      setError(null);
    } catch (e) {
      setError(formatAuthError(e));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, resolveProfile]);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      error,
      login,
      logout,
      refreshProfile,
    }),
    [firebaseUser, profile, loading, error, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
