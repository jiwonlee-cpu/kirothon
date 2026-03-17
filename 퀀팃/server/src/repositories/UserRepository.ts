import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'onboardee' | 'hr_admin';
  department: string | null;
  created_at: string;
}

export class UserRepository {
  constructor(private db: Database.Database) {}

  create(params: {
    email: string;
    name: string;
    passwordHash: string;
    role: 'onboardee' | 'hr_admin';
    department?: string;
  }): User {
    const id = uuidv4();
    this.db
      .prepare(
        `INSERT INTO users (id, email, name, password_hash, role, department)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, params.email, params.name, params.passwordHash, params.role, params.department ?? null);

    return this.findById(id)!;
  }

  findById(id: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as User | undefined;
    return row ?? null;
  }

  findByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as User | undefined;
    return row ?? null;
  }
}
