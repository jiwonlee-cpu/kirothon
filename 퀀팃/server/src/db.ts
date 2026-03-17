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
 * 기본 4개 Island 및 HR 섬 샘플 미션 시드 데이터 삽입
 */
function seedData(db: Database.Database): void {
  const islandCount = db.prepare('SELECT COUNT(*) as count FROM islands').get() as { count: number };
  if (islandCount.count > 0) return;

  // 기본 4개 Island 시드 데이터
  const islands = [
    { id: uuidv4(), name: 'HR 섬', slug: 'hr', description: 'HR 관련 실무 정보와 회사 생활 필수 안내를 제공하는 섬입니다.', icon: '🏢', sort_order: 1 },
    { id: uuidv4(), name: '머니터링 섬', slug: 'monitoring', description: '머니터링 본부의 제품과 업무를 소개하는 섬입니다.', icon: '📊', sort_order: 2 },
    { id: uuidv4(), name: '플랜팃 섬', slug: 'planit', description: '플랜팃 본부의 제품과 업무를 소개하는 섬입니다.', icon: '🌱', sort_order: 3 },
    { id: uuidv4(), name: 'finter 섬', slug: 'finter', description: 'finter 본부의 제품과 업무를 소개하는 섬입니다.', icon: '💰', sort_order: 4 },
  ];

  const insertIsland = db.prepare(
    'INSERT INTO islands (id, name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const island of islands) {
    insertIsland.run(island.id, island.name, island.slug, island.description, island.icon, island.sort_order);
  }

  // HR 섬 샘플 미션 시드 데이터
  const hrIslandId = islands[0].id;

  const missions = [
    {
      id: uuidv4(),
      island_id: hrIslandId,
      title: '화장실 & 편의시설 위치 안내',
      description: '사무실 내 화장실, 탕비실, 휴게실 등 편의시설 위치를 확인하세요.',
      type: 'info',
      content: JSON.stringify({
        blocks: [
          { type: 'text', body: '## 🚻 화장실 위치\n\n- **본관 1층**: 엘리베이터 옆 (남/여 구분)\n- **본관 2층**: 회의실 복도 끝\n- **별관**: 각 층 계단 옆\n\n## 🍵 탕비실\n\n- **본관 3층**: 정수기, 전자레인지, 커피머신 구비\n- **별관 2층**: 간단한 다과 및 음료 구비\n\n## 🛋️ 휴게실\n\n- **본관 5층**: 소파, 안마의자, 수면실 이용 가능\n- 이용 시간: 자유 (단, 수면실은 1시간 이내)' },
        ],
      }),
      sort_order: 1,
    },
    {
      id: uuidv4(),
      island_id: hrIslandId,
      title: '커피머신 사용법',
      description: '사무실 커피머신 사용 방법을 알아보세요.',
      type: 'info',
      content: JSON.stringify({
        blocks: [
          { type: 'text', body: '## ☕ 커피머신 사용법\n\n### 위치\n본관 3층 탕비실\n\n### 사용 방법\n1. 컵을 머신 아래에 놓습니다\n2. 원하는 메뉴 버튼을 누릅니다 (아메리카노, 라떼, 카푸치노 등)\n3. 추출이 완료될 때까지 기다립니다\n4. 사용 후 드립 트레이에 물이 고이면 비워주세요\n\n### 주의사항\n- 원두가 부족하면 탕비실 캐비닛에서 보충해주세요\n- 물탱크가 비면 정수기 물로 채워주세요\n- 고장 시 총무팀(내선 1234)에 연락해주세요' },
        ],
      }),
      sort_order: 2,
    },
    {
      id: uuidv4(),
      island_id: hrIslandId,
      title: '그룹웨어 가입하기',
      description: '회사 그룹웨어에 가입하고 기본 설정을 완료하세요.',
      type: 'task',
      content: JSON.stringify({
        steps: [
          { id: 's1', title: '그룹웨어 접속', description: 'https://groupware.company.com 에 접속합니다.' },
          { id: 's2', title: '회원가입', description: '회사 이메일로 회원가입을 진행합니다. 인증 메일을 확인하세요.' },
          { id: 's3', title: '프로필 설정', description: '이름, 부서, 직책, 프로필 사진을 설정합니다.' },
          { id: 's4', title: '알림 설정', description: '이메일 및 모바일 알림 설정을 확인합니다.' },
        ],
      }),
      sort_order: 3,
    },
    {
      id: uuidv4(),
      island_id: hrIslandId,
      title: '프린터 연결하기',
      description: '사무실 프린터를 내 PC에 연결하세요.',
      type: 'task',
      content: JSON.stringify({
        steps: [
          { id: 's1', title: '프린터 드라이버 설치', description: '사내 포털 > IT 지원 > 프린터 드라이버에서 다운로드합니다.' },
          { id: 's2', title: '프린터 추가', description: '설정 > 프린터 및 스캐너 > 프린터 추가에서 네트워크 프린터를 검색합니다.' },
          { id: 's3', title: '테스트 인쇄', description: '테스트 페이지를 인쇄하여 정상 작동을 확인합니다.' },
        ],
      }),
      sort_order: 4,
    },
    {
      id: uuidv4(),
      island_id: hrIslandId,
      title: '회의실 예약 방법 익히기',
      description: '회의실 예약 시스템 사용법을 배우세요.',
      type: 'task',
      content: JSON.stringify({
        steps: [
          { id: 's1', title: '예약 시스템 접속', description: '그룹웨어 > 회의실 예약 메뉴로 이동합니다.' },
          { id: 's2', title: '회의실 확인', description: '층별 회의실 목록과 수용 인원을 확인합니다.' },
          { id: 's3', title: '예약 실습', description: '원하는 날짜/시간에 회의실을 예약해봅니다. (테스트 후 취소 가능)' },
        ],
      }),
      sort_order: 5,
    },
    {
      id: uuidv4(),
      island_id: hrIslandId,
      title: '백엔드 개발자 장지창님과 대화해보기',
      description: '머니터링 본부의 백엔드 개발자 장지창님을 만나보세요!',
      type: 'communication',
      content: JSON.stringify({
        npc: {
          name: '장지창',
          emoji: '👨‍💻',
          color: 'blue',
          team: '머니터링 본부',
          position: '백엔드 개발자',
          bio: '92년생의 장지창님은 머니터링 본부에서 백엔드 개발자로 일하고 있어요! 성격은 INTJ. 맛집 탐험을 좋아해요!',
          tags: ['INTJ', '맛집탐험', '백엔드'],
        },
        dialogue: [
          '안녕하세요! 저는 머니터링 본부의 백엔드 개발자 장지창입니다.',
          '저는 맛있는 음식 찾아다니는 걸 좋아해요. 특히 치킨을 정말 좋아합니다!',
          '지창님과 음식 취향에 대해서 얘기해보고 퀴즈를 풀어볼까요?',
        ],
        quiz: {
          question: '지창님이 제일 좋아하는 치킨 브랜드는?',
          options: ['네네치킨', '교촌치킨', 'BHC', '푸라닭치킨'],
          correctIndex: 1,
          explanation: '교촌치킨은 순살만 시켜도 닭다리로 조리하기 때문에 좋아해요! 지창님의 원픽은 교촌 허니콤보 순살이랍니다. 🍗',
        },
        activityDescription: '장지창님을 찾아가서 인사하고 퀴즈를 풀어보세요!',
        requiredEvidence: 'quiz',
      }),
      sort_order: 6,
    },
    {
      id: uuidv4(),
      island_id: hrIslandId,
      title: '디자이너 박소연님과 대화해보기',
      description: '플랜팃 본부의 프로덕트 디자이너 박소연님을 만나보세요!',
      type: 'communication',
      content: JSON.stringify({
        npc: {
          name: '박소연',
          emoji: '👩‍🎨',
          color: 'green',
          team: '플랜팃 본부',
          position: '프로덕트 디자이너',
          bio: '95년생의 박소연님은 플랜팃 본부에서 프로덕트 디자이너로 일하고 있어요! 성격은 ENFP. 고양이 두 마리를 키우고 있어요!',
          tags: ['ENFP', '고양이집사', 'UI/UX'],
        },
        dialogue: [
          '안녕하세요~ 플랜팃 본부 디자이너 박소연이에요!',
          '저는 고양이 두 마리를 키우고 있어요. 이름은 모찌랑 콩이!',
          '소연님의 고양이에 대해 퀴즈를 풀어볼까요?',
        ],
        quiz: {
          question: '소연님의 고양이 모찌의 품종은?',
          options: ['러시안블루', '브리티시숏헤어', '스코티시폴드', '먼치킨'],
          correctIndex: 2,
          explanation: '모찌는 귀가 접힌 스코티시폴드예요! 동글동글한 얼굴이 모찌를 닮아서 이름을 모찌로 지었대요. 🐱',
        },
        activityDescription: '박소연님을 찾아가서 인사하고 퀴즈를 풀어보세요!',
        requiredEvidence: 'quiz',
      }),
      sort_order: 7,
    },
    {
      id: uuidv4(),
      island_id: hrIslandId,
      title: 'PM 김태현님과 대화해보기',
      description: 'finter 본부의 프로덕트 매니저 김태현님을 만나보세요!',
      type: 'communication',
      content: JSON.stringify({
        npc: {
          name: '김태현',
          emoji: '👨‍💼',
          color: 'gold',
          team: 'finter 본부',
          position: '프로덕트 매니저',
          bio: '90년생의 김태현님은 finter 본부에서 PM으로 일하고 있어요! 성격은 ENTJ. 주말마다 등산을 즐기는 아웃도어파!',
          tags: ['ENTJ', '등산러', 'PM'],
        },
        dialogue: [
          '반갑습니다! finter 본부 PM 김태현입니다.',
          '저는 주말마다 산에 가요. 서울 근교 산은 거의 다 가봤죠!',
          '태현님의 등산 취미에 대해 퀴즈를 풀어볼까요?',
        ],
        quiz: {
          question: '태현님이 가장 좋아하는 서울 근교 산은?',
          options: ['북한산', '관악산', '도봉산', '청계산'],
          correctIndex: 0,
          explanation: '북한산 백운대 코스를 제일 좋아해요! 정상에서 보는 서울 전경이 최고라고 합니다. ⛰️',
        },
        activityDescription: '김태현님을 찾아가서 인사하고 퀴즈를 풀어보세요!',
        requiredEvidence: 'quiz',
      }),
      sort_order: 8,
    },
  ];

  const insertMission = db.prepare(
    'INSERT INTO missions (id, island_id, title, description, type, content, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  // 체크리스트 스텝도 별도 테이블에 삽입
  const insertChecklistStep = db.prepare(
    'INSERT INTO checklist_steps (id, mission_id, title, description, sort_order) VALUES (?, ?, ?, ?, ?)'
  );

  for (const mission of missions) {
    insertMission.run(mission.id, mission.island_id, mission.title, mission.description, mission.type, mission.content, mission.sort_order);

    // task 타입 미션의 체크리스트 스텝을 checklist_steps 테이블에도 삽입
    if (mission.type === 'task') {
      const content = JSON.parse(mission.content) as { steps: Array<{ id: string; title: string; description: string }> };
      for (let i = 0; i < content.steps.length; i++) {
        const step = content.steps[i];
        insertChecklistStep.run(uuidv4(), mission.id, step.title, step.description, i + 1);
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
