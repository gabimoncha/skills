import { getAccessToken } from "../auth/session";
import { createCharge } from "../payments/stripe";
import type { Invoice } from "./repo";

export async function issueInvoice(invoice: Invoice): Promise<string> {
  const token = await getAccessToken();
  const charge = await createCharge(token, invoice.amountCents, `invoice-${invoice.id}`);
  return charge.id;
}
