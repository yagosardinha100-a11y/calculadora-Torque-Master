import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import type { Collaborator } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { logDebugMetric } from '../lib/debugLogger';

const COLLECTION_NAME = 'collaborators';

export async function getCollaboratorsFromFirestore(): Promise<Collaborator[]> {
  const start = performance.now();
  try {
    const q = query(collection(firestore, COLLECTION_NAME), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    const list: Collaborator[] = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        name: String(data.name || ''),
        role: data.role || 'Mecânico',
        turmaId: String(data.turmaId || ''),
        active: data.active !== false,
        startDate: data.startDate ? String(data.startDate) : undefined,
        updatedAt: String(data.updatedAt || new Date().toISOString()),
        version: typeof data.version === 'number' ? data.version : 1,
      });
    });

    logDebugMetric({
      operation: 'getCollaborators',
      collection: COLLECTION_NAME,
      durationMs: performance.now() - start,
      source: snap.metadata.fromCache ? 'cache' : 'server',
      details: { count: list.length },
    });

    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, COLLECTION_NAME);
  }
}

export async function createCollaboratorInFirestore(colab: Collaborator): Promise<Collaborator> {
  const start = performance.now();
  try {
    const docId = colab.id || crypto.randomUUID();
    const payload = {
      ...colab,
      id: docId,
      active: colab.active !== false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1,
    };

    const docRef = doc(firestore, COLLECTION_NAME, docId);
    await setDoc(docRef, payload, { merge: true });

    logDebugMetric({
      operation: 'createCollaborator',
      collection: COLLECTION_NAME,
      docId,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return { ...colab, id: docId, active: colab.active !== false, updatedAt: new Date().toISOString(), version: 1 };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${colab.id}`);
  }
}

export async function updateCollaboratorInFirestore(
  id: string,
  updates: Partial<Collaborator>
): Promise<Collaborator> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error(`Collaborator with ID ${id} not found.`);
    }

    const currentData = snap.data();
    const currentVersion = typeof currentData.version === 'number' ? currentData.version : 1;

    const newPayload = {
      ...updates,
      updatedAt: serverTimestamp(),
      version: currentVersion + 1,
    };

    await updateDoc(docRef, newPayload);

    logDebugMetric({
      operation: 'updateCollaborator',
      collection: COLLECTION_NAME,
      docId: id,
      durationMs: performance.now() - start,
      source: 'server',
      details: updates,
    });

    return {
      ...currentData,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: currentVersion + 1,
      id,
    } as Collaborator;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function deleteCollaboratorFromFirestore(id: string): Promise<boolean> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    logDebugMetric({
      operation: 'deleteCollaborator',
      collection: COLLECTION_NAME,
      docId: id,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}
