import { zValidator } from "@hono/zod-validator";
import type { MiddlewareHandler } from "hono";
import type { Claims } from "./security.ts";
import { z } from "zod";
import { fail } from "./response.ts";

// Semua payload divalidasi sebagai JSON body.
export const validasi = <T extends z.ZodType>(skema: T) =>
  zValidator("json", skema, (r) => (r.success ? undefined : fail("Validasi gagal", 400, r.error.issues))) as MiddlewareHandler<
    { Variables: { pengguna: Claims } },
    string,
    { in: { json: z.output<T> }; out: { json: z.output<T> } }
  >;

export const email = z.email().max(255).toLowerCase();
export const sandi = z.string().min(8).max(72);

export const skemaDaftar = z.object({
  email,
  nama: z.string().trim().min(1).max(100),
  kata_sandi: sandi,
  jadikan_admin: z.boolean().optional(),
});
export const skemaMasuk = z.object({ email, kata_sandi: z.string().min(1) });
export const skemaPerbaruiProfil = z
  .object({ email: email.optional(), nama: z.string().trim().min(1).max(100).optional() })
  .refine((v) => Object.keys(v).length > 0, "Tidak ada field untuk diperbarui");

export const skemaPerbaruiPengguna = z
  .object({
    nama: z.string().trim().min(1).max(100).optional(),
    peran: z.enum(["admin", "pengguna"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Tidak ada field untuk diperbarui");

export const skemaMutasi = z.object({
  jenis: z.string().trim().min(1).max(50),
  nominal: z.number().finite().min(0).max(1e12),
  referensi: z.string().trim().max(100).optional(),
  keterangan: z.string().trim().max(500).optional(),
  pengguna_id: z.number().int().positive().optional(),
});
