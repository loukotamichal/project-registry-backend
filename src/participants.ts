import type { AppDatabase } from "./db.ts";
import type { Person, Project } from "./routes/shared.ts";

type Sources = { direct: boolean; viaTeam: boolean };
type SqlSources = { direct: number; viaTeam: number };

export function projectParticipants(db: AppDatabase, projectId: number) {
  // EXISTS yields one result per person even if both assignment paths exist.
  const rows = db.prepare(`SELECT p.id,p.name,p.email,p.job_title AS jobTitle,p.team_id AS teamId,t.name AS teamName,
    EXISTS(SELECT 1 FROM project_people pp WHERE pp.project_id=@project AND pp.person_id=p.id) AS direct,
    EXISTS(SELECT 1 FROM project_teams pt WHERE pt.project_id=@project AND pt.team_id=p.team_id) AS viaTeam
    FROM people p JOIN teams t ON t.id=p.team_id
    WHERE EXISTS(SELECT 1 FROM project_people pp WHERE pp.project_id=@project AND pp.person_id=p.id)
       OR EXISTS(SELECT 1 FROM project_teams pt WHERE pt.project_id=@project AND pt.team_id=p.team_id)
    ORDER BY p.id`).all({ project: projectId }) as (Person & { teamName: string } & SqlSources)[];
  return rows.map(row => ({ ...row, direct: row.direct === 1, viaTeam: row.viaTeam === 1 }));
}

export function personProjects(db: AppDatabase, personId: number): (Project & Sources)[] {
  const rows = db.prepare(`SELECT p.id,p.name,p.description,p.status,p.start_date AS startDate,p.end_date AS endDate,
    EXISTS(SELECT 1 FROM project_people pp WHERE pp.project_id=p.id AND pp.person_id=@person) AS direct,
    EXISTS(SELECT 1 FROM project_teams pt JOIN people member ON member.team_id=pt.team_id
      WHERE pt.project_id=p.id AND member.id=@person) AS viaTeam
    FROM projects p
    WHERE EXISTS(SELECT 1 FROM project_people pp WHERE pp.project_id=p.id AND pp.person_id=@person)
       OR EXISTS(SELECT 1 FROM project_teams pt JOIN people member ON member.team_id=pt.team_id
          WHERE pt.project_id=p.id AND member.id=@person)
    ORDER BY p.id`).all({ person: personId }) as (Project & SqlSources)[];
  return rows.map(row => ({ ...row, direct: row.direct === 1, viaTeam: row.viaTeam === 1 }));
}
