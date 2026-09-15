interface CacheEnvelope<T> {
  data: T;
  cachedAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

export class CacheService {
  private static PREFIX = 'spacepulse_cache_';

  static get<T>(key: string, allowStale = false): { data: T | null; isStale: boolean; cachedAt?: string } {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      if (!raw) return { data: null, isStale: false };

      const envelope: CacheEnvelope<T> = JSON.parse(raw);
      const now = Date.now();
      const isExpired = now > envelope.expiresAt;

      if (isExpired && !allowStale) {
        return { data: null, isStale: true, cachedAt: new Date(envelope.cachedAt).toISOString() };
      }

      return {
        data: envelope.data,
        isStale: isExpired,
        cachedAt: new Date(envelope.cachedAt).toISOString()
      };
    } catch {
      return { data: null, isStale: false };
    }
  }

  static set<T>(key: string, data: T, ttlSeconds: number): void {
    try {
      const now = Date.now();
      const envelope: CacheEnvelope<T> = {
        data,
        cachedAt: now,
        expiresAt: now + ttlSeconds * 1000
      };
      localStorage.setItem(this.PREFIX + key, JSON.stringify(envelope));
    } catch {
      // Ignore quota exceeded or storage disabled
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch {
      // Ignore
    }
  }
}
