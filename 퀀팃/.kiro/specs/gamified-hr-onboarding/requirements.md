# 요구사항 문서

## 소개

게이미피케이션 기반 HR 온보딩 플랫폼 MVP입니다. 신규 입사자가 HR 담당자의 1:1 구두 설명 없이도 게임처럼 미션을 달성하며 자연스럽게 회사 정보와 실무 지식을 습득할 수 있도록 합니다. 회사의 각 본부는 "섬(Island)"으로 표현되며, 신규 입사자는 섬을 탐험하고 미션을 클리어하면서 성취감을 느끼고 동료와의 커뮤니케이션도 자연스럽게 유도됩니다.

## 용어 정의

- **Platform**: 게이미피케이션 HR 온보딩 플랫폼 전체 시스템
- **Onboardee**: 온보딩 중인 신규 입사자
- **HR_Admin**: HR 팀 관리자 (미션 및 섬 콘텐츠를 관리하는 역할)
- **Island**: 회사 본부 또는 팀을 표현하는 게임 내 지역 단위 (예: 머니터링 섬, 플랜팃 섬, finter 섬, HR 섬)
- **Mission**: 각 섬에서 Onboardee가 수행해야 하는 과제 단위
- **Mission_Type**: 미션의 유형 (정보 열람 / 실무 수행 / 퀴즈 / 커뮤니케이션)
- **Mission_Requirement**: 초대 링크 생성 시 HR_Admin이 각 미션에 지정하는 필수/선택 여부 (Required / Optional)
- **Mission_Progress**: Onboardee의 미션 수행 상태 (미시작 / 진행 중 / 완료)
- **Island_Completion**: Island 완료 조건 — 해당 Island의 Required 미션을 전부 완료한 상태
- **Invite_Config**: 초대 링크 생성 시 HR_Admin이 구성하는 Onboardee별 미션 필수/선택 설정 정보
- **Communication_Activity**: 커뮤니케이션 미션에서 Onboardee가 대상자와 함께 수행하는 활동 (사진 업로드, 퀴즈, 키워드 입력 등)
- **Employee_Pool**: HR_Admin이 커뮤니케이션 미션 대상자로 사전 등록한 직원 목록
- **Quiz**: 미션 내 제품 이해도 확인을 위한 객관식 또는 단답형 문제
- **Badge**: 미션 또는 섬 완료 시 Onboardee에게 부여되는 성취 표시
- **World_Map**: 모든 섬을 한눈에 볼 수 있는 메인 탐험 화면
- **AI_Guide**: 온보딩 과정에서 Onboardee의 질문에 답하고 다음 미션을 안내하는 AI 어시스턴트

---

## 요구사항

### 요구사항 1: 온보딩 계정 생성 및 초대

**User Story:** 신규 입사자로서, 나는 초대 링크를 통해 온보딩 플랫폼에 가입하고 싶다. 그래야 별도의 복잡한 절차 없이 바로 온보딩을 시작할 수 있다.

#### 인수 기준

1. WHEN HR_Admin이 신규 입사자의 이메일과 소속 본부를 입력하고 초대를 발송하면, THE Platform은 해당 이메일로 고유한 초대 링크를 전송해야 한다.
2. WHEN HR_Admin이 초대 링크를 생성하면, THE Platform은 각 Island의 미션별로 Mission_Requirement(Required / Optional)를 지정할 수 있는 Invite_Config 설정 화면을 제공해야 한다.
3. WHEN HR_Admin이 Invite_Config를 저장하면, THE Platform은 해당 설정 정보를 초대 링크에 포함하여 저장해야 한다.
4. WHEN Onboardee가 유효한 초대 링크에 접속하면, THE Platform은 이름과 비밀번호 입력만으로 계정을 생성할 수 있는 가입 화면을 제공해야 한다.
5. IF 초대 링크가 발송 후 7일이 경과하면, THEN THE Platform은 해당 링크를 만료 처리하고 Onboardee에게 만료 안내 메시지를 표시해야 한다.
6. IF 동일한 초대 링크로 2회 이상 가입을 시도하면, THEN THE Platform은 중복 가입을 차단하고 이미 가입된 계정임을 안내해야 한다.
7. WHEN Onboardee가 계정 생성을 완료하면, THE Platform은 Invite_Config에 정의된 Mission_Requirement를 해당 Onboardee의 미션 설정으로 적용하고 World_Map 화면으로 자동 이동시켜야 한다.

