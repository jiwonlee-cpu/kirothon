# 구현 계획: 게이미피케이션 기반 HR 온보딩 플랫폼 MVP

## 개요

React 18 + Vite 프론트엔드와 Node.js + Express + SQLite 백엔드로 구성된 게이미피케이션 HR 온보딩 플랫폼 MVP를 구현한다. 데이터 레이어부터 시작하여 서비스 로직, API 엔드포인트, 프론트엔드 순서로 점진적으로 구축한다.

## Tasks

- [x] 1. 프로젝트 구조 및 데이터베이스 설정
  - [x] 1.1 백엔드 프로젝트 초기화 및 의존성 설치
    - Express, better-sqlite3, jsonwebtoken, bcrypt, multer, uuid 설치
    - Vitest, fast-check, supertest 개발 의존성 설치
    - TypeScript 설정 (tsconfig.json)
    - `server/` 디렉토리 구조 생성: controllers, services, repositories, middleware, utils
    - _요구사항: 전체_

  - [x] 1.2 SQLite 데이터베이스 스키마 생성
    - users, invites, invite_configs, islands, missions, quizzes, checklist_steps, mission_progress, badges, employee_pool, chat_messages 테이블 생성
    - 기본 4개 Island 시드 데이터 삽입 (머니터링 섬, 플랜팃 섬, finter 섬, HR 섬)
    - DB 초기화 및 마이그레이션 스크립트 작성
    - _요구사항: 3.1_

  - [ ]* 1.3 데이터베이스 스키마 단위 테스트 작성
    - 기본 4개 Island 존재 확인 테스트
    - 테이블 생성 및 기본 CRUD 동작 확인
    - _요구사항: 3.1_

- [x] 2. 인증 및 초대 시스템 구현
  - [x] 2.1 InviteService 및 InviteRepository 구현
    - 초대 링크 생성 (고유 토큰 생성, 7일 만료 설정)
    - 토큰 유효성 검증 (만료 여부, 사용 여부 확인)
    - 토큰 사용 처리 (used 플래그 업데이트)
    - _요구사항: 1.1, 1.5, 1.6_

  - [ ]* 2.2 초대 토큰 프로퍼티 테스트 작성
    - **Property 1: 초대 토큰 고유성** — 임의의 이메일+본부 조합으로 생성된 토큰이 모두 고유한지 검증
    - **검증 대상: 요구사항 1.1**
    - **Property 2: 초대 링크 만료 판정** — 7일 경과 토큰은 무효, 7일 이내 미사용 토큰은 유효한지 검증
    - **검증 대상: 요구사항 1.5**
    - **Property 3: 사용된 초대 토큰 재사용 차단** — 사용된 토큰으로 재가입 시도 시 거부되는지 검증
    - **검증 대상: 요구사항 1.6**

  - [x] 2.3 InviteConfig 서비스 구현
    - Invite_Config 저장 (Island별 미션의 Required/Optional 설정)
    - Invite_Config 조회
    - 초대 링크에 config 연결
    - _요구사항: 1.2, 1.3, 3.6, 3.7_

  - [ ]* 2.4 InviteConfig 프로퍼티 테스트 작성
    - **Property 4: Invite_Config 저장 라운드트립** — 저장 후 조회 시 동일한 설정 반환 검증
    - **검증 대상: 요구사항 1.3, 3.7**

  - [x] 2.5 AuthService 및 Auth Controller 구현
    - 초대 기반 계정 생성 (POST /api/auth/register)
    - 로그인 (POST /api/auth/login) — JWT 발급
    - 인증 미들웨어 (JWT 검증, 역할 기반 접근 제어)
    - 계정 생성 시 Invite_Config를 mission_progress에 적용
    - _요구사항: 1.4, 1.7_

  - [ ]* 2.6 Invite_Config → Onboardee 미션 설정 적용 프로퍼티 테스트 작성
    - **Property 5: Invite_Config → Onboardee 미션 설정 적용** — Onboardee 미션 조회 시 requirement가 Invite_Config와 일치하는지 검증
    - **검증 대상: 요구사항 1.7, 3.8**

  - [x] 2.7 초대 API 엔드포인트 구현
    - POST /api/invites — 초대 링크 생성 (HR_Admin 전용)
    - GET /api/invites/:token — 초대 링크 유효성 검증
    - 이메일 발송 서비스 연동 (초대 링크 전송)
    - _요구사항: 1.1, 1.2, 1.3_

