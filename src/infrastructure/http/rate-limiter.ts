export class InMemoryRateLimiter {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMilliseconds: number,
  ) {}

  take(key: string, now = Date.now()): boolean {
    const cutoff = now - this.windowMilliseconds;
    const recent = (this.attempts.get(key) ?? []).filter((attempt) => attempt > cutoff);
    if (recent.length >= this.limit) {
      this.attempts.set(key, recent);
      return false;
    }
    recent.push(now);
    this.attempts.set(key, recent);
    return true;
  }
}

export class DemoLoginRateLimiter {
  private readonly limiter: InMemoryRateLimiter;

  constructor(limit: number, windowMilliseconds: number) {
    this.limiter = new InMemoryRateLimiter(limit, windowMilliseconds);
  }

  takeForSyntheticAlias(syntheticAlias: string, now = Date.now()): boolean {
    return this.limiter.take(syntheticAlias, now);
  }
}
