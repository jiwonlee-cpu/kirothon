import Database from 'better-sqlite3';

export interface Mission {
  id: string;
  island_id: string;
  title: string;
  description: string | null;
  type: 'info' | 'quiz' | 'task' | 'communication';
  content: string | null;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class MissionRepository {
  constructor(private db: Database.Database) {}

  getByIslandId(islandId: string): Mission[] {
    return this.db
      .prepare('SELECT * FROM missions WHERE island_id = ? AND is_active = 1 ORDER BY sort_order ASC')
      .all(islandId) as Mission[];
  }

  getById(id: string): Mission | null {
    const row = this.db
      .prepare('SELECT * FROM missions WHERE id = ?')
      .get(id) as Mission | undefined;
    return row ?? null;
  }
}