- [ ] 3. 체크포인트 — 인증 및 초대 시스템 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의하세요.

- [x] 4. Island 및 미션 관리 구현
  - [x] 4.1 Island/Mission Repository 및 Service 구현
    - Island 목록 조회
    - Island별 미션 목록 조회 (Onboardee용 — Mission_Requirement 포함)
    - 미션 추가 (HR_Admin) — 제목, 설명, 유형, 콘텐츠 저장
    - 미션 수정 (기존 Progress 보존)
    - 미션 비활성화 (삭제 대신 is_active=false)
    - Island당 미션 개수 제한 (1~20개) 검증
    - _요구사항: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8_

  - [ ]* 4.2 미션 CRUD 프로퍼티 테스트 작성
    - **Property 7: 미션 CRUD 라운드트립** — 미션 추가 후 조회 시 동일 데이터 반환 검증
    - **검증 대상: 요구사항 3.2**
    - **Property 8: 미션 변경 시 기존 Progress 보존** — 미션 수정/비활성화 후 기존 완료 Progress 유지 검증
    - **검증 대상: 요구사항 3.3, 3.4**

  - [x] 4.3 Island/Mission 관리 API 엔드포인트 구현
    - GET /api/islands — Island 목록
    - GET /api/islands/:id/missions — Island별 미션 목록
    - POST /api/admin/islands/:id/missions — 미션 추가
    - PUT /api/admin/missions/:id — 미션 수정
    - DELETE /api/admin/missions/:id — 미션 비활성화
    - _요구사항: 3.2, 3.3, 3.4, 3.5_

- [ ] 5. 미션 수행 엔진 구현
  - [x] 5.1 미션 진행 상태 관리 서비스 구현
    - 미션 시작 (status: not_started → in_progress)
    - 미션 완료 (유형별 완료 조건 검증 후 status: completed)
    - 진행 상태 업데이트 (progress_data 저장)
    - Island 완료 판정 로직 (Required 미션 전부 완료 시 Island_Completion)
    - _요구사항: 4.2, 5.3, 5.5, 6.3_

  - [ ]* 5.2 미션 완료 및 Island 완료 프로퍼티 테스트 작성
    - **Property 9: 미션 완료 상태 전이** — 각 유형별 완료 조건 충족 시 completed 전이 검증
    - **검증 대상: 요구사항 4.2, 5.3, 6.3**
    - **Property 6: Island 완료 판정** — Required 미션 전부 완료 시 Island_Completion=true, 하나라도 미완료 시 false 검증
    - **검증 대상: 요구사항 2.2, 2.5**

  - [ ] 5.3 퀴즈 엔진 구현
    - 퀴즈 순서대로 제공
    - 정오답 판정 및 해설 표시
    - 재시도 로직 (1회 재시도, 2회 오답 시 정답+해설 표시 후 완료)
    - 전체 정답률 계산
    - _요구사항: 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.4 퀴즈 엔진 프로퍼티 테스트 작성
    - **Property 10: 퀴즈 정오답 판정 및 재시도** — 정답 시 correct=true, 오답 시 correct=false, 2회 오답 후 정답+해설 표시 검증
    - **검증 대상: 요구사항 4.4, 4.5**
    - **Property 11: 퀴즈 정답률 계산** — (첫 시도 정답 수 / 전체 퀴즈 수) 일치 검증
    - **검증 대상: 요구사항 4.6**

  - [x] 5.5 체크리스트 엔진 구현
    - 단계별 체크리스트 제공
    - 각 단계 완료 체크 및 다음 단계 활성화
    - 모든 단계 완료 시 미션 완료 처리
    - 진행 상태 저장 및 복원 (이탈 후 재접속 시 이어서 진행)
    - _요구사항: 5.1, 5.2, 5.3, 5.5_

  - [ ]* 5.6 체크리스트 진행 상태 프로퍼티 테스트 작성
    - **Property 12: 체크리스트 진행 상태 라운드트립** — completedSteps 저장 후 조회 시 동일 목록 반환 검증
    - **검증 대상: 요구사항 5.2, 5.5**

  - [x] 5.7 커뮤니케이션 미션 서비스 구현
    - 대상자 정보 조회 (Employee_Pool에서)
    - Communication_Activity 안내 제공
    - 결과물 업로드 처리 (multer 활용)
    - 결과물 미업로드 시 완료 차단
    - _요구사항: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 5.8 커뮤니케이션 미션 프로퍼티 테스트 작성
    - **Property 13: 커뮤니케이션 미션 대상자 무결성** — 대상자 ID가 Employee_Pool에 존재하고 정보 일치 검증
    - **검증 대상: 요구사항 6.2, 6.5**
    - **Property 14: 커뮤니케이션 미션 결과물 필수 검증** — 결과물 미업로드 시 완료 거부 검증
    - **검증 대상: 요구사항 6.4**

  - [x] 5.9 미션 수행 API 엔드포인트 구현
    - POST /api/missions/:id/start — 미션 시작
    - POST /api/missions/:id/complete — 미션 완료
    - PUT /api/missions/:id/progress — 진행 상태 업데이트
    - POST /api/missions/:id/quiz-answer — 퀴즈 답변 제출
    - POST /api/missions/:id/upload — 결과물 업로드
    - _요구사항: 4.1~4.6, 5.1~5.5, 6.1~6.5_

