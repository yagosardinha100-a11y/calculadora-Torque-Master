import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';

const ALLOWLIST = [
  'odn1mecanicadept@gmail.com',
  'yago.sardinha100@gmail.com',
  'joubertribeir@gmail.com',
];

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function resolveAdmin(fbUser: FirebaseUser): Promise<boolean> {
  if (fbUser.email && ALLOWLIST.includes(fbUser.email)) return true;
  try {
    const snap = await getDoc(doc(firestore, 'admins', fbUser.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

function fbUserToUser(fbUser: FirebaseUser, isAdmin: boolean): User {
  return {
    id: fbUser.uid,
    username: fbUser.email?.split('@')[0] ?? fbUser.uid,
    name: fbUser.displayName ?? fbUser.email ?? fbUser.uid,
    role: isAdmin ? 'admin' : 'user',
    avatar: fbUser.photoURL ?? undefined,
    email: fbUser.email ?? undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (!fbUser.emailVerified) {
        await signOut(auth);
        setUser(null);
        setIsLoading(false);
        return;
      }
      const adminFlag = await resolveAdmin(fbUser);
      setUser(fbUserToUser(fbUser, adminFlag));
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    if (!fbUser.emailVerified) {
      await signOut(auth);
      throw new Error('E-mail não verificado. Por favor verifique seu e-mail antes de entrar.');
    }
    const adminFlag = await resolveAdmin(fbUser);
    setUser(fbUserToUser(fbUser, adminFlag));
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', isLoading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
