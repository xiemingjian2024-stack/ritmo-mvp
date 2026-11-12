// Present a circular queue from its existing NEXT cursor, without migrating data.
export function cycleOrder(ids: readonly string[], nextIndex = 0): string[] {
  if (!ids.length) return [];
  const first = Math.max(0, Math.min(Math.trunc(nextIndex) || 0, ids.length - 1));
  return [...ids.slice(first), ...ids.slice(0, first)];
}

// An explicit user reorder makes the resulting first row the next workout.
export function reorderCycle(ids: readonly string[], nextIndex: number, id: string, targetIndex: number) {
  const ordered = cycleOrder(ids, nextIndex);
  const from = ordered.indexOf(id);
  const target = Math.max(0, Math.min(targetIndex, ordered.length - 1));
  if (from < 0 || from === target) return null;
  ordered.splice(from, 1);
  ordered.splice(target, 0, id);
  return { ids: ordered, nextIndex: 0 };
}
