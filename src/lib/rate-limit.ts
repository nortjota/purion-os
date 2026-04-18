/**
 * Rate limiting via @upstash/ratelimit.
 * Falls back to no-op if UPSTASH_REDIS_REST_URL is not configured.
 * To enable: add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to .env.local
 */

type RateLimitResult = { success: boolean; limit: number; remaining: number }

let _ratelimit: Record<string, { limit: (id: string) => Promise<RateLimitResult> }> | null = null

async function getRatelimit() {
  if (_ratelimit) return _ratelimit

  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) return null

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis }     = await import('@upstash/redis')
  const redis         = new Redis({ url: redisUrl, token: redisToken })

  _ratelimit = {
    'ads':  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'),  prefix: 'rl:ads'  }),
    'gads': new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'),  prefix: 'rl:gads' }),
    'auth': new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'),  prefix: 'rl:auth' }),
  }

  return _ratelimit
}

export async function checkRateLimit(
  bucket: 'ads' | 'gads' | 'auth',
  identifier: string
): Promise<RateLimitResult> {
  const rl = await getRatelimit()
  if (!rl) return { success: true, limit: 999, remaining: 999 }
  return rl[bucket].limit(identifier)
}

export function getIdentifier(req: Request): string {
  const forwarded = new Headers((req as Request).headers).get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'anonymous'
}
