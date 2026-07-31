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
import type { ScheduleEvent, Status } from '../../domain/types';
import { handleFirestoreError, OperationType } from '../firestoreErrors';
import { logDebugMetric } from '../debug';

const COLLECTION_NAME = 'events';

export async function getEventsFromFirestore(): Promise<ScheduleEvent[]> {
  const start = performance.now();
  try {
    const q = query(collection(firestore, COLLECTION_NAME));
    const snap = await getDocs(q);
    const list: ScheduleEvent[] = [];

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
        startDate: String(data.startDate || ''),
        endDate: String(data.endDate || ''),
        status: (data.status as Status) || 'Escala',
        note: data.note ? String(data.note) : undefined,
        motive: data.motive ? String(data.motive) : undefined,
        vacationPlanId: data.vacationPlanId ? String(data.vacationPlanId) : undefined,
        updatedAt: formatTimestamp(data.updatedAt),
        version: typeof data.version === 'number' ? data.version : 1,
      });
    });

    logDebugMetric({
      operation: 'getEvents',
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

export async function createEventInFirestore(evt: ScheduleEvent): Promise<ScheduleEvent> {
  const start = performance.now();
  try {
    const docId = evt.id || crypto.randomUUID();
    const payload = {
      ...evt,
      id: docId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1,
    };

    const docRef = doc(firestore, COLLECTION_NAME, docId);
    await setDoc(docRef, payload, { merge: true });

    logDebugMetric({
      operation: 'createEvent',
      collection: COLLECTION_NAME,
      docId,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return { ...evt, id: docId, updatedAt: new Date().toISOString(), version: 1 };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${evt.id}`);
  }
}

export async function updateEventInFirestore(
  id: string,
  updates: Partial<ScheduleEvent>
): Promise<ScheduleEvent> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    const payload = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, payload);

    logDebugMetric({
      operation: 'updateEvent',
      collection: COLLECTION_NAME,
      docId: id,
      durationMs: performance.now() - start,
      source: 'server',
    });

    return { id, ...updates, updatedAt: new Date().toISOString() } as ScheduleEvent;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
}

export async function deleteEventFromFirestore(id: string): Promise<boolean> {
  const start = performance.now();
  try {
    const docRef = doc(firestore, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    logDebugMetric({
      operation: 'deleteEvent',
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
