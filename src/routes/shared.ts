import type { AppDatabase } from "../db.ts";

export class ApiError extends Error {
  constructor(public statusCode: number, public code: string, message: string) { super(message); }
}

export const idParams = {
  type: "object", required: ["id"], additionalProperties: false,
  properties: { id: { type: "string", pattern: "^[1-9][0-9]{0,14}$" } },
};
export const text = (maxLength = 120) => ({ type: "string", minLength: 1, maxLength });
export const positiveId = { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER };

export function requiredText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ApiError(400, "VALIDATION_ERROR", "Povinný text nesmí být prázdný.");
  return trimmed;
}

export function requireEntity(db: AppDatabase, table: "projects" | "people" | "teams", id: number): void {
  // Table names come only from this fixed union, all user values are bound parameters.
  if (!db.prepare(`SELECT id FROM ${table} WHERE id=?`).get(id)) {
    throw new ApiError(404, "NOT_FOUND", "Požadovaný záznam neexistuje.");
  }
}

export type Project = { id: number; name: string; description: string; status: string; startDate: string; endDate: string | null };
export type Person = { id: number; name: string; email: string; jobTitle: string; teamId: number };
export type Team = { id: number; name: string; description: string };
export const projectSelect = "SELECT id,name,description,status,start_date AS startDate,end_date AS endDate FROM projects";
export const personSelect = "SELECT id,name,email,job_title AS jobTitle,team_id AS teamId FROM people";
export const teamSelect = "SELECT id,name,description FROM teams";
