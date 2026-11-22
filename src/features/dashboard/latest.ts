export function latestByUpdatedAt<T extends { updatedAt: string }>(
  items: T[],
): T | undefined {
  return items.reduce<T | undefined>((latest, item) => {
    if (!latest) return item;
    return item.updatedAt > latest.updatedAt ? item : latest;
  }, undefined);
}
