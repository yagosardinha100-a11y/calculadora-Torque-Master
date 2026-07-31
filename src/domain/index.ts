/** Domain layer — pure business logic, no React/Firebase */
export * from './types';
export * from './scheduleEngine';
export * from './vacationPublish';
export * from './coverageEngine';
export {
  getAlignedVacationOptions,
  alignVacationDates,
  calculateCoverageSuggestions,
  calculateCoverageSlotsAndSuggestions,
  checkVacationAlignment,
  canRoleCover,
  normalizeRoleKey,
  formatDateBR,
  addDaysToStr,
  getDaysDiff,
  getCollaboratorCoverageScheduleDetails,
  type Vacation30DayOption,
  type CandidateRecommendation,
  type CoverageSlotSuggestion,
  type CoverageCombinationView,
  type CoverageWeekDetailView,
  type CoverageDailyPobView,
  type CoverageSuggestionsResult,
  type DailyCoverageDetail,
  type CollaboratorCoverageScheduleAnalysis,
} from './vacationUtils';
export * from './sortUtils';
export * from './turmaUtils';
