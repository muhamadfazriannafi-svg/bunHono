import { db } from "./db.ts";

export type Pengguna = {
  id: number;
  peran_id: number;
  email: string;
  nama: string;
  kata_sandi_hash: string;
  is_aktif: boolean;
  dibuat_pada: Date;
  diperbarui_pada: Date;
};

export type PenggunaBaru = { peran_id: number; email: string; nama: string; kata_sandi_hash: string };

const KOLOM = "id, peran_id, email, nama, kata_sandi_hash, is_aktif, dibuat_pada, diperbarui_pada";

// ponytail: semua repo wajib dimulai dari is_aktif = true, hard delete dijaga trigger DB.
export class PenggunaRepository {
  async cariBerdasarkanId(id: number) {
    const { rows } = await db.query<Pengguna>(`SELECT ${KOLOM} FROM pengguna_master WHERE id = $1 AND is_aktif`, [id]);
    return rows[0] ?? null;
  }

  async cariBerdasarkanEmail(email: string) {
    const { rows } = await db.query<Pengguna>(`SELECT ${KOLOM} FROM pengguna_master WHERE lower(email) = lower($1) AND is_aktif`, [email]);
    return rows[0] ?? null;
  }

  async daftar(limit: number, offset: number) {
    const { rows } = await db.query<Pengguna>(
      `SELECT ${KOLOM} FROM pengguna_master WHERE is_aktif ORDER BY id LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return rows;
  }

  async buat(p: PenggunaBaru) {
    const { rows } = await db.query<Pengguna>(
      `INSERT INTO pengguna_master (peran_id, email, nama, kata_sandi_hash) VALUES ($1, $2, $3, $4) RETURNING ${KOLOM}`,
      [p.peran_id, p.email, p.nama, p.kata_sandi_hash],
    );
    return rows[0]!;
  }

  async perbarui(id: number, p: { nama?: string; email?: string; peran_id?: number }) {
    const { rows } = await db.query<Pengguna>(
      `UPDATE pengguna_master SET nama = coalesce($2, nama), email = coalesce($3, email),
       peran_id = coalesce($4, peran_id) WHERE id = $1 AND is_aktif RETURNING ${KOLOM}`,
      [id, p.nama ?? null, p.email ?? null, p.peran_id ?? null],
    );
    return rows[0] ?? null;
  }

  async nonaktifkan(id: number) {
    const { rows } = await db.query<Pengguna>(
      `UPDATE pengguna_master SET is_aktif = false WHERE id = $1 AND is_aktif RETURNING ${KOLOM}`,
      [id],
    );
    return rows[0] ?? null;
  }
}

export class PeranRepository {
  async cariBerdasarkanNama(nama: string) {
    const { rows } = await db.query<{ id: number; nama: string }>(
      "SELECT id, nama FROM peran_master WHERE nama = $1 AND is_aktif",
      [nama],
    );
    return rows[0] ?? null;
  }

  async cariBerdasarkanId(id: number) {
    const { rows } = await db.query<{ id: number; nama: string }>(
      "SELECT id, nama FROM peran_master WHERE id = $1 AND is_aktif",
      [id],
    );
    return rows[0] ?? null;
  }
}

export type Mutasi = {
  id: string;
  pengguna_id: number;
  jenis: string;
  referensi: string | null;
  nominal: string;
  status: string;
  keterangan: string | null;
  dibuat_pada: Date;
  is_aktif: boolean;
};

export class MutasiRepository {
  async buat(m: { pengguna_id: number; jenis: string; referensi?: string; nominal: number; keterangan?: string }) {
    const { rows } = await db.query<Mutasi>(
      `INSERT INTO mutasi_transaksi (pengguna_id, jenis, referensi, nominal, keterangan)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [m.pengguna_id, m.jenis, m.referensi ?? null, m.nominal, m.keterangan ?? null],
    );
    return rows[0]!;
  }

  async daftar(pengguna_id: number | null, limit: number, offset: number) {
    const { rows } = await db.query<Mutasi>(
      `SELECT * FROM mutasi_transaksi WHERE is_aktif AND ($1::int IS NULL OR pengguna_id = $1)
       ORDER BY dibuat_pada DESC LIMIT $2 OFFSET $3`,
      [pengguna_id, limit, offset],
    );
    return rows;
  }

  async rekap() {
    const { rows } = await db.query("SELECT * FROM mutasi_rekap_view ORDER BY pengguna_id");
    return rows;
  }
}

export const penggunaRepo = new PenggunaRepository();
export const peranRepo = new PeranRepository();
export const mutasiRepo = new MutasiRepository();
