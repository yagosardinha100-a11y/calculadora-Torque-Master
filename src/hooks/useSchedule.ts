import { useData } from '../context/DataContext';
import type { Status, Collaborator, Turma, ScheduleEvent } from '../types';
import { sortCollaborators } from '../lib/sortUtils';

export interface DayInfo {
  date: Date;
  dateStr: string;
}

export interface CellData {
  collaboratorId: string;
  dateStr: string;
  date: Date;
  status: Status;
  isOverride: boolean;
  event?: ScheduleEvent;
  currentCycleStartStr?: string;
  currentCycleEndStr?: string;
}

// Calculate exact days between two YYYY-MM-DD date strings safely
function getDaysDiff(targetDateStr: string, baseDateStr: string): number {
  const [y1, m1, d1] = targetDateStr.split('-').map(Number);
  const [y2, m2, d2] = baseDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

export function useSchedule(_currentMonth?: Date) {
  const { collaborators, turmas, events } = useData();
  const activeCollaborators = collaborators.filter(c => c.active !== false);

  // Helper to determine baseline 14x14 status
  const getBaselineStatus = (dateStr: string, colab: Collaborator, turma?: Turma): Status => {
    const baseDateStr = colab.startDate || turma?.baseDate;
    if (!baseDateStr) return 'Folga';

    const diff = getDaysDiff(dateStr, baseDateStr);
    const cycleDay = ((diff % 28) + 28) % 28;

    return cycleDay < 14 ? 'Escala' : 'Folga';
  };

  // Build grid data for a specific list of days with O(1) indexed lookup
  const buildGrid = (days: DayInfo[]) => {
    const grid: Record<string, Record<string, CellData>> = {};
    const pobCounts: Record<string, number> = {};

    days.forEach(d => {
      pobCounts[d.dateStr] = 0;
    });

    // Create an O(1) Map index of events grouped by collaboratorId
    const eventsByColab = new Map<string, ScheduleEvent[]>();
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const list = eventsByColab.get(e.collaboratorId);
      if (list) {
        list.push(e);
      } else {
        eventsByColab.set(e.collaboratorId, [e]);
      }
    }

    const sortedCollaborators = sortCollaborators(activeCollaborators, turmas);

    sortedCollaborators.forEach(colab => {
      grid[colab.id] = {};
      const turma = turmas.find(t => t.id === colab.turmaId);
      const colabEvents = eventsByColab.get(colab.id) || [];

      days.forEach(day => {
        const baseline = getBaselineStatus(day.dateStr, colab, turma);

        // Find matching events for this day
        let dayEvent: ScheduleEvent | undefined;
        for (let i = 0; i < colabEvents.length; i++) {
          const e = colabEvents[i];
          if (day.dateStr >= e.startDate && day.dateStr <= e.endDate) {
            // Priority ordering: Dobra / Férias / Atestado > No Show > Desembarque > Embarque
            if (!dayEvent) {
              dayEvent = e;
            } else if (e.status === 'Dobra' || e.status === 'Férias' || e.status === 'Treinamento') {
              dayEvent = e;
            }
          }
        }

        const status = dayEvent ? dayEvent.status : baseline;

        grid[colab.id][day.dateStr] = {
          collaboratorId: colab.id,
          dateStr: day.dateStr,
          date: day.date,
          status,
          isOverride: !!dayEvent,
          event: dayEvent,
        };

        // Increment POB if they are on board (Escala or Dobra)
        if (status === 'Escala' || status === 'Dobra') {
          pobCounts[day.dateStr]++;
        }
      });
    });

    return { grid, pobCounts, collaborators: sortedCollaborators };
  };

  return { buildGrid, turmas };
}
