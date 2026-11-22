export function recentByUpdatedAt<T extends { updatedAt: string }>(
  items: T[],
  limit = 5,
): T[] {
  return [...items]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);
}

export function latestByUpdatedAt<T extends { updatedAt: string }>(
  items: T[],
): T | undefined {
  return recentByUpdatedAt(items, 1)[0];
}
