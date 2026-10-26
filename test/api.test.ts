// Jalankan: bun test (butuh DATABASE_URL_TEST, mis. postgres://postgres:postgres@localhost:5432/bunhono_test)
import { afterAll, beforeAll, expect, test } from "bun:test";

process.env.JWT_SECRET ??= "rahasia-test-min-16-karakter";
process.env.DATABASE_URL ??= process.env.DATABASE_URL_TEST ?? "postgres://postgres:postgres@localhost:5432/bunhono_test";

const { db, migrasi } = await import("../src/db.ts");
const { app } = await import("../src/app.ts");

// Bun 1.3: better-sqlite3-style .rejects pada Pool.query menggantung -> pakai try/catch.
async function gagal(fn: () => Promise<unknown>) {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

beforeAll(async () => {
  await db.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public");
  await migrasi();
});
afterAll(() => db.end());

const r = (path: string, init: RequestInit = {}) => app.request(path, init);
const json = (body: unknown, token?: string) => ({
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});
const patch = (body: unknown, token?: string) => ({ ...json(body, token), method: "PATCH" });

test("format respons konsisten & validasi 400", async () => {
  const sehat = await (await r("/health")).json();
  expect(sehat).toEqual({ status: "success", message: "OK", data: { hidup: true } });

  const res = await r("/api/auth/daftar", json({ email: "bukan-email", nama: "", kata_sandi: "x" }));
  expect(res.status).toBe(400);
  expect(((await res.json()) as any).status).toBe("error");

  expect((await r("/tidak-ada")).status).toBe(404);
  expect((await r("/api/profil")).status).toBe(401);
});

test("alur daftar, masuk, profil, RBAC, mutasi, soft delete", async () => {
  expect((await r("/api/auth/daftar", json({ email: "a@b.co", nama: "A", kata_sandi: "rahasia123" }))).status).toBe(201);
  expect((await r("/api/auth/daftar", json({ email: "a@b.co", nama: "A2", kata_sandi: "rahasia123" }))).status).toBe(400);

  const adminRes = await r("/api/auth/daftar", json({ email: "admin@b.co", nama: "Admin", kata_sandi: "rahasia123", jadikan_admin: true }));
  expect(adminRes.status).toBe(201);

  const masuk = await r("/api/auth/masuk", json({ email: "a@b.co", kata_sandi: "rahasia123" }));
  expect(masuk.status).toBe(200);
  const { token, pengguna } = ((await masuk.json()) as any).data;
  expect(pengguna.kata_sandi_hash).toBeUndefined();

  expect((await r("/api/auth/masuk", json({ email: "a@b.co", kata_sandi: "salah" }))).status).toBe(401);

  const profil = await (await r("/api/profil", { headers: { authorization: `Bearer ${token}` } })).json();
  expect((profil as any).data.email).toBe("a@b.co");

  // non-admin ditolak 403
  expect((await r("/api/pengguna", { headers: { authorization: `Bearer ${token}` } })).status).toBe(403);

  const admin = ((await (await r("/api/auth/masuk", json({ email: "admin@b.co", kata_sandi: "rahasia123" }))).json()) as any).data.token;

  expect((await r("/api/profil", patch({ nama: "A Baru" }, token))).status).toBe(200);

  expect((await r("/api/transaksi", json({ jenis: "topup", nominal: 5000 }, token))).status).toBe(201);
  const daftar = await (await r("/api/transaksi", { headers: { authorization: `Bearer ${token}` } })).json();
  expect((daftar as any).data.length).toBe(1);

  expect((await r("/api/transaksi/rekap", { headers: { authorization: `Bearer ${admin}` } })).status).toBe(200);

  // hapus => is_aktif false (soft delete)
  const hapus = await r(`/api/pengguna/${pengguna.id}`, { method: "DELETE", headers: { authorization: `Bearer ${admin}` } });
  expect(hapus.status).toBe(200);
  const { rows } = await db.query("SELECT is_aktif FROM pengguna_master WHERE id = $1", [pengguna.id]);
  expect(rows[0].is_aktif).toBe(false);
  expect((await r("/api/profil", { headers: { authorization: `Bearer ${token}` } })).status).toBe(401);

  // hard delete ditolak trigger DB
  expect(await gagal(() => db.query("DELETE FROM pengguna_master WHERE id = $1", [pengguna.id]))).toBe(true);
});