---

### 요구사항 2: 월드맵 탐험 화면

**User Story:** 신규 입사자로서, 나는 회사의 모든 섬을 한눈에 볼 수 있는 지도를 탐험하고 싶다. 그래야 어떤 본부가 있는지 파악하고 어디서부터 시작할지 선택할 수 있다.

#### 인수 기준

1. WHEN Onboardee가 로그인하면, THE Platform은 모든 Island가 표시된 World_Map 화면을 제공해야 한다.
2. THE World_Map은 각 Island의 이름, Required 미션 총 개수, 완료한 Required 미션 개수를 시각적으로 표시해야 한다.
3. WHILE Onboardee가 Island를 하나도 완료하지 않은 상태이면, THE World_Map은 첫 번째 Island(HR 섬)를 강조 표시하여 시작을 유도해야 한다.
4. WHEN Onboardee가 Island를 선택하면, THE Platform은 해당 Island의 미션 목록 화면으로 이동해야 한다.
5. WHEN Onboardee가 Island의 모든 Required Mission을 완료하면, THE World_Map은 해당 Island를 완료 상태(Island_Completion)로 시각적으로 표시해야 한다.

---

### 요구사항 3: 섬(Island) 및 미션 구성 관리

**User Story:** HR 관리자로서, 나는 각 섬의 미션 내용을 직접 구성하고 수정하고 싶다. 그래야 회사 상황에 맞게 온보딩 콘텐츠를 유연하게 관리할 수 있다.

#### 인수 기준

1. THE Platform은 기본 Island로 머니터링 섬, 플랜팃 섬, finter 섬, HR 섬 총 4개를 제공해야 한다.
2. WHEN HR_Admin이 Island에 Mission을 추가하면, THE Platform은 미션 제목, 설명, 미션 유형(정보 열람 / 실무 수행 / 퀴즈 / 커뮤니케이션)을 저장해야 한다.
3. WHEN HR_Admin이 기존 Mission을 수정하면, THE Platform은 변경 사항을 즉시 반영하고 이미 해당 미션을 완료한 Onboardee의 Mission_Progress는 유지해야 한다.
4. IF HR_Admin이 Mission을 삭제하면, THEN THE Platform은 해당 Mission을 비활성화 처리하고 진행 중인 Onboardee에게는 미션이 종료되었음을 안내해야 한다.
5. THE Platform은 Island당 최소 1개, 최대 20개의 Mission을 지원해야 한다.
6. WHEN HR_Admin이 초대 링크를 생성할 때, THE Platform은 Island별로 각 Mission의 Mission_Requirement(Required / Optional)를 개별 지정할 수 있는 Invite_Config 설정 인터페이스를 제공해야 한다.
7. THE Platform은 Invite_Config에서 동일한 Island 내 미션 중 일부는 Required, 나머지는 Optional로 혼합 지정하는 것을 허용해야 한다.
8. WHEN Onboardee가 Island의 미션 목록을 조회하면, THE Platform은 각 미션에 해당 Onboardee의 Mission_Requirement(필수 / 선택) 표시를 함께 제공해야 한다.

---

### 요구사항 4: 미션 수행 — 정보 열람 및 퀴즈

**User Story:** 신규 입사자로서, 나는 각 본부의 제품과 업무를 설명하는 콘텐츠를 읽고 퀴즈를 풀고 싶다. 그래야 단순히 읽는 것보다 더 잘 기억하고 이해도를 확인할 수 있다.

#### 인수 기준

