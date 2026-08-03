import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { AccessRole } from '../types';
import { getAuthorization } from '../services/users';

export interface User {
  id: string;
  username: string;
  name: string;
  /** Effective access role, or null when the account has no access granted. */
  role: AccessRole | null;
  avatar?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  /** True while the initial auth state is being resolved. */
  isLoading: boolean;
  /** True when a signed-in user has no access granted (not authorized). */
  accessDenied: boolean;
  isEditor: boolean;
  isViewer: boolean;
  /** Convenience flag: whether the current user can edit (== isEditor). */
  canEdit: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Bootstrap editors — e-mails that are always granted editor access, even
 * before any authorization document exists. This lets the first operator log
 * in and manage everyone else from the app. Mirror this list in
 * `firestore.rules` (function `isBootstrapEditor`).
 */
export const BOOTSTRAP_EDITORS: readonly string[] = [
  'odn1mecanicadept@gmail.com',
  'yago.sardinha100@gmail.com',
  'joubertribeir@gmail.com',
];

export function isBootstrapEditor(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return BOOTSTRAP_EDITORS.some((e) => e === normalized);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Align with firestore.rules: require a verified e-mail.
      if (!fbUser.emailVerified) {
        await firebaseSignOut(auth);
        setUser(null);
        setIsLoading(false);
        alert(
          'Seu e-mail ainda não está verificado. Confirme o e-mail da conta Google e tente novamente.',
        );
        return;
      }

      // Resolve the effective access role:
      // 1) Bootstrap editors are always editors.
      // 2) Otherwise look up the authorization record by e-mail.
      // 3) No record => no access (role null).
      let role: AccessRole | null = null;
      if (isBootstrapEditor(fbUser.email)) {
        role = 'editor';
      } else if (fbUser.email) {
        const authorization = await getAuthorization(fbUser.email);
        role = authorization?.role ?? null;
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
      await signInWithPopup(auth, provider);
      // Role resolution happens in onAuthStateChanged above.
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

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        accessDenied: Boolean(user) && role === null,
        isEditor: role === 'editor',
        isViewer: role === 'viewer' || role === 'editor',
        canEdit: role === 'editor',
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
