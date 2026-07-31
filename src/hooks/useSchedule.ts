import { useData } from '../context/DataContext';
import type { Status, ScheduleEvent } from '../types';
import { sortCollaborators } from '../lib/sortUtils';
import { isOnboardStatus, resolveDayStatus } from '../lib/scheduleEngine';

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

export function useSchedule(_currentMonth?: Date) {
  const { collaborators, turmas, events } = useData();
  const activeCollaborators = collaborators.filter((c) => c.active !== false);

  const buildGrid = (days: DayInfo[]) => {
    const grid: Record<string, Record<string, CellData>> = {};
    const pobCounts: Record<string, number> = {};

    days.forEach((d) => {
      pobCounts[d.dateStr] = 0;
    });

    const eventsByColab = new Map<string, ScheduleEvent[]>();
    for (const e of events) {
      const list = eventsByColab.get(e.collaboratorId);
      if (list) list.push(e);
      else eventsByColab.set(e.collaboratorId, [e]);
    }

    const sortedCollaborators = sortCollaborators(activeCollaborators, turmas);

    sortedCollaborators.forEach((colab) => {
      grid[colab.id] = {};
      const turma = turmas.find((t) => t.id === colab.turmaId);
      const colabEvents = eventsByColab.get(colab.id) || [];

      days.forEach((day) => {
        const resolved = resolveDayStatus(day.dateStr, colab, turma, colabEvents);

        grid[colab.id][day.dateStr] = {
          collaboratorId: colab.id,
          dateStr: day.dateStr,
          date: day.date,
          status: resolved.status,
          isOverride: !!resolved.event,
          event: resolved.event,
        };

        if (isOnboardStatus(resolved.status)) {
          pobCounts[day.dateStr]++;
        }
      });
    });

    return { grid, pobCounts, collaborators: sortedCollaborators };
  };

  return { buildGrid, turmas };
}
