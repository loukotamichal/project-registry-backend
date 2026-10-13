import type { AppDatabase } from "./db.ts";

// user_version is reserved for the demo-seed marker in this first schema version.
export function seedDemoData(db: AppDatabase): void {
  db.transaction(() => {
    if (db.pragma("user_version", { simple: true }) !== 0) return;
    const { total } = db.prepare(`SELECT
      (SELECT count(*) FROM projects) + (SELECT count(*) FROM people) +
      (SELECT count(*) FROM teams) AS total`).get() as { total: number };
    // Existing data belong to the user; never inject demo records into them.
    if (total === 0) {
      const team = db.prepare("INSERT INTO teams(name, description) VALUES (?, ?)");
      const alfa = Number(team.run("Tým Alfa", "Ukázkový vývojový tým").lastInsertRowid);
      const beta = Number(team.run("Tým Beta", "Ukázkový analytický tým").lastInsertRowid);
      const person = db.prepare("INSERT INTO people(name,email,job_title,team_id) VALUES (?,?,?,?)");
      person.run("Osoba 001", "osoba001@example.com", "Vývojář", alfa);
      const second = Number(person.run("Osoba 002", "osoba002@example.com", "Analytik", alfa).lastInsertRowid);
      const third = Number(person.run("Osoba 003", "osoba003@example.com", "Vedoucí projektu", beta).lastInsertRowid);
      const project = Number(db.prepare(`INSERT INTO projects(name,description,status,start_date)
        VALUES (?,?,?,?)`).run("Projekt Orion", "Syntetický demonstrační projekt.", "planned", "2026-11-01").lastInsertRowid);
      db.prepare("INSERT INTO project_teams VALUES (?,?)").run(project, alfa);
      const direct = db.prepare("INSERT INTO project_people VALUES (?,?)");
      direct.run(project, second);
      direct.run(project, third);
      // Osoba 001 participates only through Alfa, Osoba 002 through both sources.
    }
    db.pragma("user_version = 1");
  })();
}
