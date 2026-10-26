import cron from "node-cron";
import type { Pool } from "pg";
import { reconcile } from "./reconcile";
import { runWithRetries } from "./runner";

export function startSchedules(pool: Pool) {
  cron.schedule(
    "15 3 * * *",
    () => runWithRetries({ name: "reconcile", run: () => reconcile(pool) }),
    { timezone: "UTC" },
  );
}
