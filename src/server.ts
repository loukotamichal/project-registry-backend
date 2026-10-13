import { initializeSchema } from "./schema.ts";
import { seedDemoData } from "./seed.ts";
import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDatabase } from "./db.ts";

const config = loadConfig();
const db = openDatabase(config.databasePath);
initializeSchema(db);
if (process.env.DEMO_SEED !== "false") seedDemoData(db);
const app = buildApp(db);

try {
  const address = await app.listen({ host: config.host, port: config.port });
  console.info(`API listening at ${address}`);
} catch (error) {
  db.close();
  throw error;
}

const shutdown = async () => {
  await app.close();
  db.close();
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
