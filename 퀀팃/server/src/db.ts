import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'onboarding.db');

let dbInstance: Database.Database | null = null;

/**
 * 데이터베이스 스키마 생성
 */
function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('onboardee', 'hr_admin')),
      department TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      department TEXT,
      created_by TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS islands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      island_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK(type IN ('info', 'quiz', 'task', 'communication')),
      content TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (island_id) REFERENCES islands(id)
    );

    CREATE TABLE IF NOT EXISTS invite_configs (
      id TEXT PRIMARY KEY,
      invite_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      requirement TEXT NOT NULL CHECK(requirement IN ('required', 'optional')),
      FOREIGN KEY (invite_id) REFERENCES invites(id),
      FOREIGN KEY (mission_id) REFERENCES missions(id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_answer INTEGER NOT NULL,
      explanation TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (mission_id) REFERENCES missions(id)
    );

    CREATE TABLE IF NOT EXISTS checklist_steps (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (mission_id) REFERENCES missions(id)
    );

    CREATE TABLE IF NOT EXISTS mission_progress (
      id TEXT PRIMARY KEY,
      onboardee_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'completed')),
      requirement TEXT NOT NULL DEFAULT 'required' CHECK(requirement IN ('required', 'optional')),
      progress_data TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (onboardee_id) REFERENCES users(id),
      FOREIGN KEY (mission_id) REFERENCES missions(id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      onboardee_id TEXT NOT NULL,
      island_id TEXT NOT NULL,
      name TEXT NOT NULL,
      earned_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (onboardee_id) REFERENCES users(id),
      FOREIGN KEY (island_id) REFERENCES islands(id)
    );

    CREATE TABLE IF NOT EXISTS employee_pool (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      team TEXT NOT NULL,
      position TEXT NOT NULL,
      email TEXT NOT NULL,
      slack_id TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      onboardee_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      context_island_id TEXT,
      context_mission_id TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (onboardee_id) REFERENCES users(id),
      FOREIGN KEY (context_island_id) REFERENCES islands(id),
      FOREIGN KEY (context_mission_id) REFERENCES missions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
    CREATE INDEX IF NOT EXISTS idx_missions_island_id ON missions(island_id);
    CREATE INDEX IF NOT EXISTS idx_invite_configs_invite_id ON invite_configs(invite_id);
    CREATE INDEX IF NOT EXISTS idx_mission_progress_onboardee_id ON mission_progress(onboardee_id);
    CREATE INDEX IF NOT EXISTS idx_mission_progress_mission_id ON mission_progress(mission_id);
    CREATE INDEX IF NOT EXISTS idx_badges_onboardee_id ON badges(onboardee_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_onboardee_id ON chat_messages(onboardee_id);
    CREATE INDEX IF NOT EXISTS idx_quizzes_mission_id ON quizzes(mission_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_steps_mission_id ON checklist_steps(mission_id);
  `);
}

/**
 * onboarding-missions.json에서 섬/미션 데이터를 읽어 시드 데이터 삽입
 */
function seedData(db: Database.Database): void {
  const islandCount = db.prepare('SELECT COUNT(*) as count FROM islands').get() as { count: number };
  if (islandCount.count > 0) return;

  // onboarding-missions.json 로드
  const missionsJsonPath = path.join(__dirname, '..', '..', 'client', 'onboarding-data', 'onboarding-missions.json');
  const missionsData = JSON.parse(fs.readFileSync(missionsJsonPath, 'utf-8'));

  const insertIsland = db.prepare(
    'INSERT INTO islands (id, name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertMission = db.prepare(
    'INSERT INTO missions (id, island_id, title, description, type, content, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertChecklistStep = db.prepare(
    'INSERT INTO checklist_steps (id, mission_id, title, description, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insertQuiz = db.prepare(
    'INSERT INTO quizzes (id, mission_id, question, options, correct_answer, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  for (const islandData of missionsData.islands) {
    const islandId = uuidv4();
    insertIsland.run(islandId, islandData.name, islandData.slug, islandData.description, islandData.icon, islandData.sort_order);

    for (const missionData of islandData.missions) {
      const missionId = uuidv4();
      const missionType = missionData.type === 'quiz' ? 'info' : missionData.type;

      // quiz 타입은 content에 quizzes 배열을 포함하여 저장
      let content: string;
      if (missionData.type === 'quiz') {
        // 퀴즈 미션: 첫 번째 퀴즈를 communication 스타일 quiz로 변환하여 info로 저장
        content = JSON.stringify({
          blocks: [
            { type: 'text', body: `## 🧠 ${missionData.title}\n\n아래 퀴즈를 풀어보세요!` },
          ],
          quizzes: missionData.content.quizzes,
        });
      } else {
        content = JSON.stringify(missionData.content);
      }

      insertMission.run(missionId, islandId, missionData.title, missionData.description, missionType, content, missionData.sort_order);

      // task 타입: checklist_steps 테이블에도 삽입
      if (missionData.type === 'task' && missionData.content.steps) {
        for (let i = 0; i < missionData.content.steps.length; i++) {
          const step = missionData.content.steps[i];
          insertChecklistStep.run(uuidv4(), missionId, step.title, step.description, i + 1);
        }
      }

      // quiz 타입: quizzes 테이블에도 삽입
      if (missionData.type === 'quiz' && missionData.content.quizzes) {
        for (let i = 0; i < missionData.content.quizzes.length; i++) {
          const q = missionData.content.quizzes[i];
          insertQuiz.run(uuidv4(), missionId, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation, i + 1);
        }
      }
    }
  }
}

/**
 * 데이터베이스 초기화 — 스키마 생성 및 시드 데이터 삽입
 */
export function initializeDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? DB_PATH;
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);

  // WAL 모드 및 외래키 활성화
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createSchema(db);
  seedData(db);

  return db;
}

/**
 * 싱글턴 DB 인스턴스 반환
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}

/**
 * DB 연결 종료
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
