import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import type { AccessRole, Authorization } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

const COLLECTION_NAME = 'authorizations';

/**
 * Normalizes an e-mail into a stable Firestore document id. E-mails never
 * contain '/', so they are valid document ids after trimming/lower-casing.
 */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

function mapAuthorization(id: string, data: Record<string, unknown>): Authorization {
  return {
    email: String(data.email || id),
    role: (data.role as AccessRole) || 'viewer',
    name: data.name ? String(data.name) : undefined,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    createdBy: data.createdBy ? String(data.createdBy) : undefined,
  };
}

/** Reads the authorization record for a single e-mail (or null). */
export async function getAuthorization(
  email: string,
): Promise<Authorization | null> {
  try {
    const ref = doc(firestore, COLLECTION_NAME, emailKey(email));
    const snap = await getDoc(ref);
    return snap.exists() ? mapAuthorization(snap.id, snap.data()) : null;
  } catch (err) {
    // A permission error here simply means "no access" — do not crash login.
    console.warn('[getAuthorization] falha ao ler autorização:', err);
    return null;
  }
}

/** Lists every authorization record (editors only, enforced by rules). */
export async function listAuthorizations(): Promise<Authorization[]> {
  try {
    const snap = await getDocs(collection(firestore, COLLECTION_NAME));
    const list: Authorization[] = [];
    snap.forEach((d) => list.push(mapAuthorization(d.id, d.data())));
    return list.sort((a, b) => a.email.localeCompare(b.email));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, COLLECTION_NAME);
  }
}

/** Creates or updates an authorization for an e-mail. */
export async function setAuthorization(
  email: string,
  role: AccessRole,
  options?: { name?: string; createdBy?: string },
): Promise<Authorization> {
  try {
    const key = emailKey(email);
    const ref = doc(firestore, COLLECTION_NAME, key);
    const existing = await getDoc(ref);

    const payload = {
      email: key,
      role,
      name: options?.name ?? existing.data()?.name ?? '',
      createdBy: existing.data()?.createdBy ?? options?.createdBy ?? '',
      createdAt: existing.exists()
        ? existing.data()?.createdAt ?? serverTimestamp()
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, payload, { merge: true });
    return { email: key, role, name: payload.name };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${email}`);
  }
}

/** Removes an authorization, revoking that e-mail's access. */
export async function removeAuthorization(email: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, COLLECTION_NAME, emailKey(email)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${email}`);
  }
}
