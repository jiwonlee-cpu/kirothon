import { describe, it, expect, afterEach } from 'vitest';
import { initializeDatabase } from './db.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-onboarding-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const db = initializeDatabase(dbPath);
  return { db, dbPath };
}

describe('Database Schema', () => {
  const cleanups: Array<{ db: ReturnType<typeof initializeDatabase>; dbPath: string }> = [];

  afterEach(() => {
    for (const { db, dbPath } of cleanups) {
      db.close();
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      const walPath = dbPath + '-wal';
      const shmPath = dbPath + '-shm';
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    }
    cleanups.length = 0;
  });

  it('should create all required tables', () => {
    const { db, dbPath } = createTestDb();
    cleanups.push({ db, dbPath });

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all() as Array<{ name: string }>;

    const tableNames = tables.map(t => t.name).sort();
    expect(tableNames).toEqual([
      'badges',
      'chat_messages',
      'checklist_steps',
      'employee_pool',
      'invite_configs',
      'invites',
      'islands',
      'mission_progress',
      'missions',
      'quizzes',
      'users',
    ]);
  });

  it('should seed 4 default islands', () => {
    const { db, dbPath } = createTestDb();
    cleanups.push({ db, dbPath });

    const islands = db.prepare('SELECT * FROM islands ORDER BY sort_order').all() as Array<{ name: string; slug: string; sort_order: number }>;
    expect(islands).toHaveLength(4);
    expect(islands[0].name).toBe('HR 섬');
    expect(islands[0].slug).toBe('hr');
    expect(islands[1].name).toBe('머니터링 섬');
    expect(islands[2].name).toBe('플랜팃 섬');
    expect(islands[3].name).toBe('finter 섬');
  });

  it('should seed HR island missions', () => {
    const { db, dbPath } = createTestDb();
    cleanups.push({ db, dbPath });

    const hrIsland = db.prepare("SELECT id FROM islands WHERE slug = 'hr'").get() as { id: string };
    const missions = db.prepare('SELECT * FROM missions WHERE island_id = ? ORDER BY sort_order').all(hrIsland.id) as Array<{ title: string; type: string }>;

    expect(missions).toHaveLength(6);
    expect(missions[0].title).toBe('화장실 & 편의시설 위치 안내');
    expect(missions[0].type).toBe('info');
    expect(missions[1].title).toBe('커피머신 사용법');
    expect(missions[1].type).toBe('info');
    expect(missions[2].title).toBe('그룹웨어 가입하기');
    expect(missions[2].type).toBe('task');
    expect(missions[3].title).toBe('프린터 연결하기');
    expect(missions[3].type).toBe('task');
    expect(missions[4].title).toBe('회의실 예약 방법 익히기');
    expect(missions[4].type).toBe('task');
    expect(missions[5].title).toBe('팀 리더와 인사하기');
    expect(missions[5].type).toBe('communication');
  });

  it('should seed checklist steps for task missions', () => {
    const { db, dbPath } = createTestDb();
    cleanups.push({ db, dbPath });

    const hrIsland = db.prepare("SELECT id FROM islands WHERE slug = 'hr'").get() as { id: string };
    const taskMissions = db.prepare("SELECT id, title FROM missions WHERE island_id = ? AND type = 'task' ORDER BY sort_order").all(hrIsland.id) as Array<{ id: string; title: string }>;

    expect(taskMissions).toHaveLength(3);

    // 그룹웨어 가입하기 — 4 steps
    const groupwareSteps = db.prepare('SELECT * FROM checklist_steps WHERE mission_id = ? ORDER BY sort_order').all(taskMissions[0].id);
    expect(groupwareSteps).toHaveLength(4);

    // 프린터 연결하기 — 3 steps
    const printerSteps = db.prepare('SELECT * FROM checklist_steps WHERE mission_id = ? ORDER BY sort_order').all(taskMissions[1].id);
    expect(printerSteps).toHaveLength(3);

    // 회의실 예약 — 3 steps
    const meetingSteps = db.prepare('SELECT * FROM checklist_steps WHERE mission_id = ? ORDER BY sort_order').all(taskMissions[2].id);
    expect(meetingSteps).toHaveLength(3);
  });

  it('should not duplicate seed data on re-initialization', () => {
    const { db, dbPath } = createTestDb();
    cleanups.push({ db, dbPath });

    // Close and re-initialize with same path
    db.close();
    const db2 = initializeDatabase(dbPath);
    cleanups[0] = { db: db2, dbPath };

    const islands = db2.prepare('SELECT COUNT(*) as count FROM islands').get() as { count: number };
    expect(islands.count).toBe(4);
  });

  it('should enforce foreign key constraints', () => {
    const { db, dbPath } = createTestDb();
    cleanups.push({ db, dbPath });

    expect(() => {
      db.prepare("INSERT INTO missions (id, island_id, title, type, sort_order) VALUES ('test', 'nonexistent', 'Test', 'info', 1)").run();
    }).toThrow();
  });
});
