import assert from "node:assert/strict";
import { test } from "node:test";
import { openDatabase } from "./db.ts";
import { initializeSchema } from "./schema.ts";
import { seedDemoData } from "./seed.ts";

test("schema enforces membership, unique assignments and cascade deletion", () => {
  const db = openDatabase(":memory:");
  try {
    initializeSchema(db);
    seedDemoData(db);
    const project = db.prepare("SELECT id FROM projects").get() as { id: number };
    const person = db.prepare("SELECT id, team_id FROM people ORDER BY id LIMIT 1").get() as { id: number; team_id: number };
    assert.throws(() => db.prepare("INSERT INTO people(name,email,job_title) VALUES ('Osoba X','x@example.com','Analytik')").run());
    assert.throws(() => db.prepare("DELETE FROM teams WHERE id=?").run(person.team_id));
    db.prepare("INSERT INTO project_people VALUES (?,?)").run(project.id, person.id);
    assert.throws(() => db.prepare("INSERT INTO project_people VALUES (?,?)").run(project.id, person.id));
    db.prepare("DELETE FROM projects WHERE id=?").run(project.id);
    assert.equal((db.prepare("SELECT count(*) AS n FROM project_people").get() as { n: number }).n, 0);
    assert.equal((db.prepare("SELECT count(*) AS n FROM project_teams").get() as { n: number }).n, 0);
    assert.equal((db.prepare("SELECT count(*) AS n FROM people").get() as { n: number }).n, 3);
  } finally { db.close(); }
});

test("schema and seed restart never overwrite edits or restore deleted demo data", () => {
  const db = openDatabase(":memory:");
  try {
    initializeSchema(db);
    seedDemoData(db);
    db.prepare("UPDATE teams SET name='Upravený tým' WHERE name='Tým Alfa'").run();
    db.prepare("DELETE FROM projects").run();
    initializeSchema(db);
    seedDemoData(db);
    assert.equal((db.prepare("SELECT count(*) AS n FROM projects").get() as { n: number }).n, 0);
    assert.ok(db.prepare("SELECT id FROM teams WHERE name='Upravený tým'").get());
  } finally { db.close(); }
});
