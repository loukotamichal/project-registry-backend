import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { buildApp } from "./app.ts";
import { openDatabase } from "./db.ts";
import { initializeSchema } from "./schema.ts";

function setup(t: TestContext) {
  const db = openDatabase(":memory:");
  initializeSchema(db);
  const app = buildApp(db);
  t.after(async () => { await app.close(); db.close(); });
  return { app, db };
}
const projectInput = { name: "Projekt Test", description: "Syntetický projekt", status: "planned", startDate: "2026-11-01", endDate: "2026-11-30" };

test("projects CRUD, real dates and merged PATCH validation", async t => {
  const { app } = setup(t);
  const create = await app.inject({ method: "POST", url: "/api/projects", payload: projectInput });
  assert.equal(create.statusCode, 201);
  const id = create.json().id;
  assert.equal(create.headers.location, `/api/projects/${id}`);
  assert.equal((await app.inject(`/api/projects/${id}`)).json().name, projectInput.name);
  assert.equal((await app.inject("/api/projects")).json().items.length, 1);
  const invalid = await app.inject({ method: "PATCH", url: `/api/projects/${id}`, payload: { startDate: "2026-12-01" } });
  assert.equal(invalid.statusCode, 400);
  assert.equal((await app.inject(`/api/projects/${id}`)).json().startDate, "2026-11-01");
  for (const payload of [{}, { unknown: true }, { name: "   " }, { status: "other" }, { startDate: "2026-02-30" }, { name: 123 }]) {
    assert.equal((await app.inject({ method: "PATCH", url: `/api/projects/${id}`, payload })).statusCode, 400);
  }
  assert.equal((await app.inject({ method: "PATCH", url: `/api/projects/${id}`, payload: { status: "completed", endDate: null } })).statusCode, 200);
  const deleted = await app.inject({ method: "DELETE", url: `/api/projects/${id}` });
  assert.equal(deleted.statusCode, 204);
  assert.equal(deleted.body, "");
  assert.equal((await app.inject(`/api/projects/${id}`)).statusCode, 404);
  assert.equal((await app.inject("/api/projects/not-an-id")).statusCode, 400);
});

test("people require a team, normalize emails and prevent deleting occupied teams", async t => {
  const { app } = setup(t);
  const createdTeam = await app.inject({ method: "POST", url: "/api/teams", payload: { name: "Tým Test" } });
  assert.equal(createdTeam.statusCode, 201);
  const teamId = createdTeam.json().id;
  const person = { name: "Osoba Test", email: "OSOBA.TEST@example.com", jobTitle: "Analytik", teamId };
  assert.equal((await app.inject({ method: "POST", url: "/api/people", payload: { ...person, teamId: undefined } })).statusCode, 400);
  assert.equal((await app.inject({ method: "POST", url: "/api/people", payload: { ...person, teamId: 999 } })).statusCode, 404);
  assert.equal((await app.inject({ method: "POST", url: "/api/people", payload: { ...person, email: "bad-email" } })).statusCode, 400);
  const created = await app.inject({ method: "POST", url: "/api/people", payload: person });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().email, "osoba.test@example.com");
  assert.equal((await app.inject({ method: "POST", url: "/api/people", payload: { ...person, email: "osoba.test@example.com" } })).statusCode, 409);
  assert.equal((await app.inject({ method: "DELETE", url: `/api/teams/${teamId}` })).statusCode, 409);
  assert.equal((await app.inject({ method: "PATCH", url: `/api/people/${created.json().id}`, payload: { jobTitle: "Vývojář" } })).statusCode, 200);
  assert.equal((await app.inject({ method: "PATCH", url: `/api/teams/${teamId}`, payload: { name: "Upravený tým" } })).statusCode, 200);
  assert.equal((await app.inject({ method: "DELETE", url: `/api/people/${created.json().id}` })).statusCode, 204);
  assert.equal((await app.inject({ method: "DELETE", url: `/api/teams/${teamId}` })).statusCode, 204);
});
