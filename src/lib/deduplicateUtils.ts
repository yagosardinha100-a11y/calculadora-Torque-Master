import type { Collaborator } from '../types';
import {
  getCollaboratorsFromFirestore,
  deleteCollaboratorFromFirestore,
} from '../services/collaborators';
import { getEventsFromFirestore, updateEventInFirestore } from '../services/events';
import { getVacationsFromFirestore, updateVacationInFirestore } from '../services/vacations';
import { getTrainingsFromFirestore, updateTrainingInFirestore } from '../services/trainings';

export function normalizeName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

export async function deduplicateCollaborators(): Promise<Collaborator[]> {
  try {
    const allCollaborators = await getCollaboratorsFromFirestore();
    if (!allCollaborators || allCollaborators.length === 0) return [];

    const grouped = new Map<string, Collaborator[]>();
    for (const c of allCollaborators) {
      const key = normalizeName(c.name);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(c);
    }

    const cleanedCollaborators: Collaborator[] = [];
    const duplicateIdsToDelete: string[] = [];

    const allEvents = await getEventsFromFirestore();
    const allVacations = await getVacationsFromFirestore();
    const allTrainings = await getTrainingsFromFirestore();

    for (const [, list] of grouped) {
      if (list.length === 1) {
        cleanedCollaborators.push(list[0]);
        continue;
      }

      const sorted = [...list].sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;

        const aIsStandard = a.id.startsWith('colab-');
        const bIsStandard = b.id.startsWith('colab-');
        if (aIsStandard && !bIsStandard) return -1;
        if (!aIsStandard && bIsStandard) return 1;

        return 0;
      });

      const primary = sorted[0];
      cleanedCollaborators.push(primary);

      const duplicates = sorted.slice(1);
      for (const dup of duplicates) {
        duplicateIdsToDelete.push(dup.id);

        const dupEvents = allEvents.filter(e => e.collaboratorId === dup.id);
        for (const evt of dupEvents) {
          await updateEventInFirestore(evt.id, { collaboratorId: primary.id });
        }

        const dupVacations = allVacations.filter(v => v.collaboratorId === dup.id);
        for (const vac of dupVacations) {
          await updateVacationInFirestore(vac.id, { collaboratorId: primary.id });
        }

        const dupTrainings = allTrainings.filter(t => t.collaboratorId === dup.id);
        for (const tr of dupTrainings) {
          await updateTrainingInFirestore(tr.id, { collaboratorId: primary.id });
        }

        await deleteCollaboratorFromFirestore(dup.id);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      console.log(`🧹 Deduplicated ${duplicateIdsToDelete.length} redundant collaborator records in Firestore.`);
    }

    return cleanedCollaborators;
  } catch (err) {
    console.error('Error during deduplication of collaborators:', err);
    return [];
  }
}
