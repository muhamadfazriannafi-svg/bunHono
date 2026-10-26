import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { mutasiRepo, peranRepo, penggunaRepo } from "./repository.ts";
import { buatToken, cekSandi, hashSandi } from "./security.ts";
import { fail, ok, rapikan } from "./response.ts";
import {
  skemaDaftar,
  skemaMasuk,
  skemaMutasi,
  skemaPerbaruiProfil,
  skemaPerbaruiPengguna,
  validasi,
} from "./validation.ts";
import { auth, jadikanAdmin, peran, type Env } from "./middleware/auth.ts";

const bisnis = (pesan: string, status: number) => fail(pesan, status);
const emailDipakai = () => bisnis("Email sudah terdaftar", 400);
const tidakAda = () => bisnis("Data tidak ditemukan", 404);

export const app = new Hono<Env>()
  .get("/", (c) => ok({ layanan: "core-api", versi: "1.0.0" }))
  .get("/health", (c) => ok({ hidup: true }))

  // ---------- Otentikasi ----------
  .post("/api/auth/daftar", validasi(skemaDaftar), async (c) => {
    const { jadikan_admin, ...body } = c.req.valid("json");
    if (await penggunaRepo.cariBerdasarkanEmail(body.email)) return emailDipakai();
    const akun = await penggunaRepo.buat({
      ...body,
      peran_id: (await peranRepo.cariBerdasarkanNama("pengguna"))!.id,
      kata_sandi_hash: await hashSandi(body.kata_sandi),
    });
    if (jadikan_admin && (await peranRepo.cariBerdasarkanNama("admin"))) await jadikanAdmin(akun.id);
    return ok(rapikan(akun), "Registrasi berhasil", 201);
  })
  .post("/api/auth/masuk", validasi(skemaMasuk), async (c) => {
    const { email, kata_sandi } = c.req.valid("json");
    const akun = await penggunaRepo.cariBerdasarkanEmail(email);
    if (!akun || !(await cekSandi(kata_sandi, akun.kata_sandi_hash))) return fail("Email atau kata sandi salah", 401);
    const token = await buatToken({ sub: akun.id, email: akun.email, peran: (await peranRepo.cariBerdasarkanId(akun.peran_id))!.nama });
    setCookie(c, "token", token, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 28800 });
    return ok({ token, pengguna: rapikan(akun) }, "Masuk berhasil");
  })
  .post("/api/auth/keluar", async (c) => {
    deleteCookie(c, "token", { path: "/" });
    return ok(null, "Keluar berhasil");
  })

  // ---------- Profil (pengguna login) ----------
  .get("/api/profil", auth, async (c) => {
    const akun = await penggunaRepo.cariBerdasarkanId(c.get("pengguna").sub);
    return akun ? ok(rapikan(akun)) : tidakAda();
  })
  .patch("/api/profil", auth, validasi(skemaPerbaruiProfil), async (c) => {
    const body = c.req.valid("json");
    const akun = await penggunaRepo.cariBerdasarkanId(c.get("pengguna").sub);
    if (!akun) return tidakAda();
    if (body.email && body.email !== akun.email && (await penggunaRepo.cariBerdasarkanEmail(body.email))) return emailDipakai();
    return ok(rapikan((await penggunaRepo.perbarui(akun.id, body))!));
  })

  // ---------- Manajemen pengguna (admin) ----------
  .get("/api/pengguna", auth, peran("admin"), async (c) => {
    const p = c.req.query();
    const limit = Math.min(Math.max(+p.limit! || 20, 1), 100);
    const offset = Math.max(+p.offset! || 0, 0);
    return ok((await penggunaRepo.daftar(limit, offset)).map(rapikan));
  })
  .get("/api/pengguna/:id", auth, peran("admin"), async (c) => {
    const akun = await penggunaRepo.cariBerdasarkanId(+c.req.param("id"));
    return akun ? ok(rapikan(akun)) : tidakAda();
  })
  .patch("/api/pengguna/:id", auth, peran("admin"), validasi(skemaPerbaruiPengguna), async (c) => {
    const id = +c.req.param("id");
    const { peran: namaPeran, ...body } = c.req.valid("json");
    const target = await penggunaRepo.cariBerdasarkanId(id);
    if (!target) return tidakAda();
    const peran_id = namaPeran ? (await peranRepo.cariBerdasarkanNama(namaPeran))!.id : undefined;
    return ok(rapikan((await penggunaRepo.perbarui(id, { ...body, peran_id }))!));
  })
  .delete("/api/pengguna/:id", auth, peran("admin"), async (c) => {
    const id = +c.req.param("id");
    if (id === c.get("pengguna").sub) return bisnis("Tidak dapat menonaktifkan akun sendiri", 400);
    const akun = await penggunaRepo.nonaktifkan(id);
    return akun ? ok(rapikan(akun), "Pengguna dinonaktifkan") : tidakAda();
  })

  // ---------- Transaksi mutasi ----------
  .post("/api/transaksi", auth, validasi(skemaMutasi), async (c) => {
    const { pengguna_id, ...body } = c.req.valid("json");
    const claims = c.get("pengguna");
    const pemilik = pengguna_id ?? claims.sub;
    if (pemilik !== claims.sub && claims.peran !== "admin") return fail("Akses ditolak", 403);
    const target = await penggunaRepo.cariBerdasarkanId(pemilik);
    return target ? ok(await mutasiRepo.buat({ ...body, pengguna_id: pemilik }), "Mutasi tercatat", 201) : tidakAda();
  })
  .get("/api/transaksi", auth, async (c) => {
    const claims = c.get("pengguna");
    const p = c.req.query();
    const limit = Math.min(Math.max(+p.limit! || 20, 1), 100);
    const offset = Math.max(+p.offset! || 0, 0);
    const filter = claims.peran === "admin" && p.pengguna_id ? +p.pengguna_id : claims.peran === "admin" ? null : claims.sub;
    return ok(await mutasiRepo.daftar(filter, limit, offset));
  })
  .get("/api/transaksi/rekap", auth, peran("admin"), async (c) => ok(await mutasiRepo.rekap()))

  .notFound((c) => fail("Endpoint tidak ditemukan", 404))
  .onError((e, c) => {
    console.error(e);
    return fail("Terjadi kesalahan internal", 500);
  });
