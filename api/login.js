import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body ?? {};
  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password required" });
  }

  const hash = process.env.SITE_PASSWORD_HASH;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!hash || !sessionSecret) {
    return res.status(500).json({ error: "Server not configured" });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = jwt.sign({ sub: "owner" }, sessionSecret, { expiresIn: "30d" });
  res.setHeader(
    "Set-Cookie",
    `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${THIRTY_DAYS_SECONDS}`
  );
  return res.status(200).json({ ok: true });
}