- [ ] 6. 체크포인트 — 미션 수행 엔진 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의하세요.

- [ ] 7. 뱃지 및 성취 시스템 구현
  - [ ] 7.1 BadgeService 및 BadgeRepository 구현
    - Island 전체 미션 완료 시 뱃지 부여 (중복 부여 방지)
    - 뱃지 목록 조회 (island_name, earned_at 포함)
    - 전체 온보딩 완료 판정 (모든 Island 뱃지 획득 시)
    - _요구사항: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 7.2 뱃지 시스템 프로퍼티 테스트 작성
    - **Property 15: Island 완료 시 뱃지 부여** — Island 전체 미션 완료 시 정확히 1개 뱃지 부여, 중복 부여 방지 검증
    - **검증 대상: 요구사항 7.2**
    - **Property 16: 뱃지 목록 정확성** — 뱃지 목록에 island_name, earned_at 포함 및 실제 부여 뱃지와 1:1 대응 검증
    - **검증 대상: 요구사항 7.4, 7.5**

  - [ ] 7.3 뱃지 API 엔드포인트 구현
    - GET /api/badges — 획득한 뱃지 목록
    - GET /api/profile — 프로필 및 전체 진행 현황
    - _요구사항: 7.4, 7.5_

- [ ] 8. AI Guide 어시스턴트 구현
  - [ ] 8.1 AIGuideService 구현
    - OpenAI Chat Completions API 연동
    - 현재 Island/Mission 컨텍스트를 프롬프트에 포함
    - 미완료 미션 추천 로직 (Required 우선, sort_order 순)
    - 답변 불가 시 HR_Admin 에스컬레이션 (질문 내용 전달)
    - 대화 이력 저장 및 조회 (세션 내 문맥 유지)
    - _요구사항: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 8.2 AI Guide 프로퍼티 테스트 작성
    - **Property 17: AI Guide 컨텍스트 포함** — OpenAI API 전달 프롬프트에 Island ID, Mission ID 포함 검증
    - **검증 대상: 요구사항 8.2**
    - **Property 18: 미션 추천 로직** — Required 우선, sort_order 낮은 순 반환 검증
    - **검증 대상: 요구사항 8.3**
    - **Property 19: 대화 이력 순서 보존** — 저장 후 조회 시 생성 시간 순서 유지 검증
    - **검증 대상: 요구사항 8.5**

  - [ ] 8.3 AI Guide API 엔드포인트 구현
    - POST /api/ai-guide/chat — AI Guide 대화
    - GET /api/ai-guide/history — 대화 이력 조회
    - _요구사항: 8.1, 8.2, 8.5_