1. WHEN Onboardee가 정보 열람 유형의 Mission을 시작하면, THE Platform은 텍스트, 이미지, 또는 영상으로 구성된 콘텐츠 화면을 제공해야 한다.
2. WHEN Onboardee가 콘텐츠를 끝까지 열람하면, THE Platform은 해당 Mission을 완료 처리하고 Mission_Progress를 업데이트해야 한다.
3. WHEN Onboardee가 퀴즈 유형의 Mission을 시작하면, THE Platform은 1개 이상의 Quiz를 순서대로 제공해야 한다.
4. WHEN Onboardee가 Quiz에 정답을 제출하면, THE Platform은 즉시 정오답 여부와 해설을 표시해야 한다.
5. IF Onboardee가 Quiz에 오답을 제출하면, THEN THE Platform은 재시도 기회를 1회 제공하고 2회 오답 시 정답과 해설을 표시한 후 미션을 완료 처리해야 한다.
6. WHEN 퀴즈 미션의 모든 Quiz가 완료되면, THE Platform은 전체 정답률을 Onboardee에게 표시해야 한다.

---

### 요구사항 5: 미션 수행 — 실무 수행 미션

**User Story:** 신규 입사자로서, 나는 그룹웨어 가입, 프린터 연결, 회의실 예약 같은 실무 미션을 단계별로 안내받고 싶다. 그래야 HR 담당자에게 일일이 물어보지 않고도 실무 세팅을 완료할 수 있다.

#### 인수 기준

1. WHEN Onboardee가 실무 수행 유형의 Mission을 시작하면, THE Platform은 단계별 체크리스트 형태로 수행 절차를 안내해야 한다.
2. WHEN Onboardee가 체크리스트의 각 단계를 완료 체크하면, THE Platform은 해당 단계를 완료 상태로 표시하고 다음 단계를 활성화해야 한다.
3. WHEN Onboardee가 체크리스트의 모든 단계를 완료하면, THE Platform은 해당 Mission을 완료 처리해야 한다.
4. WHILE Onboardee가 실무 미션을 진행 중인 상태이면, THE Platform은 AI_Guide를 통해 각 단계에 대한 추가 질문에 답변할 수 있어야 한다.
5. IF Onboardee가 미션 도중 플랫폼을 이탈하면, THEN THE Platform은 완료된 단계까지의 Mission_Progress를 저장하고 재접속 시 이어서 진행할 수 있도록 해야 한다.

---

### 요구사항 6: 미션 수행 — 커뮤니케이션 미션

**User Story:** 신규 입사자로서, 나는 특정 동료와 함께 수행하는 활동 미션을 통해 자연스럽게 사람들과 친해지고 싶다. 그래야 어색함 없이 조직에 녹아들 수 있다.

#### 인수 기준

1. WHEN HR_Admin이 커뮤니케이션 미션을 생성하면, THE Platform은 Employee_Pool에서 대화 대상자를 지정하고 Communication_Activity(사진 업로드 / 정보 수집 후 퀴즈 / 키워드 입력)를 함께 설정할 수 있는 인터페이스를 제공해야 한다.
2. WHEN Onboardee가 커뮤니케이션 유형의 Mission을 시작하면, THE Platform은 대화 대상자(이름, 직책, 팀)와 수행해야 할 Communication_Activity 안내를 표시해야 한다.
3. WHEN Onboardee가 Communication_Activity를 수행하고 결과(사진, 퀴즈 답변, 키워드 등)를 업로드하면, THE Platform은 해당 Mission을 완료 처리하고 Mission_Progress를 업데이트해야 한다.
4. IF Onboardee가 Communication_Activity의 결과를 업로드하지 않고 완료를 시도하면, THEN THE Platform은 결과 업로드가 필요함을 안내하고 미션 완료를 차단해야 한다.
5. THE Platform은 커뮤니케이션 미션의 대상자 정보를 HR_Admin이 사전에 등록한 Employee_Pool에서 가져와야 한다.
6. WHERE 슬랙(Slack) 연동이 설정된 경우, THE Platform은 커뮤니케이션 미션 시작 시 대상 동료에게 자동으로 슬랙 알림을 발송해야 한다.

---

### 요구사항 7: 뱃지 및 성취 시스템

**User Story:** 신규 입사자로서, 나는 미션을 완료할 때마다 뱃지를 받고 싶다. 그래야 성취감을 느끼고 온보딩을 끝까지 완료하고 싶은 동기를 유지할 수 있다.

#### 인수 기준

