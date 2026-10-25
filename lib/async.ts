// Execução com limite de concorrência e cache simples em memória.

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface CacheEntry<V> {
  value: V;
  expires: number;
}

export class TTLCache<V> {
  private store = new Map<string, CacheEntry<V>>();
  private inflight = new Map<string, Promise<V>>();

  constructor(
    private ttlMs: number,
    private maxEntries = 500,
  ) {}

  get(key: string): V | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key: string, value: V) {
    if (this.store.size >= this.maxEntries) {
      const first = this.store.keys().next().value;
      if (first !== undefined) this.store.delete(first);
    }
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  // Evita chamadas duplicadas simultâneas para a mesma chave.
  async wrap(key: string, producer: () => Promise<V>): Promise<{ value: V; cached: boolean }> {
    const hit = this.get(key);
    if (hit !== undefined) return { value: hit, cached: true };
    const pending = this.inflight.get(key);
    if (pending) return { value: await pending, cached: true };
    const p = producer();
    this.inflight.set(key, p);
    try {
      const value = await p;
      this.set(key, value);
      return { value, cached: false };
    } finally {
      this.inflight.delete(key);
    }
  }
}
