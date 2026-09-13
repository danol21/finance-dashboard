import jwt from "jsonwebtoken";

// Prefixed with "_" so Vercel doesn't expose this as its own API route —
// it's a shared helper for the other functions in this directory.
export function hasValidSession(req) {
  const cookie = req.headers.cookie ?? "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) return false;
  try {
    jwt.verify(match[1], process.env.SESSION_SECRET);
    return true;
  } catch {
    return false;
  }
}
