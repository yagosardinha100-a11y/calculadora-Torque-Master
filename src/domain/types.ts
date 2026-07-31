export type Role =
  | 'Supervisor'
  | 'Chefe Mecânica'
  | 'Mecânico'
  | 'Assistente Mecânico'
  | 'Coordenador'
  | 'Outros';

export type Status =
  | 'Escala'
  | 'Dobra'
  | 'Folga'
  | 'Férias'
  | 'Treinamento'
  | 'Exame Médico'
  | 'No Show';

export interface Turma {
  id: string;
  name: string;
  baseDate: string; // ISO date string representing the first day of an "Escala" block
  updatedAt?: string;
  version?: number;
}

export interface Collaborator {
  id: string;
  name: string;
  role: Role;
  turmaId: string;
  active: boolean;
  startDate?: string; // Optional custom initial embarque date (YYYY-MM-DD)
  updatedAt?: string;
  version?: number;
}

export interface ScheduleEvent {
  id: string;
  collaboratorId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: Status;
  note?: string;
  motive?: string; // Motivo da dobra
  vacationPlanId?: string; // Optional reference to a VacationPlan
  updatedAt?: string;
  version?: number;
}

export type VacationType = 'FULL' | 'SELL_10' | 'SELL_ALL';

export interface VacationCoverage {
  id: string;
  collaboratorId: string; // The covering person (substituto)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  note?: string;
}

export interface VacationPlan {
  id: string;
  collaboratorId: string; // The person taking vacation
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'draft' | 'confirmed'; // 'draft' = Programado (Aguardando Confirmação), 'confirmed' = Confirmado & Lançado
  note?: string;
  coverages: VacationCoverage[];
  createdAt: string;
  updatedAt?: string;
  version?: number;
  vacationType?: VacationType;
  boardingStart?: string;
  boardingEnd?: string;
  soldDays?: number;
  requiresCoverageTurn1?: boolean;
  requiresCoverageTurn2?: boolean;
}

export interface TrainingRecord {
  id: string;
  collaboratorId: string;
  courseName: string; // e.g. CBSP, HUET, NR-33, NR-35, Caldeiras, etc.
  issueDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  certificateNumber?: string;
  note?: string;
  updatedAt?: string;
  version?: number;
}

