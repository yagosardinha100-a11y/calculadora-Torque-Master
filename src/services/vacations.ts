import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import type { VacationPlan } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { logDebugMetric } from '../lib/debugLogger';

const COLLECTION_NAME = 'vacations';

export async function getVacationsFromFirestore(): Promise<VacationPlan[]> {
  const start = performance.now();
  try {
    const q = query(collection(firestore, COLLECTION_NAME));
    const snap = await getDocs(q);
    const list: VacationPlan[] = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      let coverages = data.coverages;
      if (typeof coverages === 'string') {
        try {
          coverages = JSON.parse(coverages);
        } catch {
          coverages = [];
        }
      }

      const formatTimestamp = (val: any): string => {
        if (!val) return new Date().toISOString();
        if (typeof val.toDate === 'function') return val.toDate().toISOString();
        return String(val);
      };

      list.push({
        id: docSnap.id,
        collaboratorId: String(data.collaboratorId || ''),
        startDate: String(data.startDate || ''),
        endDate: String(data.endDate || ''),
        status: (data.status as VacationPlan['status']) || 'draft',
        note: data.note ? String(data.note) : undefined,
        coverages: Array.isArray(coverages) ? coverages : [],
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
        version: typeof data.version === 'number' ? data.version : 1,
      });
    });

    logDebugMetric({
      operation: 'getVacations',
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

export async function createVacationInFirestore(plan: VacationPlan): Promise<VacationPlan> {
  const start = performance.now();
  try {
    const docId = plan.id || crypto.randomUUID();
    const payload = {
      ...plan,
      id: docId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1,
    };

    const docRef = doc(firestore, COLLECTION_NAME, docId);
    await setDoc(docRef, payload, { merge: true });

    logDebugMetric({
      operation: 'createVacation',
      collection: COLLECTION_NAME,
      docId,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return { ...plan, id: docId, updatedAt: new Date().toISOString(), version: 1 };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${plan.id}`);
  }
}

export async function updateVacationInFirestore(
  id: string,
  updates: Partial<VacationPlan>
): Promise<VacationPlan> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    const payload = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, payload);

    logDebugMetric({
      operation: 'updateVacation',
      collection: COLLECTION_NAME,
      docId: id,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return { id, ...updates, updatedAt: new Date().toISOString() } as VacationPlan;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function deleteVacationFromFirestore(id: string): Promise<boolean> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    logDebugMetric({
      operation: 'deleteVacation',
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
