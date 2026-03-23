const rateLimitBuckets = new Map();

export function checkRateLimit({ key, windowMs, maxRequests }) {
  const now = Date.now();
  cleanupBuckets(now);

  const existingBucket = rateLimitBuckets.get(key);
  const bucket =
    existingBucket && existingBucket.resetAt > now
      ? existingBucket
      : {
          count: 0,
          resetAt: now + windowMs
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= maxRequests,
    remaining: Math.max(0, maxRequests - bucket.count),
    retryAfterMs: Math.max(0, bucket.resetAt - now),
    resetAt: bucket.resetAt
  };
}

function cleanupBuckets(now) {
  if (rateLimitBuckets.size <= 500) {
    return;
  }

  rateLimitBuckets.forEach((bucket, key) => {
    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  });
}
