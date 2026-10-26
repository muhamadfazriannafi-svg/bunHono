-- Core API Service schema. Naming: master = int identity + _master, transaksi = uuid + _transaksi.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS peran_master (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama text NOT NULL,
  is_aktif boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS peran_master_nama_uniq ON peran_master (nama) WHERE is_aktif;

CREATE TABLE IF NOT EXISTS pengguna_master (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  peran_id integer NOT NULL REFERENCES peran_master (id),
  email text NOT NULL,
  nama text NOT NULL,
  kata_sandi_hash text NOT NULL,
  is_aktif boolean NOT NULL DEFAULT true,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  diperbarui_pada timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pengguna_master_email_uniq ON pengguna_master (lower(email)) WHERE is_aktif;
CREATE INDEX IF NOT EXISTS pengguna_master_peran_id_idx ON pengguna_master (peran_id);

CREATE TABLE IF NOT EXISTS mutasi_transaksi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pengguna_id integer NOT NULL REFERENCES pengguna_master (id),
  jenis text NOT NULL,
  referensi text,
  nominal numeric(18, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'tercatat',
  keterangan text,
  dibuat_pada timestamptz NOT NULL DEFAULT now(),
  is_aktif boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS mutasi_transaksi_pengguna_id_idx ON mutasi_transaksi (pengguna_id, dibuat_pada DESC);

-- View agregasi mutasi per pengguna.
CREATE OR REPLACE VIEW mutasi_rekap_view AS
SELECT p.id AS pengguna_id, p.nama, count(m.id)::int AS jumlah_mutasi,
       coalesce(sum(m.nominal), 0)::numeric(18, 2) AS total_nominal
FROM pengguna_master p
LEFT JOIN mutasi_transaksi m ON m.pengguna_id = p.id AND m.is_aktif
WHERE p.is_aktif
GROUP BY p.id, p.nama;

-- Trigger: sentuh diperbarui_pada + tolak hard delete pada entitas utama.
CREATE OR REPLACE FUNCTION sentuh_diperbarui_pada() RETURNS trigger AS $$
BEGIN
  NEW.diperbarui_pada := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pengguna_master_touch ON pengguna_master;
CREATE TRIGGER pengguna_master_touch BEFORE UPDATE ON pengguna_master
FOR EACH ROW EXECUTE FUNCTION sentuh_diperbarui_pada();

CREATE OR REPLACE FUNCTION tolak_hapus_permanen() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'DELETE permanen dilarang; set is_aktif = false';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pengguna_master_no_delete ON pengguna_master;
CREATE TRIGGER pengguna_master_no_delete BEFORE DELETE ON pengguna_master
FOR EACH ROW EXECUTE FUNCTION tolak_hapus_permanen();

DROP TRIGGER IF EXISTS mutasi_transaksi_no_delete ON mutasi_transaksi;
CREATE TRIGGER mutasi_transaksi_no_delete BEFORE DELETE ON mutasi_transaksi
FOR EACH ROW EXECUTE FUNCTION tolak_hapus_permanen();

INSERT INTO peran_master (nama) VALUES ('admin'), ('pengguna')
ON CONFLICT DO NOTHING;
