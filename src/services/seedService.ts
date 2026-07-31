import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import type { Collaborator, ScheduleEvent, Turma } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { logDebugMetric } from '../lib/debugLogger';

const BASE_INITIAL_TIMESTAMP = '2026-08-01T00:00:00.000Z';

const INITIAL_TURMAS: Turma[] = [
  { id: 'turma-a', name: 'Turma A', baseDate: '2026-08-01', updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'turma-b', name: 'Turma B', baseDate: '2026-08-06', updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'turma-c', name: 'Turma C', baseDate: '2026-08-07', updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'turma-d', name: 'Turma D', baseDate: '2026-08-14', updatedAt: BASE_INITIAL_TIMESTAMP },
];

const INITIAL_COLLABORATORS: Collaborator[] = [
  { id: 'colab-1', name: 'JOUBERT PEIXOTO RIBEIRO', role: 'Supervisor', turmaId: 'turma-a', startDate: '2026-08-01', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'colab-2', name: 'MARCELO DE ARAÚJO GALLO', role: 'Supervisor', turmaId: 'turma-a', startDate: '2026-08-15', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'colab-3', name: 'AGNALDO DOS SANTOS SOUZA', role: 'Chefe Mecânica', turmaId: 'turma-b', startDate: '2026-08-06', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'colab-4', name: 'YAGO SARDINHA DE A. BRANCO', role: 'Chefe Mecânica', turmaId: 'turma-b', startDate: '2026-08-06', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'colab-5', name: 'THIAGO RIBEIRO C. ALMEIDA', role: 'Mecânico', turmaId: 'turma-a', startDate: '2026-08-01', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'colab-6', name: 'RENATO A. DOS SANTOS MELLO', role: 'Mecânico', turmaId: 'turma-a', startDate: '2026-08-01', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'colab-7', name: 'EDUARDO BARBOSA SANTOS', role: 'Mecânico', turmaId: 'turma-a', startDate: '2026-08-01', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'colab-8', name: 'EMERSON FELIX', role: 'Assistente Mecânico', turmaId: 'turma-a', startDate: '2026-08-01', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'colab-9', name: 'RODOLPHO GOUYEA ARAÚJO', role: 'Mecânico', turmaId: 'turma-c', startDate: '2026-08-07', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'colab-10', name: 'ROBSON FARIAS DIAS', role: 'Mecânico', turmaId: 'turma-c', startDate: '2026-08-07', active: true, updatedAt: BASE_INITIAL_TIMESTAMP },
];

const INITIAL_EVENTS: ScheduleEvent[] = [
  { id: 'event-yago-ferias', collaboratorId: 'colab-4', startDate: '2026-08-13', endDate: '2026-08-19', status: 'Férias', note: 'Férias programadas', updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'event-thiago-noshow', collaboratorId: 'colab-5', startDate: '2026-08-12', endDate: '2026-08-13', status: 'No Show', note: 'Falta / Não embarcou', updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'event-eduardo-noshow', collaboratorId: 'colab-7', startDate: '2026-08-11', endDate: '2026-08-11', status: 'No Show', note: 'Falta / Não embarcou', updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'event-rodolpho-noshow', collaboratorId: 'colab-9', startDate: '2026-08-11', endDate: '2026-08-11', status: 'No Show', note: 'Falta / Não embarcou', updatedAt: BASE_INITIAL_TIMESTAMP },
  { id: 'event-robson-noshow', collaboratorId: 'colab-10', startDate: '2026-08-14', endDate: '2026-08-14', status: 'No Show', note: 'Falta / Não embarcou', updatedAt: BASE_INITIAL_TIMESTAMP },
];

export async function seedFirestoreIfEmpty(): Promise<void> {
  const start = performance.now();
  try {
    const colabSnap = await getDocs(collection(firestore, 'collaborators'));
    if (!colabSnap.empty) {
      logDebugMetric({
        operation: 'Seed Check',
        collection: 'collaborators',
        durationMs: performance.now() - start,
        source: 'server',
        details: 'Database already populated. Seeding skipped.',
      });
      return;
    }

    console.log('🌱 Initializing Firestore with default scale data...');
    const batch = writeBatch(firestore);
    const nowIso = new Date().toISOString();

    for (const t of INITIAL_TURMAS) {
      batch.set(doc(firestore, 'turmas', t.id), {
        ...t,
        createdAt: nowIso,
        updatedAt: nowIso,
        version: 1,
      });
    }

    for (const c of INITIAL_COLLABORATORS) {
      batch.set(doc(firestore, 'collaborators', c.id), {
        ...c,
        createdAt: nowIso,
        updatedAt: nowIso,
        version: 1,
      });
    }

    for (const e of INITIAL_EVENTS) {
      batch.set(doc(firestore, 'events', e.id), {
        ...e,
        createdAt: nowIso,
        updatedAt: nowIso,
        version: 1,
      });
    }

    await batch.commit();

    logDebugMetric({
      operation: 'Initial Seed Commit',
      collection: 'all',
      durationMs: performance.now() - start,
      source: 'server',
      details: 'Seeded initial turmas, collaborators, and events.',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'seed');
  }
}
