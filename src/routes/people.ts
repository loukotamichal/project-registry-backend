import { personProjects } from "../participants.ts";
import { teamSelect } from "./shared.ts";
import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../db.ts";
import { idParams, personSelect, positiveId, requiredText, requireEntity, text } from "./shared.ts";
import type { Person } from "./shared.ts";

type Input = Omit<Person, "id">;
const properties = { name: text(), email: { type: "string", format: "email", maxLength: 254 }, jobTitle: text(), teamId: positiveId };

export function peopleRoutes(app: FastifyInstance, db: AppDatabase): void {
  app.get("/api/people", async () => ({ items: db.prepare(`${personSelect} ORDER BY id`).all() }));
  app.post<{ Body: Input }>("/api/people", {
    schema: { body: { type: "object", additionalProperties: false, required: ["name", "email", "jobTitle", "teamId"], properties } },
  }, async (request, reply) => {
    const value = request.body;
    requireEntity(db, "teams", value.teamId);
    const result = db.prepare("INSERT INTO people(name,email,job_title,team_id) VALUES (?,?,?,?)")
      .run(requiredText(value.name), value.email.trim().toLowerCase(), requiredText(value.jobTitle), value.teamId);
    const id = Number(result.lastInsertRowid);
    return reply.code(201).header("Location", `/api/people/${id}`).send(db.prepare(`${personSelect} WHERE id=?`).get(id));
  });
  app.get<{ Params: { id: string } }>("/api/people/:id", { schema: { params: idParams } }, async request => {
    const id = Number(request.params.id);
    requireEntity(db, "people", id);
    const person = db.prepare(`${personSelect} WHERE id=?`).get(id) as Person;
    return { ...person, team: db.prepare(`${teamSelect} WHERE id=?`).get(person.teamId), projects: personProjects(db, id) };
  });
  app.patch<{ Params: { id: string }; Body: Partial<Input> }>("/api/people/:id", {
    schema: { params: idParams, body: { type: "object", additionalProperties: false, minProperties: 1, properties } },
  }, async request => {
    const id = Number(request.params.id);
    requireEntity(db, "people", id);
    const value = { ...db.prepare(`${personSelect} WHERE id=?`).get(id) as Person, ...request.body };
    requireEntity(db, "teams", value.teamId);
    db.prepare("UPDATE people SET name=?,email=?,job_title=?,team_id=? WHERE id=?")
      .run(requiredText(value.name), value.email.trim().toLowerCase(), requiredText(value.jobTitle), value.teamId, id);
    return db.prepare(`${personSelect} WHERE id=?`).get(id);
  });
  app.delete<{ Params: { id: string } }>("/api/people/:id", { schema: { params: idParams } }, async (request, reply) => {
    const id = Number(request.params.id);
    requireEntity(db, "people", id);
    db.prepare("DELETE FROM people WHERE id=?").run(id);
    return reply.code(204).send();
  });
}