- [ ] 9. HR Admin 대시보드 구현
  - [ ] 9.1 DashboardService 구현
    - 전체 Onboardee 목록 및 미션 완료율 계산
    - Onboardee별 Island별 Mission_Progress 상세 조회
    - 지연 상태 판정 (3일 이상 미진행 + 미완료)
    - Island별 평균 완료 소요 시간 계산
    - 독려 알림 이메일 발송 기능
    - Employee_Pool CRUD
    - _요구사항: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 9.2 대시보드 프로퍼티 테스트 작성
    - **Property 20: 대시보드 완료율 계산** — (completed 미션 수 / 전체 미션 수 × 100) 일치 검증
    - **검증 대상: 요구사항 9.1**
    - **Property 21: 지연 상태 판정** — 마지막 업데이트 72시간 이상 경과 + 미완료 시 지연 표시 검증
    - **검증 대상: 요구사항 9.3**
    - **Property 22: Island별 평균 완료 소요 시간 계산** — (소요 시간 합 / 완료 Onboardee 수) 일치 검증
    - **검증 대상: 요구사항 9.5**

  - [ ] 9.3 대시보드 API 엔드포인트 구현
    - GET /api/admin/dashboard — 전체 Onboardee 현황
    - GET /api/admin/onboardees/:id — 특정 Onboardee 상세
    - POST /api/admin/onboardees/:id/nudge — 독려 알림 발송
    - GET /api/admin/employee-pool — Employee Pool 조회
    - POST /api/admin/employee-pool — Employee Pool 등록
    - _요구사항: 9.1, 9.2, 9.4_

- [ ] 10. 체크포인트 — 백엔드 전체 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의하세요.

- [ ] 11. 마크다운 임포트/익스포트 구현
  - [ ] 11.1 ContentService 구현 (unified + remark 기반)
    - 마크다운 → MissionContent 파싱 (YAML frontmatter, 퀴즈, 체크리스트 섹션)
    - MissionContent → 마크다운 내보내기
    - 파싱 에러 처리 (필수 frontmatter 누락, 잘못된 형식 등 상세 에러 메시지)
    - _요구사항: 10.1, 10.2, 10.3_

  - [ ]* 11.2 마크다운 라운드트립 프로퍼티 테스트 작성
    - **Property 23: 마크다운 라운드트립** — export 후 import 시 원본과 동일한 MissionContent 생성 검증
    - **검증 대상: 요구사항 10.1, 10.3, 10.4**
    - **Property 24: 잘못된 마크다운 에러 처리** — 유효하지 않은 마크다운 입력 시 에러 메시지 반환 검증
    - **검증 대상: 요구사항 10.2**

  - [ ] 11.3 임포트/익스포트 API 엔드포인트 구현
    - POST /api/admin/import — 마크다운 파일 임포트
    - GET /api/admin/export/:missionId — 미션 콘텐츠 마크다운 익스포트
    - _요구사항: 10.1, 10.3_

- [ ] 12. 프론트엔드 — 인증 및 초대 화면 구현
  - [ ] 12.1 로그인/회원가입 페이지 구현
    - LoginPage — 이메일/비밀번호 로그인 폼
    - RegisterPage — 초대 링크 기반 가입 (이름, 비밀번호 입력)
    - 초대 링크 만료/중복 사용 시 안내 메시지 표시
    - JWT 토큰 관리 (로컬 스토리지 저장, 자동 로그아웃)
    - _요구사항: 1.4, 1.5, 1.6_

  - [ ] 12.2 InviteConfigPage 구현 (HR_Admin)
    - 신규 입사자 이메일/소속 본부 입력
    - Island별 미션의 Required/Optional 설정 인터페이스
    - 초대 링크 생성 및 발송
    - _요구사항: 1.1, 1.2, 1.3, 3.6, 3.7_

