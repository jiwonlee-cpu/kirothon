import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface Invite {
  id: string;
  token: string;
  email: string;
  department: string | null;
  created_by: string;
  used: number;
  expires_at: string;
  created_at: string;
}

export class InviteRepository {
  constructor(private db: Database.Database) {}

  create(params: {
    token: string;
    email: string;
    department?: string;
    createdBy: string;
    expiresAt: string;
  }): Invite {
    const id = uuidv4();
    this.db
      .prepare(
        `INSERT INTO invites (id, token, email, department, created_by, used, expires_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`
      )
      .run(id, params.token, params.email, params.department ?? null, params.createdBy, params.expiresAt);

    return this.findById(id)!;
  }

  findByToken(token: string): Invite | null {
    const row = this.db
      .prepare('SELECT * FROM invites WHERE token = ?')
      .get(token) as Invite | undefined;
    return row ?? null;
  }

  findById(id: string): Invite | null {
    const row = this.db
      .prepare('SELECT * FROM invites WHERE id = ?')
      .get(id) as Invite | undefined;
    return row ?? null;
  }

  markUsed(token: string): void {
    this.db.prepare('UPDATE invites SET used = 1 WHERE token = ?').run(token);
  }

  findAll(): Invite[] {
    return this.db.prepare('SELECT * FROM invites ORDER BY created_at DESC').all() as Invite[];
  }
}
