const hits: number[] = [];

export function allowRequest(limit = 40): boolean {
  const now = Date.now();
  while (hits.length > 0 && now - hits[0]! > 60_000) hits.shift();
  if (hits.length >= limit) return false;
  hits.push(now);
  return true;
}
