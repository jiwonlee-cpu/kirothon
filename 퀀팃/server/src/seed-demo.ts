/**
 * 데모용 시드 스크립트
 * HR Admin + Onboardee 계정 생성, HR 섬 미션 progress 생성
 * 실행: npm run seed (또는 npx tsx server/src/seed-demo.ts)
 */
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase } from './db.js';

async function seed() {
  const db = initializeDatabase();

  console.log('🌱 데모 시드 데이터 생성 시작...\n');

  // 1. HR Admin 계정
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@demo.com');
  let adminId: string;

  if (existingAdmin) {
    adminId = (existingAdmin as any).id;
    console.log('✅ HR Admin 계정 이미 존재 (admin@demo.com)');
  } else {
    adminId = uuidv4();
    const adminHash = await bcrypt.hash('admin123', 10);
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(adminId, 'admin@demo.com', 'HR 관리자', adminHash, 'hr_admin', 'HR');
    console.log('✅ HR Admin 계정 생성: admin@demo.com / admin123');
  }

  // 2. Onboardee 계정
  const existingOnboardee = db.prepare('SELECT id FROM users WHERE email = ?').get('newbie@demo.com');
  let onboardeeId: string;

  if (existingOnboardee) {
    onboardeeId = (existingOnboardee as any).id;
    console.log('✅ Onboardee 계정 이미 존재 (newbie@demo.com)');
  } else {
    onboardeeId = uuidv4();
    const onboardeeHash = await bcrypt.hash('newbie123', 10);
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(onboardeeId, 'newbie@demo.com', '신입사원 김데모', onboardeeHash, 'onboardee', 'HR');
    console.log('✅ Onboardee 계정 생성: newbie@demo.com / newbie123');
  }

  // 3. HR 섬의 모든 미션에 대해 mission_progress 생성
  const hrIsland = db.prepare("SELECT id FROM islands WHERE slug = 'hr'").get() as { id: string } | undefined;
  if (!hrIsland) {
    console.error('❌ HR 섬을 찾을 수 없습니다.');
    db.close();
    return;
  }

  const missions = db.prepare('SELECT id, title FROM missions WHERE island_id = ? AND is_active = 1').all(hrIsland.id) as Array<{ id: string; title: string }>;

  const existingProgress = db.prepare('SELECT mission_id FROM mission_progress WHERE onboardee_id = ?').all(onboardeeId) as Array<{ mission_id: string }>;
  const existingMissionIds = new Set(existingProgress.map((p) => p.mission_id));

  let created = 0;
  for (const mission of missions) {
    if (!existingMissionIds.has(mission.id)) {
      db.prepare(
        `INSERT INTO mission_progress (id, onboardee_id, mission_id, status, requirement, updated_at)
         VALUES (?, ?, ?, 'not_started', 'required', datetime('now'))`
      ).run(uuidv4(), onboardeeId, mission.id);
      created++;
    }
  }

  console.log(`✅ HR 섬 미션 ${missions.length}개 중 ${created}개 progress 생성 (required)`);

  console.log('\n🎉 데모 시드 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  HR Admin:   admin@demo.com / admin123');
  console.log('  Onboardee:  newbie@demo.com / newbie123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  db.close();
}

seed().catch(console.error);
