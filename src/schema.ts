import type { AppDatabase } from "./db.ts";

export function initializeSchema(db: AppDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND 120),
      description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 5000)
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
      description TEXT NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 5000),
      status TEXT NOT NULL CHECK(status IN ('planned', 'in_progress', 'completed')),
      start_date TEXT NOT NULL CHECK(length(start_date) = 10),
      end_date TEXT CHECK(end_date IS NULL OR (length(end_date) = 10 AND end_date >= start_date))
    );
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
      email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(email)) BETWEEN 3 AND 254),
      job_title TEXT NOT NULL CHECK(length(trim(job_title)) BETWEEN 1 AND 120),
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS project_people (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      PRIMARY KEY(project_id, person_id)
    );
    CREATE TABLE IF NOT EXISTS project_teams (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      PRIMARY KEY(project_id, team_id)
    );
    CREATE INDEX IF NOT EXISTS people_team_idx ON people(team_id);
    CREATE INDEX IF NOT EXISTS project_people_person_idx ON project_people(person_id);
    CREATE INDEX IF NOT EXISTS project_teams_team_idx ON project_teams(team_id);
  `);
}
