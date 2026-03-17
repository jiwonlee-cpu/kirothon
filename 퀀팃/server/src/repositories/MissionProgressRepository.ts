import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface MissionProgress {
  id: string;
  onboardee_id: string;
  mission_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  requirement: 'required' | 'optional';
  progress_data: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export class MissionProgressRepository {
  constructor(private db: Database.Database) {}

  getByOnboardee(onboardeeId: string): MissionProgress[] {
    return this.db
      .prepare('SELECT * FROM mission_progress WHERE onboardee_id = ?')
      .all(onboardeeId) as MissionProgress[];
  }

  getByOnboardeeAndMission(onboardeeId: string, missionId: string): MissionProgress | null {
    const row = this.db
      .prepare('SELECT * FROM mission_progress WHERE onboardee_id = ? AND mission_id = ?')
      .get(onboardeeId, missionId) as MissionProgress | undefined;
    return row ?? null;
  }

  upsert(onboardeeId: string, missionId: string, status: string, progressData?: string): MissionProgress {
    const existing = this.getByOnboardeeAndMission(onboardeeId, missionId);

    if (existing) {
      const updates: string[] = [`status = ?`, `updated_at = datetime('now')`];
      const params: any[] = [status];

      if (progressData !== undefined) {
        updates.push('progress_data = ?');
        params.push(progressData);
      }
      if (status === 'in_progress' && !existing.started_at) {
        updates.push(`started_at = datetime('now')`);
      }
      if (status === 'completed') {
        updates.push(`completed_at = datetime('now')`);
      }

      params.push(existing.id);
      this.db.prepare(`UPDATE mission_progress SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      return this.getByOnboardeeAndMission(onboardeeId, missionId)!;
    }

    const id = uuidv4();
    const startedAt = status !== 'not_started' ? `datetime('now')` : null;
    const completedAt = status === 'completed' ? `datetime('now')` : null;

    this.db.prepare(
      `INSERT INTO mission_progress (id, onboardee_id, mission_id, status, requirement, progress_data, started_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, 'required', ?, ${startedAt ? `datetime('now')` : 'NULL'}, ${completedAt ? `datetime('now')` : 'NULL'}, datetime('now'))`
    ).run(id, onboardeeId, missionId, status, progressData ?? null);

    return this.getByOnboardeeAndMission(onboardeeId, missionId)!;
  }
}
