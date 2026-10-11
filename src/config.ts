export type AppConfig = {
  host: string;
  port: number;
  databasePath: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return {
    host: env.HOST ?? "0.0.0.0",
    port,
    databasePath: env.DATABASE_PATH ?? "./data/app.sqlite",
  };
}
