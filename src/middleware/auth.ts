import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { fail } from "../response.ts";
import { bacaToken, type Claims } from "../security.ts";
import { peranRepo, penggunaRepo } from "../repository.ts";

export type Env = { Variables: { pengguna: Claims } };

const ambilToken = (c: Context) =>
  c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? getCookie(c, "token");

export const auth: MiddlewareHandler<Env> = async (c, next) => {
  const token = ambilToken(c);
  if (!token) return fail("Token tidak ditemukan", 401);
  let claims: Claims;
  try {
    claims = await bacaToken(token);
  } catch {
    return fail("Token tidak valid atau kedaluwarsa", 401);
  }
  const pengguna = await penggunaRepo.cariBerdasarkanId(claims.sub);
  if (!pengguna) return fail("Pengguna tidak aktif", 401);
  c.set("pengguna", claims);
  await next();
};

export const peran = (...boleh: string[]): MiddlewareHandler<Env> => async (c, next) => {
  if (!boleh.includes(c.get("pengguna").peran)) return fail("Akses ditolak", 403);
  await next();
};

export const jadikanAdmin = async (id: number) => {
  const admin = await peranRepo.cariBerdasarkanNama("admin");
  await penggunaRepo.perbarui(id, { peran_id: admin!.id });
};
