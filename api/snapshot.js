import { Redis } from "@upstash/redis";
import { hasValidSession } from "./_auth.js";

const SNAPSHOT_KEY = "truthifi:latest-snapshot";

// Vercel's Redis (Upstash) marketplace integration sets KV_REST_API_URL /
// KV_REST_API_TOKEN by default; fall back to the plain Upstash names in case
// the store was connected under those instead.
function getRedis() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req, res) {
  const redis = getRedis();
  if (!redis) {
    return res.status(500).json({ error: "Redis store not configured" });
  }

  if (req.method === "GET") {
    if (!hasValidSession(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const snapshot = await redis.get(SNAPSHOT_KEY);
    return res.status(200).json(snapshot ?? null);
  }

  if (req.method === "POST") {
    const expected = process.env.ROUTINE_SECRET;
    const provided = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!expected || provided !== expected) {
      return res.status(401).json({ error: "Not authorized" });
    }
    const body = req.body ?? {};
    const snapshot = { ...body, syncedAt: new Date().toISOString() };
    await redis.set(SNAPSHOT_KEY, snapshot);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
