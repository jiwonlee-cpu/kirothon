---
name: onboarding-confluence
description: 컨플루언스 MCP를 활용하여 '슬기로운 퀀팃생활' 페이지에서 신규 입사자 온보딩 정보를 추출하고, 게임 미션 데이터를 자동 생성하는 스킬
inclusion: manual
---

# 온보딩 컨플루언스 추출 스킬

컨플루언스 '슬기로운 퀀팃생활' 페이지에서 신규 입사자 온보딩에 필요한 정보를 추출하고,
게임형 온보딩 미션 데이터를 자동 생성합니다.

## 사전 조건
- Confluence MCP 서버가 `.kiro/settings/mcp.json`에 설정되어 있어야 합니다
- MCP 서버가 연결 상태여야 합니다

## 컨플루언스 구조

루트 페이지: "슬기로운 퀀팃생활" (ID: 3686465578)

### 카테고리 목록 (인사담당자가 선택)

| 카테고리 | 페이지 ID | 하위 페이지 수 | 온보딩 관련도 |
|----------|-----------|---------------|-------------|
| 퀀팃 이해하기 | 3718217910 | 9개 | ⭐⭐⭐ 필수 |
| 커뮤니케이션 | 3719135251 | 4개 | ⭐⭐⭐ 필수 |
| 근무환경 | 3713859760 | 6개 | ⭐⭐⭐ 필수 |
| 개인책임형 법인카드 사용 | 3727884364 | 8개 | ⭐⭐ 중요 |
| 복리후생 | 3727654955 | 11개 | ⭐⭐ 중요 |
| 기안문서 작성 가이드 | 3731816500 | 13개 | ⭐ 참고 |
| 지식창고 | 3727589488 | 4개 | ⭐ 참고 |
| 정보보안 | 3735552041 | 5개 | ⭐⭐ 중요 |
| 기타 | 3735519284 | 2개 | ⭐ 참고 |

## 워크플로우

### Step 1: 카테고리 선택
인사담당자에게 위 카테고리 목록을 보여주고, 추출할 카테고리를 선택받습니다.
추천 조합:
- **기본 온보딩**: 퀀팃 이해하기 + 근무환경 + 커뮤니케이션
- **전체 온보딩**: 위 3개 + 복리후생 + 법인카드 + 정보보안

### Step 2: 컨플루언스 페이지 읽기
선택된 카테고리의 하위 페이지들을 컨플루언스 MCP로 읽습니다.

```
# 하위 페이지 목록 가져오기
conf_get /wiki/api/v2/pages/{카테고리_페이지_ID}/children
→ queryParams: { "limit": "25" }
→ jq: "results[*].{id: id, title: title}"

# 각 페이지 본문 읽기 (⚠️ 반드시 v1 REST API 사용)
conf_get /wiki/rest/api/content/{페이지_ID}
→ queryParams: { "expand": "body.view" }
```

⚠️ 중요: v2 API의 `/wiki/api/v2/pages/{id}/body`는 동작하지 않습니다. 반드시 v1 REST API를 사용하세요.

### Step 3: 정보 추출 및 분류
각 페이지에서 다음 4가지 유형의 정보를 추출합니다:

1. **keyFacts** (핵심 사실): 근무시간, 오피스 위치, 보안 정책 등 팩트 정보
2. **actionGuides** (실무 안내): "~가 필요하면 ~에게 요청" 패턴의 실무 가이드
   - `need`: 무엇이 필요한지
   - `how`: 어떻게 하는지
   - `contact`: 누구에게 요청하는지 (없으면 null)
3. **quizCandidates** (퀴즈 후보): 신규 입사자가 알아야 할 정보를 퀴즈로 변환
   - 보기 4개, 정답 인덱스(0-3), 해설 포함
4. **체크리스트**: 신규 입사자가 해야 할 단계별 작업

### Step 4: 추출 결과 저장
추출된 정보를 `project/onboarding-data/confluence-extract.json`에 저장합니다.

## 추출 결과 스키마

```json
{
  "extractedAt": "2026-03-17T10:00:00Z",
  "source": "슬기로운 퀀팃생활 (Confluence)",
  "rootPageId": "3686465578",
  "categories": [
    {
      "id": "카테고리-id",
      "name": "카테고리명",
      "confluencePageId": "페이지ID",
      "pages": [
        {
          "pageId": "하위페이지ID",
          "title": "페이지 제목",
          "keyFacts": ["핵심 사실 1", "핵심 사실 2"],
          "actionGuides": [
            {
              "need": "무엇이 필요한지",
              "how": "어떻게 하는지",
              "contact": "누구에게 (또는 null)"
            }
          ],
          "quizCandidates": [
            {
              "question": "질문",
              "options": ["보기1", "보기2", "보기3", "보기4"],
              "answer": 1,
              "explanation": "해설"
            }
          ]
        }
      ]
    }
  ]
}
```

### Step 5: 게임 미션 자동 생성 (선택)
추출된 데이터를 기반으로 `project/player/src/data/onboarding-program.json`에 게임 미션을 생성할 수 있습니다.

#### 미션 타입 매핑 규칙

| 추출 정보 유형 | 게임 미션 타입 | 설명 |
|---------------|-------------|------|
| keyFacts (핵심 정보) | `info` | 정보 열람 미션 |
| quizCandidates (퀴즈) | `quiz` | 객관식 퀴즈 미션 |
| actionGuides (실무 안내) | `task` | 체크리스트 미션 |
| actionGuides + contact | `comm` | 담당자 만나기 미션 |

#### 섬(Island) 매핑 규칙

| 카테고리 조합 | 섬 이름 | 색상 |
|-------------|---------|------|
| 퀀팃 이해하기 | 🌟 퀀팃 문화 섬 | lavender |
| 근무환경 + 커뮤니케이션 | 🏢 오피스 라이프 섬 | sky-blue |
| 복리후생 + 법인카드 | 💰 복지 천국 섬 | sunshine-yellow |
| 정보보안 + 기안문서 | 📋 실무 마스터 섬 | grass-green |

#### 미션 ID 규칙
- `id`: `{섬id}-m{번호}` (예: "office-m01")
- `type`: "info" | "quiz" | "task" | "comm"
- `required`: 핵심 정보는 true, 부가 정보는 false

#### 미션 타입별 필수 필드
- **info**: `content.text` (텍스트)
- **quiz**: `questions[]` (question, options[4], answer, explanation)
- **task**: `steps[]` (문자열 배열)
- **comm**: `target` (name, team, role) + `keyword`

## 참조 파일
- 회사 기본 정보: #[[file:project/onboarding-data/company-profile.json]]
- 기존 추출 데이터: #[[file:project/onboarding-data/confluence-extract.json]]
- 게임 미션 데이터: #[[file:project/player/src/data/onboarding-program.json]]

## 추출 시 주의사항
- HTML 태그를 제거하고 텍스트만 추출
- 개인정보(이름, 연락처)는 역할명으로 대체 (예: "경영지원 담당자")
- 퀴즈 보기는 반드시 4개, 정답은 0-3 인덱스
- 이미 추출된 카테고리가 있으면 덮어쓰지 않고 병합

## 사용법
채팅에서 `#onboarding-confluence`를 컨텍스트로 추가한 뒤:
```
근무환경이랑 복리후생 카테고리로 온보딩 정보 추출해줘
```

→ Step 1~4: 컨플루언스에서 해당 카테고리 페이지들을 읽어서 confluence-extract.json 생성
→ 인사담당자 검토
→ Step 5 (선택): 검토된 데이터로 onboarding-program.json에 게임 미션 추가
