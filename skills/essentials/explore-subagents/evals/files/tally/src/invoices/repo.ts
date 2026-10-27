import type { Pool } from "pg";

export interface Invoice {
  id: string;
  customerId: string;
  amountCents: number;
  chargeId: string;
}

export async function listUnsettledInvoices(pool: Pool): Promise<Invoice[]> {
  const { rows } = await pool.query(
    "SELECT id, customer_id, amount_cents, charge_id FROM invoices WHERE settled_at IS NULL",
  );
  return rows.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    amountCents: row.amount_cents,
    chargeId: row.charge_id,
  }));
}
