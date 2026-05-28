import Redis from 'ioredis';
import 'dotenv/config';

const r = new Redis(process.env.REDIS_URL);
const pattern = process.argv[2] || 'tasks:assignee:*';
const keys = await r.keys(pattern);
console.log(`pattern: ${pattern}`);
console.log(`keys (${keys.length}):`);
for (const k of keys) {
  const ttl = await r.ttl(k);
  console.log(`  ${k}  (TTL ${ttl}s)`);
}
await r.quit();
