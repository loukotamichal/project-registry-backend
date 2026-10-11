import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

export type AppDatabase = Database.Database;

export function openDatabase(databasePath: string): AppDatabase {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  const enabled = db.pragma("foreign_keys", { simple: true });

  if (enabled !== 1) {
    db.close();
    throw new Error("SQLite foreign_keys could not be enabled.");
  }

  return db;
}
