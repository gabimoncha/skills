import { productionOverrides } from "./production";

export interface Config {
  env: string;
  databaseUrl: string;
  httpTimeoutMs: number;
  stripeBaseUrl: string;
}

const base: Config = {
  env: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://localhost/tally",
  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_MS ?? 8_000),
  stripeBaseUrl: "https://api.stripe.com/v1",
};

export const config: Config =
  base.env === "production" ? { ...base, ...productionOverrides } : base;
