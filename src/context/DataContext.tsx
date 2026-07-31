import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { firestore, auth } from '../lib/firebase';
import type { Collaborator, ScheduleEvent, Turma, VacationPlan, TrainingRecord, Status } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { seedFirestoreIfEmpty } from '../services/seedService';
import {
  createCollaboratorInFirestore,
  updateCollaboratorInFirestore,
  deleteCollaboratorFromFirestore,
} from '../services/collaborators';
import {
  createTurmaInFirestore,
  updateTurmaInFirestore,
  deleteTurmaFromFirestore,
} from '../services/teams';
import {
  createEventInFirestore,
  updateEventInFirestore,
  deleteEventFromFirestore,
} from '../services/events';
import {
  createVacationInFirestore,
  updateVacationInFirestore,
  deleteVacationFromFirestore,
} from '../services/vacations';
import {
  createTrainingInFirestore,
  deleteTrainingFromFirestore,
} from '../services/trainings';

interface DataContextType {
  collaborators: Collaborator[];
  turmas: Turma[];
  events: ScheduleEvent[];
  vacations: VacationPlan[];
  trainings: TrainingRecord[];
  loading: boolean;
  error: string | null;

  // Collaborator Mutations
  addCollaborator: (colab: Omit<Collaborator, 'id'> & { id?: string }) => Promise<Collaborator>;
  updateCollaborator: (id: string, updates: Partial<Collaborator>) => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;

