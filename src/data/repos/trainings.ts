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
import { firestore } from '../firebase';
import type { TrainingRecord } from '../../domain/types';
import { handleFirestoreError, OperationType } from '../firestoreErrors';
import { logDebugMetric } from '../debug';

const COLLECTION_NAME = 'trainings';

export async function getTrainingsFromFirestore(): Promise<TrainingRecord[]> {
  const start = performance.now();
  try {
    const q = query(collection(firestore, COLLECTION_NAME));
    const snap = await getDocs(q);
    const list: TrainingRecord[] = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const formatTimestamp = (val: any): string => {
        if (!val) return new Date().toISOString();
        if (typeof val.toDate === 'function') return val.toDate().toISOString();
        return String(val);
      };

      list.push({
        id: docSnap.id,
        collaboratorId: String(data.collaboratorId || ''),
        courseName: String(data.courseName || ''),
        issueDate: String(data.issueDate || ''),
        expiryDate: String(data.expiryDate || ''),
        certificateNumber: data.certificateNumber ? String(data.certificateNumber) : undefined,
        note: data.note ? String(data.note) : undefined,
        updatedAt: formatTimestamp(data.updatedAt),
        version: typeof data.version === 'number' ? data.version : 1,
      });
    });

    logDebugMetric({
      operation: 'getTrainings',
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

export async function createTrainingInFirestore(training: TrainingRecord): Promise<TrainingRecord> {
  const start = performance.now();
  try {
    const docId = training.id || crypto.randomUUID();
    const payload = {
      ...training,
      id: docId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1,
    };

    const docRef = doc(firestore, COLLECTION_NAME, docId);
    await setDoc(docRef, payload, { merge: true });

    logDebugMetric({
      operation: 'createTraining',
      collection: COLLECTION_NAME,
      docId,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return { ...training, id: docId, updatedAt: new Date().toISOString(), version: 1 };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${training.id}`);
  }
}

export async function updateTrainingInFirestore(
  id: string,
  updates: Partial<TrainingRecord>
): Promise<TrainingRecord> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    const payload = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, payload);

    logDebugMetric({
      operation: 'updateTraining',
      collection: COLLECTION_NAME,
      docId: id,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return { id, ...updates, updatedAt: new Date().toISOString() } as TrainingRecord;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function deleteTrainingFromFirestore(id: string): Promise<boolean> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    logDebugMetric({
      operation: 'deleteTraining',
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
