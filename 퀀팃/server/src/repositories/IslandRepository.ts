import Database from 'better-sqlite3';

export interface Island {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export class IslandRepository {
  constructor(private db: Database.Database) {}

  getAll(): Island[] {
    return this.db
      .prepare('SELECT * FROM islands ORDER BY sort_order ASC')
      .all() as Island[];
  }

  getById(id: string): Island | null {
    const row = this.db
      .prepare('SELECT * FROM islands WHERE id = ?')
      .get(id) as Island | undefined;
    return row ?? null;
  }
}
