import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../lib/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
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

/** UX gate only — real security is firestore.rules */
const ALLOWED_EMAILS = [
  'odn1mecanicadept@gmail.com',
  'yago.sardinha100@gmail.com',
  'joubertribeir@gmail.com',
] as const;

function isEmailAllowed(email?: string | null): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.some((allowed) => allowed === email.trim().toLowerCase());
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  // Session comes ONLY from Firebase — never hydrate privileged state from localStorage
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Align with firestore.rules: email_verified == true
      if (!fbUser.emailVerified) {
        await firebaseSignOut(auth);
        setUser(null);
        setIsLoading(false);
        alert(
          'Seu e-mail ainda não está verificado. Confirme o e-mail da conta Google e tente novamente.',
        );
        return;
      }

      if (!isEmailAllowed(fbUser.email)) {
        await firebaseSignOut(auth);
        setUser(null);
        setIsLoading(false);
        alert(
          `Acesso não autorizado para o e-mail: ${fbUser.email}. Este e-mail não possui permissão de acesso.`,
        );
        return;
      }

      let role: UserRole = 'user';
      try {
        const adminDoc = await getDoc(doc(firestore, 'admins', fbUser.uid));
        // Document in /admins/{uid} is the preferred admin signal; allowlist is login UX only.
        // Until custom claims are set up, allowlisted emails still get admin for ops continuity.
        if (adminDoc.exists() || isEmailAllowed(fbUser.email)) {
          role = 'admin';
        }
      } catch {
        if (isEmailAllowed(fbUser.email)) role = 'admin';
      }

      setUser({
        id: fbUser.uid,
        username: fbUser.email ? fbUser.email.split('@')[0] : 'usuario',
        name:
          fbUser.displayName ||
          (fbUser.email ? fbUser.email.split('@')[0] : 'Usuário Autenticado'),
        email: fbUser.email || undefined,
        avatar: fbUser.photoURL || undefined,
        role,
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user?.email && !isEmailAllowed(result.user.email)) {
        await firebaseSignOut(auth);
        setUser(null);
        alert(
          `Acesso não autorizado para o e-mail: ${result.user.email}. Este e-mail não possui permissão de acesso.`,
        );
      }
    } catch (err) {
      console.warn('Firebase Google Login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Error signing out from Firebase:', err);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        isLoading,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
