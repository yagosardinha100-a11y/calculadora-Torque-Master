/** Domain layer — pure business logic, no React/Firebase */
export * from './types';
export * from './scheduleEngine';
export * from './vacationPublish';
export {
  getAlignedVacationOptions,
  alignVacationDates,
  calculateCoverageSlotsAndSuggestions,
  checkVacationAlignment,
  canRoleCover,
  normalizeRoleKey,
  formatDateBR,
  addDaysToStr,
  getCollaboratorCoverageScheduleDetails,
  type Vacation30DayOption,
  type CandidateRecommendation,
  type CoverageSlotSuggestion,
  type DailyCoverageDetail,
  type CollaboratorCoverageScheduleAnalysis,
} from './vacationUtils';
export * from './sortUtils';
export * from './turmaUtils';
