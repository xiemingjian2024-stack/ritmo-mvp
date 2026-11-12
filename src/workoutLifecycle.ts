type SuspendableWorkout = {
  stage: string;
  phase?: string;
  paused: boolean;
  parkedOnHome?: boolean;
  restRemaining: number;
  restDeadlineAt?: number | null;
  activeRemainingSeconds?: number;
  activeDeadlineAt?: number | null;
  phaseRemaining?: number;
  phaseDeadlineAt?: number | null;
};

// Freeze only a running clock. A second pagehide event must not consume time again.
const remainingAt = (deadline: number | null | undefined, fallback: number | undefined, now: number) =>
  deadline == null ? fallback : Math.max(0, Math.ceil((deadline - now) / 1000));

export function suspendWorkoutForHome<T extends SuspendableWorkout>(snapshot: T, now = Date.now()): T {
  const running = !snapshot.paused;
  const stage = snapshot.stage === "countdown" ? snapshot.phase === "strength" ? "transition" : "phase-intro" : snapshot.stage;
  return {
    ...snapshot,
    stage,
    parkedOnHome: true,
    paused: true,
    restRemaining: running && snapshot.stage === "rest" ? remainingAt(snapshot.restDeadlineAt, snapshot.restRemaining, now)! : snapshot.restRemaining,
    activeRemainingSeconds: running && snapshot.stage === "active" && (!snapshot.phase || snapshot.phase === "strength") ? remainingAt(snapshot.activeDeadlineAt, snapshot.activeRemainingSeconds, now) : snapshot.activeRemainingSeconds,
    phaseRemaining: running && (snapshot.stage === "active" || snapshot.stage === "phase-switch" || snapshot.stage === "phase-rest") && (snapshot.phase === "warmup" || snapshot.phase === "cooldown") ? remainingAt(snapshot.phaseDeadlineAt, snapshot.phaseRemaining, now) : snapshot.phaseRemaining,
    restDeadlineAt: null,
    activeDeadlineAt: null,
    phaseDeadlineAt: null,
  };
}

// Restart archives only confirmed work. Existing completed/partial records win;
// this helper deliberately has no cycle/NEXT input or output.
export function retainInterruptedSession<S extends { id: string; exercises: { completedSets: { completed: boolean }[] }[] }, P extends { runId: string; sessionId?: string }>(sessions: S[], phaseRecords: P[] | undefined, session: S) {
  if (sessions.some((existing) => existing.id === session.id) || !session.exercises.some((exercise) => exercise.completedSets.some((set) => set.completed))) return { sessions, phaseRecords };
  return { sessions: [...sessions, session], phaseRecords: (phaseRecords ?? []).map((record) => record.runId === session.id ? { ...record, sessionId: session.id } : record) };
}
