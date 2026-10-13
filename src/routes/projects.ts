import { projectParticipants } from "../participants.ts";
import { personSelect, teamSelect } from "./shared.ts";
import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../db.ts";
import { ApiError, idParams, projectSelect, requiredText, requireEntity, text } from "./shared.ts";
import type { Project } from "./shared.ts";

type Input = Omit<Project, "id">;
const properties = {
  name: text(), description: text(5000),
  status: { type: "string", enum: ["planned", "in_progress", "completed"] },
  startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
  endDate: { anyOf: [{ type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, { type: "null" }] },
};
function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validateDates(project: Input): void {
  if (!validDate(project.startDate) || (project.endDate !== null && !validDate(project.endDate))) {
    throw new ApiError(400, "VALIDATION_ERROR", "Zadejte existující datum ve formátu YYYY-MM-DD.");
  }
  if (project.endDate !== null && project.endDate < project.startDate) {
    throw new ApiError(400, "VALIDATION_ERROR", "Datum ukončení nesmí předcházet zahájení.");
  }
}

export function projectRoutes(app: FastifyInstance, db: AppDatabase): void {
  app.get("/api/projects", async () => ({ items: db.prepare(`${projectSelect} ORDER BY id`).all() }));
  app.post<{ Body: Input }>("/api/projects", {
    schema: { body: { type: "object", additionalProperties: false, required: ["name", "description", "status", "startDate"], properties } },
  }, async (request, reply) => {
    const value = { ...request.body, endDate: request.body.endDate ?? null };
    validateDates(value);
    const result = db.prepare(`INSERT INTO projects(name,description,status,start_date,end_date) VALUES (?,?,?,?,?)`)
      .run(requiredText(value.name), requiredText(value.description), value.status, value.startDate, value.endDate);
    const id = Number(result.lastInsertRowid);
    return reply.code(201).header("Location", `/api/projects/${id}`).send(db.prepare(`${projectSelect} WHERE id=?`).get(id));
  });
  app.get<{ Params: { id: string } }>("/api/projects/:id", { schema: { params: idParams } }, async request => {
    const id = Number(request.params.id);
    requireEntity(db, "projects", id);
    return {
      ...db.prepare(`${projectSelect} WHERE id=?`).get(id) as Project,
      directPeople: db.prepare(`${personSelect} WHERE id IN (SELECT person_id FROM project_people WHERE project_id=?) ORDER BY id`).all(id),
      teams: db.prepare(`${teamSelect} WHERE id IN (SELECT team_id FROM project_teams WHERE project_id=?) ORDER BY id`).all(id),
      participants: projectParticipants(db, id),
    };
  });
  app.patch<{ Params: { id: string }; Body: Partial<Input> }>("/api/projects/:id", {
    schema: { params: idParams, body: { type: "object", additionalProperties: false, minProperties: 1, properties } },
  }, async request => {
    const id = Number(request.params.id);
    requireEntity(db, "projects", id);
    const current = db.prepare(`${projectSelect} WHERE id=?`).get(id) as Project;
    const value = { ...current, ...request.body };
    validateDates(value);
    db.prepare("UPDATE projects SET name=?,description=?,status=?,start_date=?,end_date=? WHERE id=?")
      .run(requiredText(value.name), requiredText(value.description), value.status, value.startDate, value.endDate, id);
    return db.prepare(`${projectSelect} WHERE id=?`).get(id);
  });
  app.delete<{ Params: { id: string } }>("/api/projects/:id", { schema: { params: idParams } }, async (request, reply) => {
    const id = Number(request.params.id);
    requireEntity(db, "projects", id);
    db.prepare("DELETE FROM projects WHERE id=?").run(id);
    return reply.code(204).send();
  });
}
