import type { Pool } from "pg";

export async function withAdvisoryLock<T>(
  pool: Pool,
  key: number,
  run: () => Promise<T>,
): Promise<T | undefined> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT pg_try_advisory_lock($1) AS locked", [key]);
    if (!rows[0].locked) return undefined;
    try {
      return await run();
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [key]);
    }
  } finally {
    client.release();
  }
}
