import { cookies } from "next/headers";
import { dbAll } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_COOKIE = "bm_session";
const JWT_SECRET = process.env.JWT_SECRET || "business-manager-default-secret-2025";

function createToken(payload: { userId: number; name: string; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token: string): { userId: number; name: string } | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return { userId: payload.userId, name: payload.name };
  } catch {
    return null;
  }
}

export async function login(password: string): Promise<string | null> {
  const rows = await dbAll("SELECT * FROM users LIMIT 1");
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, String(user.password_hash))) return null;

  const token = createToken({
    userId: Number(user.id),
    name: String(user.name),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export async function getSession(): Promise<{ userId: number; name: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function logout() {
  // JWT is stateless - cookie cleared on client
}

export { SESSION_COOKIE };
