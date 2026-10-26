import type { Pool } from "pg";
import { getAccessToken, SessionExpiredError } from "../auth/session";
import { listUnsettledInvoices } from "../invoices/repo";
import { fetchCharges } from "../payments/stripe";
import { withAdvisoryLock } from "./lock";

export const RECONCILE_LOCK_KEY = 4242;

export async function reconcile(pool: Pool): Promise<void> {
  const result = await withAdvisoryLock(pool, RECONCILE_LOCK_KEY, async () => {
    let token: string;
    try {
      token = await getAccessToken();
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        console.error("reconcile: service session expired, aborting this run");
        return "aborted";
      }
      throw error;
    }
    const invoices = await listUnsettledInvoices(pool);
    const charges = await fetchCharges(token, invoices.map((invoice) => invoice.chargeId));
    console.info(`reconcile: matched ${charges.length} of ${invoices.length} invoices`);
    return "done";
  });
  if (result === undefined) console.info("reconcile: another instance holds the lock, skipping");
}
