import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { buildApp } from "./app.ts";
import { openDatabase } from "./db.ts";
import { initializeSchema } from "./schema.ts";
import { seedDemoData } from "./seed.ts";

function setup(t: TestContext) {
  const db = openDatabase(":memory:");
  initializeSchema(db); seedDemoData(db);
  const app = buildApp(db);
  t.after(async () => { await app.close(); db.close(); });
  return { app, db };
}

test("participants are unique and removing direct assignment preserves team participation", async t => {
  const { app } = setup(t);
  const initial = (await app.inject("/api/projects/1")).json();
  assert.equal(initial.participants.length, 3);
  assert.deepEqual(initial.participants.map((p: { id: number }) => p.id), [1, 2, 3]);
  assert.equal(initial.participants[1].direct, true);
  assert.equal(initial.participants[1].viaTeam, true);
  for (let n = 0; n < 2; n++) {
    assert.equal((await app.inject({ method: "PUT", url: "/api/projects/1/people/2" })).statusCode, 204);
    assert.equal((await app.inject({ method: "PUT", url: "/api/projects/1/teams/1" })).statusCode, 204);
  }
  assert.equal((await app.inject("/api/projects/1")).json().directPeople.length, 2);
  for (let n = 0; n < 2; n++) {
    assert.equal((await app.inject({ method: "DELETE", url: "/api/projects/1/people/2" })).statusCode, 204);
  }
  const participants = (await app.inject("/api/projects/1")).json().participants;
  assert.equal(participants.length, 3);
  assert.equal(participants[1].direct, false);
  assert.equal(participants[1].viaTeam, true);
  await app.inject({ method: "DELETE", url: "/api/projects/1/teams/1" });
  assert.deepEqual((await app.inject("/api/projects/1")).json().participants.map((p: { id: number }) => p.id), [3]);
  assert.equal((await app.inject({ method: "PUT", url: "/api/projects/1/people/999" })).statusCode, 404);
});

test("moving between teams changes effective projects but preserves direct assignments", async t => {
  const { app } = setup(t);
  assert.equal((await app.inject("/api/people/1")).json().projects.length, 1);
  assert.equal((await app.inject({ method: "PATCH", url: "/api/people/1", payload: { teamId: 2 } })).statusCode, 200);
  assert.equal((await app.inject("/api/people/1")).json().projects.length, 0);
  await app.inject({ method: "PATCH", url: "/api/people/2", payload: { teamId: 2 } });
  const person = (await app.inject("/api/people/2")).json();
  assert.equal(person.team.id, 2);
  assert.equal(person.projects.length, 1);
  assert.equal(person.projects[0].direct, true);
  assert.equal(person.projects[0].viaTeam, false);
  assert.equal((await app.inject("/api/teams/1")).json().members.length, 0);
  assert.equal((await app.inject({ method: "DELETE", url: "/api/teams/1" })).statusCode, 204);
  assert.equal((await app.inject("/api/projects/1")).json().teams.length, 0);
});

test("deleting a person or project cascades only relationship rows", async t => {
  const { app, db } = setup(t);
  await app.inject({ method: "DELETE", url: "/api/people/2" });
  assert.equal((db.prepare("SELECT count(*) AS n FROM project_people WHERE person_id=2").get() as { n: number }).n, 0);
  assert.equal((await app.inject("/api/projects/1")).statusCode, 200);
  await app.inject({ method: "DELETE", url: "/api/projects/1" });
  assert.equal((db.prepare("SELECT count(*) AS n FROM project_people").get() as { n: number }).n, 0);
  assert.equal((db.prepare("SELECT count(*) AS n FROM project_teams").get() as { n: number }).n, 0);
  assert.equal((await app.inject("/api/people")).json().items.length, 2);
  assert.equal((await app.inject("/api/teams")).json().items.length, 2);
});
