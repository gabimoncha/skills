import { Pool } from "pg";
import { config } from "./config";
import { startSchedules } from "./jobs/schedule";

const pool = new Pool({ connectionString: config.databaseUrl });
startSchedules(pool);
console.info(`tally started in ${config.env}`);
