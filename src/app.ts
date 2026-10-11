import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "./db.ts";

export type HealthResponse = {
  status: "ok" | "error";
  database: "ok" | "error";
};

export function buildApp(db: AppDatabase): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/api/health", async (_request, reply) => {
    try {
      db.prepare("SELECT 1 AS ok").get();
      const response: HealthResponse = { status: "ok", database: "ok" };
      return response;
    } catch {
      const response: HealthResponse = { status: "error", database: "error" };
      return reply.code(503).send(response);
    }
  });

  return app;
}
