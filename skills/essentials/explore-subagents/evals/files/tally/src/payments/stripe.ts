import { config } from "../config";
import { getAccessToken, SessionExpiredError } from "../auth/session";
import { createClient } from "../http/client";

export class PaymentAuthError extends Error {
  constructor(cause: unknown) {
    super("Payment provider rejected the service session.", { cause });
    this.name = "PaymentAuthError";
  }
}

const http = createClient();

export async function createCharge(token: string, amountCents: number, idempotencyKey: string) {
  return http.request<{ id: string }>(`${config.stripeBaseUrl}/charges`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": idempotencyKey },
    body: { amount: amountCents, currency: "usd" },
  });
}

export async function refundCharge(chargeId: string) {
  let token: string;
  try {
    token = await getAccessToken();
  } catch (error) {
    if (error instanceof SessionExpiredError) throw new PaymentAuthError(error);
    throw error;
  }
  return http.request<{ id: string }>(`${config.stripeBaseUrl}/refunds`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { charge: chargeId },
  });
}

export async function fetchCharges(token: string, chargeIds: string[]) {
  return Promise.all(
    chargeIds.map((id) =>
      http.request<{ id: string; status: string }>(`${config.stripeBaseUrl}/charges/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  );
}
