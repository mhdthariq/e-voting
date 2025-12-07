/**
 * Simple In-Memory Rate Limiter
 * Uses a Map to store token buckets for IP addresses.
 * Note: In a distributed environment (Vercel Edge/Serverless), this memory is not shared.
 * For production scaling, use Redis (e.g., Upstash).
 */

type TokenBucket = {
  tokens: number;
  lastRefill: number;
};

export class RateLimiter {
  private buckets: Map<string, TokenBucket>;
  private readonly capacity: number;
  private readonly refillRate: number; // Tokens per second
  private readonly windowSize: number; // In milliseconds

  /**
   * @param capacity Maximum tokens in the bucket (burst limit)
   * @param refillRate Tokens added per second
   */
  constructor(capacity: number = 10, refillRate: number = 1) {
    this.buckets = new Map();
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.windowSize = 1000;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      // If full and untouched for a while, delete to save memory
      if (bucket.tokens >= this.capacity && now - bucket.lastRefill > 60000) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Check if action is allowed for identifier
   * @param identifier IP or User ID
   * @param cost Cost of the action (default 1)
   */
  public check(identifier: string, cost: number = 1): { success: boolean; remaining: number; reset: number } {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(identifier, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 1000) * this.refillRate);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Periodically cleanup (random chance to avoid timer overhead)
    if (Math.random() < 0.01) this.cleanup();

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return { 
        success: true, 
        remaining: bucket.tokens, 
        reset: now + 1000 // Approximate next refill
      };
    } else {
      return { 
        success: false, 
        remaining: bucket.tokens, 
        reset: bucket.lastRefill + (1000 / this.refillRate)
      };
    }
  }
}

// Singleton instances for different sensitive routes
export const loginRateLimiter = new RateLimiter(5, 0.2); // 5 attempts burst, 1 per 5 seconds refill
export const voteRateLimiter = new RateLimiter(10, 1);   // 10 attempts burst, 1 per second refill
export const apiRateLimiter = new RateLimiter(60, 2);    // 60 requests burst, 2 per second general api