  // Event Mutations
  addEvent: (event: Omit<ScheduleEvent, 'id'> & { id?: string }) => Promise<ScheduleEvent>;
  updateEvent: (id: string, updates: Partial<ScheduleEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Turma Mutations
  addTurma: (turma: Omit<Turma, 'id'> & { id?: string }) => Promise<Turma>;
  updateTurma: (id: string, updates: Partial<Turma>) => Promise<void>;
  deleteTurma: (id: string) => Promise<void>;

  // Vacation Mutations
  saveVacationPlan: (
    plan: Omit<VacationPlan, 'status' | 'createdAt'> & { status?: 'draft' | 'confirmed'; id?: string }
  ) => Promise<string>;
  confirmVacationPlan: (planId: string) => Promise<void>;
  unconfirmVacationPlan: (planId: string) => Promise<void>;
  deleteVacationPlan: (planId: string) => Promise<void>;

  // Training Mutations
  addTraining: (record: Omit<TrainingRecord, 'id'> & { id?: string }) => Promise<TrainingRecord>;
  deleteTraining: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [vacations, setVacations] = useState<VacationPlan[]>([]);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up single realtime listeners for all 5 collections
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const formatTimestamp = (val: any): string => {
      if (!val) return new Date().toISOString();
      if (typeof val.toDate === 'function') return val.toDate().toISOString();
      return String(val);
    };

    const authUnsub = onAuthStateChanged(auth, fbUser => {
      // Clean up previous listeners
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      if (!fbUser) {
        setCollaborators([]);
        setTurmas([]);
        setEvents([]);
        setVacations([]);
        setTrainings([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1. Turmas Listener
      const qTurmas = query(collection(firestore, 'turmas'), orderBy('name', 'asc'));
      const unsubTurmas = onSnapshot(
        qTurmas,
        snapshot => {
          const list: Turma[] = [];
          snapshot.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              name: String(data.name || ''),
              baseDate: String(data.baseDate || ''),
              updatedAt: formatTimestamp(data.updatedAt),
              version: typeof data.version === 'number' ? data.version : 1,
            });
          });
          setTurmas(list);
        },
        err => {
          console.error('🔥 [Turmas Listener Error]:', err);
          setError('Erro de escuta em tempo real para Turmas.');
        }
      );
      unsubs.push(unsubTurmas);

      // 2. Collaborators Listener
      const qColabs = query(collection(firestore, 'collaborators'), orderBy('name', 'asc'));
      const unsubColabs = onSnapshot(
        qColabs,
        snapshot => {
          const list: Collaborator[] = [];
          snapshot.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              name: String(data.name || ''),
              role: data.role || 'Mecânico',
              turmaId: String(data.turmaId || ''),
              active: data.active !== false,
              startDate: data.startDate ? String(data.startDate) : undefined,
              updatedAt: formatTimestamp(data.updatedAt),
              version: typeof data.version === 'number' ? data.version : 1,
            });
          });
          setCollaborators(list);
        },
        err => {
          console.error('🔥 [Collaborators Listener Error]:', err);
          setError('Erro de escuta em tempo real para Colaboradores.');
        }
      );
      unsubs.push(unsubColabs);

      // 3. Events Listener
      const qEvents = collection(firestore, 'events');
      const unsubEvents = onSnapshot(
        qEvents,
        snapshot => {
          const list: ScheduleEvent[] = [];
          snapshot.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
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
          setEvents(list);
        },
        err => {
          console.error('🔥 [Events Listener Error]:', err);
          setError('Erro de escuta em tempo real para Eventos.');
        }
      );
      unsubs.push(unsubEvents);

      // 4. Vacations Listener
      const qVacations = collection(firestore, 'vacations');
      const unsubVacations = onSnapshot(
        qVacations,
        snapshot => {
          const list: VacationPlan[] = [];
          snapshot.forEach(d => {
            const data = d.data();
            let coverages = data.coverages;
            if (typeof coverages === 'string') {
              try { coverages = JSON.parse(coverages); } catch { coverages = []; }
            }
            list.push({
              id: d.id,
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
          setVacations(list);
        },
        err => {
          console.error('🔥 [Vacations Listener Error]:', err);
          setError('Erro de escuta em tempo real para Férias.');
        }
      );
      unsubs.push(unsubVacations);

      // 5. Trainings Listener
      const qTrainings = collection(firestore, 'trainings');
      const unsubTrainings = onSnapshot(
        qTrainings,
        snapshot => {
          const list: TrainingRecord[] = [];
          snapshot.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
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
          setTrainings(list);
          setLoading(false);
        },
        err => {
          console.error('🔥 [Trainings Listener Error]:', err);
          setError('Erro de escuta em tempo real para Treinamentos.');
          setLoading(false);
        }
      );
      unsubs.push(unsubTrainings);
    });

    return () => {
      authUnsub();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  // --- COLLABORATOR MUTATIONS ---
  const addCollaborator = useCallback(
    async (colab: Omit<Collaborator, 'id'> & { id?: string }): Promise<Collaborator> => {
      const id = colab.id || crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const newColab: Collaborator = {
        ...colab,
        id,
        active: colab.active !== false,
        updatedAt: nowIso,
      };

      // Optimistic UI update
      setCollaborators(prev => [...prev.filter(c => c.id !== id), newColab]);

      try {
        return await createCollaboratorInFirestore(newColab);
      } catch (err) {
        // Rollback
        setCollaborators(prev => prev.filter(c => c.id !== id));
        throw err;
      }
    },
    []
  );

  const updateCollaborator = useCallback(
    async (id: string, updates: Partial<Collaborator>): Promise<void> => {
      const prevList = [...collaborators];
      const nowIso = new Date().toISOString();

      // Optimistic update
      setCollaborators(prev =>
        prev.map(c => (c.id === id ? { ...c, ...updates, updatedAt: nowIso } : c))
      );

      try {
        await updateCollaboratorInFirestore(id, updates);
      } catch (err) {
        setCollaborators(prevList);
        throw err;
      }
    },
    [collaborators]
  );

  const deleteCollaborator = useCallback(
    async (id: string): Promise<void> => {
      const prevColabs = [...collaborators];
      const prevEvents = [...events];
      const prevVacations = [...vacations];
      const prevTrainings = [...trainings];

      // Optimistic update
      setCollaborators(prev => prev.filter(c => c.id !== id));
      setEvents(prev => prev.filter(e => e.collaboratorId !== id));
      setVacations(prev => prev.filter(v => v.collaboratorId !== id));
      setTrainings(prev => prev.filter(t => t.collaboratorId !== id));

      try {
        await deleteCollaboratorFromFirestore(id);

        // Clean up linked events/vacations/trainings
        const linkedEvents = prevEvents.filter(e => e.collaboratorId === id);
        const linkedVacations = prevVacations.filter(v => v.collaboratorId === id);
        const linkedTrainings = prevTrainings.filter(t => t.collaboratorId === id);

        const batch = writeBatch(firestore);
        linkedEvents.forEach(e => batch.delete(doc(firestore, 'events', e.id)));
        linkedVacations.forEach(v => batch.delete(doc(firestore, 'vacations', v.id)));
        linkedTrainings.forEach(t => batch.delete(doc(firestore, 'trainings', t.id)));

        await batch.commit();
      } catch (err) {
        // Rollback
        setCollaborators(prevColabs);
        setEvents(prevEvents);
        setVacations(prevVacations);
        setTrainings(prevTrainings);
        throw err;
      }
    },
    [collaborators, events, vacations, trainings]
  );

  // --- EVENT MUTATIONS ---
  const addEvent = useCallback(
    async (evt: Omit<ScheduleEvent, 'id'> & { id?: string }): Promise<ScheduleEvent> => {
      const id = evt.id || crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const newEvt: ScheduleEvent = {
        ...evt,
        id,
        updatedAt: nowIso,
      };

      setEvents(prev => [...prev.filter(e => e.id !== id), newEvt]);

      try {
        return await createEventInFirestore(newEvt);
      } catch (err) {
        setEvents(prev => prev.filter(e => e.id !== id));
        throw err;
      }
    },
    []
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<ScheduleEvent>): Promise<void> => {
      const prevList = [...events];
      const nowIso = new Date().toISOString();

      setEvents(prev =>
        prev.map(e => (e.id === id ? { ...e, ...updates, updatedAt: nowIso } : e))
      );

      try {
        await updateEventInFirestore(id, updates);
      } catch (err) {
        setEvents(prevList);
        throw err;
      }
    },
    [events]
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<void> => {
      const prevList = [...events];
      setEvents(prev => prev.filter(e => e.id !== id));

      try {
        await deleteEventFromFirestore(id);
      } catch (err) {
        setEvents(prevList);
        throw err;
      }
    },
    [events]
  );

  // --- TURMA MUTATIONS ---
  const addTurma = useCallback(
    async (turma: Omit<Turma, 'id'> & { id?: string }): Promise<Turma> => {
      const id = turma.id || `turma-${crypto.randomUUID().slice(0, 8)}`;
      const nowIso = new Date().toISOString();
      const newTurma: Turma = { ...turma, id, updatedAt: nowIso };

      setTurmas(prev => [...prev.filter(t => t.id !== id), newTurma]);

      try {
        return await createTurmaInFirestore(newTurma);
      } catch (err) {
        setTurmas(prev => prev.filter(t => t.id !== id));
        throw err;
      }
    },
    []
  );

  const updateTurma = useCallback(
    async (id: string, updates: Partial<Turma>): Promise<void> => {
      const prevList = [...turmas];
      const nowIso = new Date().toISOString();

      setTurmas(prev =>
        prev.map(t => (t.id === id ? { ...t, ...updates, updatedAt: nowIso } : t))
      );

      try {
        await updateTurmaInFirestore(id, updates);
      } catch (err) {
        setTurmas(prevList);
        throw err;
      }
    },
    [turmas]
  );

  const deleteTurma = useCallback(
    async (id: string): Promise<void> => {
      const prevList = [...turmas];
      setTurmas(prev => prev.filter(t => t.id !== id));

      try {
        await deleteTurmaFromFirestore(id);
      } catch (err) {
        setTurmas(prevList);
        throw err;
      }
    },
    [turmas]
  );

  // --- VACATION MUTATIONS ---
  const removeVacationEventsFromSchedule = async (planId: string) => {
    const eventsToDelete = events.filter(e => e.vacationPlanId === planId);
    if (eventsToDelete.length > 0) {
      const batch = writeBatch(firestore);
      eventsToDelete.forEach(e => batch.delete(doc(firestore, 'events', e.id)));
      await batch.commit();
      setEvents(prev => prev.filter(e => e.vacationPlanId !== planId));
    }
  };

  const publishVacationEventsToSchedule = async (plan: VacationPlan) => {
    await removeVacationEventsFromSchedule(plan.id);

    const vacationer = collaborators.find(c => c.id === plan.collaboratorId);
    const vacationerName = vacationer ? vacationer.name : 'Colaborador';
    const nowIso = new Date().toISOString();

    const newEvents: ScheduleEvent[] = [];

    // For SELL_ALL, we don't create an event for the titular
    if (plan.vacationType !== 'SELL_ALL') {
      let absenceStart = plan.startDate;
      if (plan.vacationType === 'SELL_10' && plan.boardingEnd) {
        // The absence starts the day after the initial boarding ends
        absenceStart = new Date(new Date(plan.boardingEnd).getTime() + 86400000).toISOString().split('T')[0];
      }

      newEvents.push({
        id: `event-vacation-${plan.id}`,
        collaboratorId: plan.collaboratorId,
        startDate: absenceStart,
        endDate: plan.endDate,
        status: 'Férias',
        note: plan.note ? `Férias: ${plan.note}` : 'Férias Programadas',
        vacationPlanId: plan.id,
        updatedAt: nowIso,
      });
    }

    plan.coverages.forEach((cov, idx) => {
      if (cov.collaboratorId && cov.startDate && cov.endDate) {
        newEvents.push({
          id: `event-cov-${plan.id}-${idx}`,
          collaboratorId: cov.collaboratorId,
          startDate: cov.startDate,
          endDate: cov.endDate,
          status: 'Dobra',
          motive: `Cobertura de Férias de ${vacationerName}`,
          note: cov.note || `Dobra para Cobertura de Férias (${vacationerName})`,
          vacationPlanId: plan.id,
          updatedAt: nowIso,
        });
      }
    });

    const batch = writeBatch(firestore);
    newEvents.forEach(e =>
      batch.set(
        doc(firestore, 'events', e.id),
        { ...e, updatedAt: serverTimestamp() },
        { merge: true }
      )
    );
    await batch.commit();

    setEvents(prev => [...prev.filter(e => e.vacationPlanId !== plan.id), ...newEvents]);
  };

  const saveVacationPlan = useCallback(
    async (
      data: Omit<VacationPlan, 'status' | 'createdAt'> & { status?: 'draft' | 'confirmed'; id?: string }
    ): Promise<string> => {
      const planId = data.id || crypto.randomUUID();
      const existing = vacations.find(v => v.id === planId);
      const nowIso = new Date().toISOString();

      const plan: VacationPlan = {
        id: planId,
        collaboratorId: data.collaboratorId,
        startDate: data.startDate,
        endDate: data.endDate,
        note: data.note || '',
        coverages: data.coverages || [],
        status: data.status || existing?.status || 'draft',
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      setVacations(prev => [...prev.filter(v => v.id !== planId), plan]);

      if (existing) {
        await updateVacationInFirestore(plan.id, plan);
      } else {
        await createVacationInFirestore(plan);
      }

      if (plan.status === 'confirmed') {
        await publishVacationEventsToSchedule(plan);
      } else {
        await removeVacationEventsFromSchedule(plan.id);
      }

      return planId;
    },
    [vacations, collaborators, events]
  );

  const confirmVacationPlan = useCallback(
    async (planId: string): Promise<void> => {
      const plan = vacations.find(v => v.id === planId);
      if (!plan) return;

      const updatedPlan: VacationPlan = { ...plan, status: 'confirmed', updatedAt: new Date().toISOString() };
      setVacations(prev => prev.map(v => (v.id === planId ? updatedPlan : v)));

      await updateVacationInFirestore(planId, { status: 'confirmed' });
      await publishVacationEventsToSchedule(updatedPlan);
    },
    [vacations, collaborators, events]
  );

  const unconfirmVacationPlan = useCallback(
    async (planId: string): Promise<void> => {
      const plan = vacations.find(v => v.id === planId);
      if (!plan) return;

      const updatedPlan: VacationPlan = { ...plan, status: 'draft', updatedAt: new Date().toISOString() };
      setVacations(prev => prev.map(v => (v.id === planId ? updatedPlan : v)));

      await updateVacationInFirestore(planId, { status: 'draft' });
      await removeVacationEventsFromSchedule(planId);
    },
    [vacations, events]
  );

  const deleteVacationPlan = useCallback(
    async (planId: string): Promise<void> => {
      const prevVacations = [...vacations];

      setVacations(prev => prev.filter(v => v.id !== planId));
      await removeVacationEventsFromSchedule(planId);

      try {
        await deleteVacationFromFirestore(planId);
      } catch (err) {
        setVacations(prevVacations);
        throw err;
      }
    },
    [vacations, events]
  );

  // --- TRAINING MUTATIONS ---
  const addTraining = useCallback(
    async (record: Omit<TrainingRecord, 'id'> & { id?: string }): Promise<TrainingRecord> => {
      const id = record.id || crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const newRecord: TrainingRecord = { ...record, id, updatedAt: nowIso };

      setTrainings(prev => [...prev.filter(t => t.id !== id), newRecord]);

      try {
        return await createTrainingInFirestore(newRecord);
      } catch (err) {
        setTrainings(prev => prev.filter(t => t.id !== id));
        throw err;
      }
    },
    []
  );

  const deleteTraining = useCallback(
    async (id: string): Promise<void> => {
      const prevList = [...trainings];
      setTrainings(prev => prev.filter(t => t.id !== id));

      try {
        await deleteTrainingFromFirestore(id);
      } catch (err) {
        setTrainings(prevList);
        throw err;
      }
    },
    [trainings]
  );

  return (
    <DataContext.Provider
      value={{
        collaborators,
        turmas,
        events,
        vacations,
        trainings,
        loading,
        error,

        addCollaborator,
        updateCollaborator,
        deleteCollaborator,

        addEvent,
        updateEvent,
        deleteEvent,

        addTurma,
        updateTurma,
        deleteTurma,

        saveVacationPlan,
        confirmVacationPlan,
        unconfirmVacationPlan,
        deleteVacationPlan,

        addTraining,
        deleteTraining,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
