import type { Config } from "./index";

// Stripe p99 latency in production is close to 9s, so the default is too tight.
export const productionOverrides: Partial<Config> = {
  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_MS ?? 12_000),
};
