import { DEFAULT_TRAINING_TIMING } from "../trainingTiming";
// Fallback for legacy runs and isolated views; formal views receive the run snapshot.
export const REP_INTERVAL_MS = DEFAULT_TRAINING_TIMING.repSeconds * 1000;
