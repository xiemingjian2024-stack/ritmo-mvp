// Personal playback/counting preferences, not sensor measurements or prescriptions.
export type TrainingTiming = { repSeconds: number; setRestSeconds: number };
export const DEFAULT_TRAINING_TIMING: TrainingTiming = { repSeconds: 4, setRestSeconds: 90 };
export function normalizeTrainingTiming(value: unknown): TrainingTiming {
  const input = value && typeof value === "object" ? value as Partial<TrainingTiming> : {};
  const number = (n: unknown, fallback: number, min: number, max: number, step: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n / step) * step)) : fallback;
  return { repSeconds: number(input.repSeconds, DEFAULT_TRAINING_TIMING.repSeconds, 2, 8, .5), setRestSeconds: number(input.setRestSeconds, DEFAULT_TRAINING_TIMING.setRestSeconds, 15, 300, 15) };
}