1. WHEN Onboardee가 Mission을 완료하면, THE Platform은 미션 완료 애니메이션과 함께 완료 메시지를 표시해야 한다.
2. WHEN Onboardee가 Island의 모든 Mission을 완료하면, THE Platform은 해당 Island에 대응하는 Badge를 Onboardee에게 부여해야 한다.
3. WHEN Onboardee가 모든 Island의 Badge를 획득하면, THE Platform은 전체 온보딩 완료 축하 화면을 표시해야 한다.
4. THE Platform은 Onboardee가 획득한 Badge 목록을 프로필 화면에서 조회할 수 있도록 해야 한다.
5. THE Platform은 각 Badge에 Island 이름과 획득 날짜를 함께 표시해야 한다.

---

### 요구사항 8: AI 가이드 어시스턴트

**User Story:** 신규 입사자로서, 나는 온보딩 중 궁금한 점이 생기면 AI에게 바로 질문하고 싶다. 그래야 HR 담당자를 기다리지 않고 즉시 답변을 받을 수 있다.

#### 인수 기준

1. THE Platform은 모든 화면에서 AI_Guide 채팅 버튼을 접근 가능한 위치에 제공해야 한다.
2. WHEN Onboardee가 AI_Guide에 질문을 입력하면, THE AI_Guide는 현재 진행 중인 Island 및 Mission 컨텍스트를 반영하여 답변을 제공해야 한다.
3. WHEN Onboardee가 AI_Guide에 다음 미션 추천을 요청하면, THE AI_Guide는 완료되지 않은 Mission 중 우선순위가 높은 미션을 안내해야 한다.
4. IF AI_Guide가 질문에 대한 답변을 찾을 수 없으면, THEN THE AI_Guide는 HR_Admin에게 문의하도록 안내하고 질문 내용을 HR_Admin에게 전달해야 한다.
5. THE AI_Guide는 Onboardee의 대화 이력을 세션 내에서 유지하여 문맥에 맞는 답변을 제공해야 한다.

---

### 요구사항 9: 온보딩 진행 현황 대시보드 (HR 관리자)

**User Story:** HR 관리자로서, 나는 신규 입사자들의 온보딩 진행 상황을 한눈에 파악하고 싶다. 그래야 온보딩이 지연되는 입사자를 조기에 발견하고 지원할 수 있다.

#### 인수 기준

1. WHEN HR_Admin이 대시보드에 접속하면, THE Platform은 전체 Onboardee 목록과 각자의 전체 미션 완료율을 표시해야 한다.
2. THE Platform은 각 Onboardee별로 Island별 Mission_Progress를 조회할 수 있는 상세 화면을 제공해야 한다.
3. WHEN 특정 Onboardee가 3일 이상 미션 진행이 없으면, THE Platform은 HR_Admin 대시보드에 해당 Onboardee를 지연 상태로 표시해야 한다.
4. THE Platform은 HR_Admin이 특정 Onboardee에게 독려 알림 이메일을 수동으로 발송할 수 있는 기능을 제공해야 한다.
5. THE Platform은 Island별 평균 완료 소요 시간을 HR_Admin 대시보드에 표시해야 한다.

---

### 요구사항 10: 파서 및 콘텐츠 임포트

**User Story:** HR 관리자로서, 나는 기존에 작성된 온보딩 문서(마크다운 또는 JSON 형식)를 플랫폼에 임포트하고 싶다. 그래야 콘텐츠를 처음부터 다시 입력하지 않아도 된다.

#### 인수 기준

1. WHEN HR_Admin이 유효한 마크다운 파일을 업로드하면, THE Platform은 해당 파일을 파싱하여 Mission 콘텐츠 객체로 변환해야 한다.
2. IF HR_Admin이 잘못된 형식의 파일을 업로드하면, THEN THE Platform은 파싱 실패 원인을 포함한 오류 메시지를 표시해야 한다.
3. THE Platform은 Mission 콘텐츠 객체를 마크다운 형식으로 내보내기(export)할 수 있어야 한다.
4. FOR ALL 유효한 Mission 콘텐츠 객체에 대해, 마크다운으로 내보낸 후 다시 임포트하면 동일한 Mission 콘텐츠 객체가 생성되어야 한다 (라운드트립 속성).
