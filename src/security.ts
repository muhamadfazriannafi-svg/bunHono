import { sign, verify } from "hono/jwt";

export type Claims = { sub: number; email: string; peran: string; exp: number };

const RAHASIA = process.env.JWT_SECRET ?? "";
if (RAHASIA.length < 16) throw new Error("JWT_SECRET wajib di-set (min. 16 karakter)");

export const buatToken = (c: Omit<Claims, "exp">) =>
  sign({ ...c, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 }, RAHASIA);

export async function bacaToken(token: string): Promise<Claims> {
  return (await verify(token, RAHASIA, "HS256")) as unknown as Claims;
}

export const hashSandi = (sandi: string) => Bun.password.hash(sandi, { algorithm: "argon2id" });
export const cekSandi = (sandi: string, hash: string) => Bun.password.verify(sandi, hash);
