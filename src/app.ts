import { ApiError } from "./routes/shared.ts";
import { projectRoutes } from "./routes/projects.ts";
import { peopleRoutes } from "./routes/people.ts";
import { teamRoutes } from "./routes/teams.ts";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "./db.ts";

export type HealthResponse = {
  status: "ok" | "error";
  database: "ok" | "error";
};

export function buildApp(db: AppDatabase): FastifyInstance {
  const app = Fastify({ logger: false, ajv: { customOptions: { removeAdditional: false, coerceTypes: false } } });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
    }
    const failure = error as { validation?: unknown; code?: string; statusCode?: number };
    if (failure.validation || failure.statusCode === 400) {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Zkontrolujte formát, povinné údaje a povolená pole." } });
    }
    if (failure.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return reply.code(409).send({ error: { code: "CONFLICT", message: "E-mail nebo název týmu již existuje." } });
    }
    if (failure.code === "SQLITE_CONSTRAINT_FOREIGNKEY" || failure.code === "SQLITE_CONSTRAINT_TRIGGER") {
      return reply.code(409).send({ error: { code: "CONFLICT", message: "Tým má členy nebo se změnily související záznamy." } });
    }
    if (failure.statusCode && failure.statusCode >= 400 && failure.statusCode < 500) {
      return reply.code(failure.statusCode).send({ error: { code: "REQUEST_ERROR", message: "Požadavek nelze zpracovat." } });
    }
    app.log.error(error);
    return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Nastala neočekávaná chyba serveru." } });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: "NOT_FOUND", message: "Endpoint neexistuje." } }));
  projectRoutes(app, db);
  peopleRoutes(app, db);
  teamRoutes(app, db);

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
