const CACHE_TTL = 30 * 60 * 1000;
const CACHE_PREFIX = "gitcg:";

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key.toLowerCase());

    if (!raw) return null;

    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };

    if (Date.now() - ts > CACHE_TTL) return null;

    return data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key.toLowerCase(),
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch {
    // localStorage unavailable or full
  }
}
