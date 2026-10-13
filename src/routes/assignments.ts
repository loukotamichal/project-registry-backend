import type { FastifyInstance } from "fastify";
import type { AppDatabase } from "../db.ts";
import { requireEntity } from "./shared.ts";

export function assignmentRoutes(app: FastifyInstance, db: AppDatabase): void {
  // Only these two fixed relation definitions can supply SQL identifiers.
  const relations = [
    { resource: "people", table: "project_people", column: "person_id", parameter: "personId" },
    { resource: "teams", table: "project_teams", column: "team_id", parameter: "teamId" },
  ] as const;
  for (const relation of relations) {
    const path = `/api/projects/:projectId/${relation.resource}/:${relation.parameter}`;
    const id = { type: "string", pattern: "^[1-9][0-9]{0,14}$" };
    const schema = { params: { type: "object", required: ["projectId", relation.parameter], additionalProperties: false,
      properties: { projectId: id, [relation.parameter]: id } } };
    app.put<{ Params: Record<string, string> }>(path, { schema }, async (request, reply) => {
      const projectId = Number(request.params.projectId);
      const memberId = Number(request.params[relation.parameter]);
      requireEntity(db, "projects", projectId);
      requireEntity(db, relation.resource, memberId);
      db.prepare(`INSERT INTO ${relation.table}(project_id,${relation.column}) VALUES (?,?)
        ON CONFLICT(project_id,${relation.column}) DO NOTHING`).run(projectId, memberId);
      return reply.code(204).send();
    });
    app.delete<{ Params: Record<string, string> }>(path, { schema }, async (request, reply) => {
      const projectId = Number(request.params.projectId);
      const memberId = Number(request.params[relation.parameter]);
      requireEntity(db, "projects", projectId);
      requireEntity(db, relation.resource, memberId);
      db.prepare(`DELETE FROM ${relation.table} WHERE project_id=? AND ${relation.column}=?`).run(projectId, memberId);
      return reply.code(204).send();
    });
  }
}
