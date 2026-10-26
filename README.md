# Core API Service (Bun + Hono + PostgreSQL)

Skema DB dibuat otomatis saat server start (`db/schema.sql`).

```bash
cp .env.example .env   # isi DATABASE_URL & JWT_SECRET
bun install
bun run index.ts       # atau: bun --hot index.ts
bun test               # butuh DATABASE_URL_TEST (DB terpisah, schema public di-drop)
```

## Struktur

- `src/repository.ts` — satu-satunya layer yang query ke DB (Repository Pattern)
- `src/app.ts` — routing + controller Hono, memanggil repository
- `src/middleware/auth.ts` — JWT + RBAC (`auth`, `peran("admin")`)
- `src/validation.ts` — skema Zod payload
- `db/schema.sql` — tabel `_master` (int PK) / `_transaksi` (uuid PK), FK `*_id`, soft delete `is_aktif`,
  view `mutasi_rekap_view`, trigger `diperbarui_pada` + trigger penolak hard DELETE

## Endpoint

| Method | Path | Akses |
| --- | --- | --- |
| GET | `/health` | publik |
| POST | `/api/auth/daftar` | publik |
| POST | `/api/auth/masuk` | publik (set cookie + token) |
| POST | `/api/auth/keluar` | publik |
| GET/PATCH | `/api/profil` | login |
| GET | `/api/pengguna`, `/api/pengguna/:id` | admin |
| PATCH/DELETE | `/api/pengguna/:id` | admin (DELETE = `is_aktif=false`) |
| POST/GET | `/api/transaksi` | login |
| GET | `/api/transaksi/rekap` | admin |

Respons: `{ status: "success" | "error", message, data }`.

Header: `Authorization: Bearer <token>`.
