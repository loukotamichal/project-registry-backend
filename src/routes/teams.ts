import { personSelect, projectSelect } from "./shared.ts";
import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../db.ts";
import { idParams, requiredText, requireEntity, teamSelect, text } from "./shared.ts";
import type { Team } from "./shared.ts";

type Input = Omit<Team, "id">;
const properties = { name: text(), description: { type: "string", maxLength: 5000 } };
export function teamRoutes(app: FastifyInstance, db: AppDatabase): void {
  app.get("/api/teams", async () => ({ items: db.prepare(`${teamSelect} ORDER BY id`).all() }));
  app.post<{ Body: Input }>("/api/teams", {
    schema: { body: { type: "object", additionalProperties: false, required: ["name"], properties } },
  }, async (request, reply) => {
    const result = db.prepare("INSERT INTO teams(name,description) VALUES (?,?)")
      .run(requiredText(request.body.name), request.body.description?.trim() ?? "");
    const id = Number(result.lastInsertRowid);
    return reply.code(201).header("Location", `/api/teams/${id}`).send(db.prepare(`${teamSelect} WHERE id=?`).get(id));
  });
  app.get<{ Params: { id: string } }>("/api/teams/:id", { schema: { params: idParams } }, async request => {
    const id = Number(request.params.id);
    requireEntity(db, "teams", id);
    return {
      ...db.prepare(`${teamSelect} WHERE id=?`).get(id) as Team,
      members: db.prepare(`${personSelect} WHERE team_id=? ORDER BY id`).all(id),
      projects: db.prepare(`${projectSelect} WHERE id IN (SELECT project_id FROM project_teams WHERE team_id=?) ORDER BY id`).all(id),
    };
  });
  app.patch<{ Params: { id: string }; Body: Partial<Input> }>("/api/teams/:id", {
    schema: { params: idParams, body: { type: "object", additionalProperties: false, minProperties: 1, properties } },
  }, async request => {
    const id = Number(request.params.id);
    requireEntity(db, "teams", id);
    const value = { ...db.prepare(`${teamSelect} WHERE id=?`).get(id) as Team, ...request.body };
    db.prepare("UPDATE teams SET name=?,description=? WHERE id=?").run(requiredText(value.name), value.description.trim(), id);
    return db.prepare(`${teamSelect} WHERE id=?`).get(id);
  });
  app.delete<{ Params: { id: string } }>("/api/teams/:id", { schema: { params: idParams } }, async (request, reply) => {
    const id = Number(request.params.id);
    requireEntity(db, "teams", id);
    db.prepare("DELETE FROM teams WHERE id=?").run(id);
    return reply.code(204).send();
  });
}
