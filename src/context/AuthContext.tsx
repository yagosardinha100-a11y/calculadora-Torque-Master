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
  setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'escala_offshore_official_session_v3';
const ALLOWED_EMAILS = [
  'odn1mecanicadept@gmail.com',
  'yago.sardinha100@gmail.com',
  'joubertribeir@gmail.com'
];

function isEmailAllowed(email?: string): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.some(allowed => allowed.toLowerCase() === email.trim().toLowerCase());
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('Error reading local auth state:', err);
    }
    return null;
  });

  useEffect(() => {
    // Client-side allowlist and role lookup:
    // Determines if user is admin by checking doc(firestore, 'admins', fbUser.uid) or ALLOWED_EMAILS list.
    // Real server-side security is strictly enforced by Firestore Security Rules (firestore.rules).
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (fbUser.email && !isEmailAllowed(fbUser.email)) {
          await firebaseSignOut(auth);
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          alert(`Acesso não autorizado para o e-mail: ${fbUser.email}. Este e-mail não possui permissão de acesso.`);
        } else {
          let role: UserRole = 'user';
          try {
            const adminDocRef = doc(firestore, 'admins', fbUser.uid);
            const adminDoc = await getDoc(adminDocRef);
            if (adminDoc.exists() || isEmailAllowed(fbUser.email)) {
              role = 'admin';
            }
          } catch (err) {
            // Fallback: If doc lookup fails or offline, use allowlist
            if (isEmailAllowed(fbUser.email)) {
              role = 'admin';
            }
          }

          const activeUser: User = {
            id: fbUser.uid,
            username: fbUser.email ? fbUser.email.split('@')[0] : 'usuario',
            name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Usuário Autenticado'),
            email: fbUser.email || undefined,
            avatar: fbUser.photoURL || undefined,
            role,
          };
          setUser(activeUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user && result.user.email && !isEmailAllowed(result.user.email)) {
        await firebaseSignOut(auth);
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        alert(`Acesso não autorizado para o e-mail: ${result.user.email}. Este e-mail não possui permissão de acesso.`);
      }
    } catch (err: any) {
      console.warn('Firebase Google Login error:', err);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Error signing out from Firebase:', err);
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const setUserRole = (role: UserRole) => {
    if (user) {
      const updated = { ...user, role };
      setUser(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        isLoading,
        loginWithGoogle,
        logout,
        setUserRole,
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
