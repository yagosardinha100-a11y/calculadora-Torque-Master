import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import type { Turma } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { logDebugMetric } from '../lib/debugLogger';

const COLLECTION_NAME = 'turmas';

export async function getTurmasFromFirestore(): Promise<Turma[]> {
  const start = performance.now();
  try {
    const q = query(collection(firestore, COLLECTION_NAME), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    const list: Turma[] = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const formatTimestamp = (val: any): string => {
        if (!val) return new Date().toISOString();
        if (typeof val.toDate === 'function') return val.toDate().toISOString();
        return String(val);
      };
      list.push({
        id: docSnap.id,
        name: String(data.name || ''),
        baseDate: String(data.baseDate || ''),
        updatedAt: formatTimestamp(data.updatedAt),
        version: typeof data.version === 'number' ? data.version : 1,
      });
    });

    logDebugMetric({
      operation: 'getTurmas',
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

export async function createTurmaInFirestore(turma: Turma): Promise<Turma> {
  const start = performance.now();
  try {
    const docId = turma.id || `turma-${crypto.randomUUID().slice(0, 8)}`;
    const payload = {
      ...turma,
      id: docId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1,
    };

    const docRef = doc(firestore, COLLECTION_NAME, docId);
    await setDoc(docRef, payload, { merge: true });

    logDebugMetric({
      operation: 'createTurma',
      collection: COLLECTION_NAME,
      docId,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return { ...turma, id: docId, updatedAt: new Date().toISOString(), version: 1 };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${turma.id}`);
  }
}

export async function updateTurmaInFirestore(id: string, updates: Partial<Turma>): Promise<Turma> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    const payload = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, payload);

    logDebugMetric({
      operation: 'updateTurma',
      collection: COLLECTION_NAME,
      docId: id,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return { id, ...updates, updatedAt: new Date().toISOString() } as Turma;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function deleteTurmaFromFirestore(id: string): Promise<boolean> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    logDebugMetric({
      operation: 'deleteTurma',
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