- [ ] 13. 프론트엔드 — 월드맵 및 미션 화면 구현
  - [ ] 13.1 WorldMapPage 구현
    - 모든 Island 시각적 표시 (이름, Required 미션 수, 완료 미션 수)
    - Island 미완료 시 HR 섬 강조 표시
    - Island 선택 시 미션 목록 화면 이동
    - Island 완료 시 완료 상태 시각적 표시
    - _요구사항: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 13.2 IslandPage 및 MissionCard 구현
    - Island별 미션 목록 표시 (Mission_Requirement 필수/선택 표시)
    - MissionCard 컴포넌트 (미션 제목, 유형, 진행 상태, 필수/선택 표시)
    - 미션 선택 시 MissionPage로 이동
    - _요구사항: 3.8_

  - [ ] 13.3 MissionPage 및 미션 수행 엔진 컴포넌트 구현
    - InfoViewer — 텍스트/이미지/영상 콘텐츠 열람, 끝까지 열람 시 완료 처리
    - QuizEngine — 퀴즈 순서 제공, 정오답 표시, 재시도, 정답률 표시
    - ChecklistEngine — 단계별 체크리스트, 완료 체크, 진행 상태 저장/복원
    - CommMission — 대상자 정보 표시, 결과물 업로드, 미업로드 시 완료 차단
    - 미션 완료 애니메이션 및 완료 메시지 표시
    - _요구사항: 4.1~4.6, 5.1~5.5, 6.2~6.4, 7.1_

- [ ] 14. 프론트엔드 — 뱃지, AI Guide, 대시보드 구현
  - [ ] 14.1 BadgeNotification 및 ProfilePage 구현
    - 뱃지 획득 알림 (Island 완료 시)
    - 전체 온보딩 완료 축하 화면
    - 프로필 페이지에서 뱃지 목록 조회 (Island 이름, 획득 날짜)
    - ProgressBar 컴포넌트
    - _요구사항: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 14.2 AIGuideWidget 구현
    - 모든 화면에서 접근 가능한 채팅 버튼
    - 대화 입력/응답 UI
    - 대화 이력 표시
    - _요구사항: 8.1, 8.2, 8.5_

  - [ ] 14.3 AdminDashboardPage 구현
    - 전체 Onboardee 목록 및 완료율 표시
    - Onboardee별 Island별 상세 진행 현황
    - 지연 상태 Onboardee 강조 표시
    - 독려 알림 이메일 발송 버튼
    - Island별 평균 완료 소요 시간 표시
    - _요구사항: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 14.4 ImportExportPage 구현 (HR_Admin)
    - 마크다운 파일 업로드 UI
    - 파싱 결과 미리보기
    - 파싱 에러 메시지 표시
    - 미션 콘텐츠 마크다운 내보내기 버튼
    - _요구사항: 10.1, 10.2, 10.3_

- [ ] 15. 프론트엔드 에러 처리 및 통합
  - [ ] 15.1 공통 에러 처리 및 API 클라이언트 구현
    - Axios/fetch 래퍼 (JWT 자동 첨부, 에러 인터셉터)
    - 토스트 알림 컴포넌트
    - 네트워크 오류 자동 재시도 (최대 3회, 지수 백오프)
    - 401 응답 시 자동 로그아웃
    - _요구사항: 전체_

  - [ ] 15.2 라우팅 및 권한 기반 네비게이션 구현
    - React Router 설정 (Onboardee/HR_Admin 역할별 라우트 분리)
    - 인증 가드 (미인증 시 로그인 페이지 리다이렉트)
    - 계정 생성 완료 후 World_Map 자동 이동
    - _요구사항: 1.7_

  - [ ]* 15.3 슬랙 알림 연동 구현
    - 커뮤니케이션 미션 시작 시 대상 동료에게 슬랙 알림 발송
    - Slack API 연동 (webhook 또는 Bot API)
    - _요구사항: 6.6_

- [ ] 16. 최종 체크포인트 — 전체 시스템 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의하세요.

## 참고 사항

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 특정 요구사항을 참조하여 추적 가능합니다
- 체크포인트에서 점진적으로 검증합니다
- 프로퍼티 테스트는 설계 문서의 정확성 속성(Property 1~24)을 검증합니다
- 단위 테스트는 구체적인 예시와 엣지 케이스를 검증합니다