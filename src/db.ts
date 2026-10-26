import { Pool } from "pg";

const pool = new Pool({ connectionString: Bun.env.DATABASE_URL });

export const db = pool;

export async function migrasi() {
  const sql = await Bun.file(new URL("../db/schema.sql", import.meta.url)).text();
  await pool.query(sql);
}
