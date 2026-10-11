import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildApp } from "./app.ts";
import { openDatabase } from "./db.ts";

const db = openDatabase(":memory:");
const app = buildApp(db);

after(() => {
  db.close();
});

test("enables SQLite foreign_keys", () => {
  const enabled = db.pragma("foreign_keys", { simple: true });
  assert.equal(enabled, 1);
});

test("GET /api/health returns ok when SELECT 1 works", async () => {
  const response = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok", database: "ok" });
});

test("GET /api/health returns error when the database is closed", async () => {
  const closed = openDatabase(":memory:");
  const failingApp = buildApp(closed);
  closed.close();

  const response = await failingApp.inject({
    method: "GET",
    url: "/api/health",
  });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), { status: "error", database: "error" });
});
