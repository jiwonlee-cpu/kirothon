# 온보딩 퀴즈 생성 워크플로우

## Step 1: 회사 프로필 로드
1. `project/onboarding-data/company-profile.json` 파일을 읽습니다
2. 데이터 구조를 파악하고 출제 가능한 영역을 분류합니다

## Step 2: 출제 영역 분류
company-profile.json의 데이터를 아래 카테고리로 분류합니다:

| 카테고리 | 데이터 소스 | 예시 문제 유형 |
|---------|-----------|-------------|
| 회사 기본 정보 | `company.*` | 설립 정보, 대표, 주소, 슬로건 |
| 서비스/제품 | `services.*` | 제품명, 핵심 기능, 타겟 고객 |
| 고객사 | `clients[]` | 고객사명, 제공 서비스, 지역 |
| 파트너십 | `partners[]` | 파트너 기관, 협력 분야 |
| 기업 문화 | `culture.*` | 핵심 가치, 복리후생, 오피스 |
| 브랜딩 | `branding.*` | 브랜드 컬러, 디자인 스타일 |
| 주요 성과 | `key_achievements[]` | 수상 이력, 투자 유치, 글로벌 진출 |

## Step 3: 문제 생성
각 카테고리에서 골고루 출제합니다. 아래 문제 유형을 혼합하여 사용합니다:

### 문제 유형

**1. 객관식 (4지선다)**
```json
{
  "type": "multiple_choice",
  "category": "카테고리명",
  "question": "문제 텍스트",
  "options": ["보기1", "보기2", "보기3", "보기4"],
  "answer": "정답",
  "explanation": "해설"
}
```

**2. O/X (참/거짓)**
```json
{
  "type": "true_false",
  "category": "카테고리명",
  "question": "문제 텍스트",
  "answer": true,
  "explanation": "해설"
}
```

**3. 빈칸 채우기**
```json
{
  "type": "fill_in_blank",
  "category": "카테고리명",
  "question": "___가 포함된 문제 텍스트",
  "answer": "정답",
  "explanation": "해설"
}
```

**4. 연결하기 (매칭)**
```json
{
  "type": "matching",
  "category": "카테고리명",
  "question": "매칭 문제 텍스트",
  "pairs": [
    { "left": "항목1", "right": "대응1" }
  ]
}
```

**5. 순서 맞추기**
```json
{
  "type": "ordering",
  "category": "카테고리명",
  "question": "순서 문제 텍스트",
  "items": ["항목1", "항목2", "항목3"],
  "correct_order": [1, 2, 3],
  "explanation": "해설"
}
```

## Step 4: 퀴즈 구성 규칙

1. **총 문제 수**: 15~20문제
2. **카테고리 배분**: 각 카테고리에서 최소 2문제 이상
3. **난이도 배분**:
   - 쉬움 (40%): 홈페이지에서 바로 확인 가능한 기본 정보
   - 보통 (40%): 여러 정보를 조합해야 하는 문제
   - 어려움 (20%): 세부 수치나 구체적 사실을 묻는 문제
4. **문제 유형 배분**: 객관식 5~6개, O/X 3~4개, 빈칸 채우기 3~4개, 연결하기 2개, 순서 맞추기 1~2개
5. **톤**: 딱딱하지 않고 친근하게. 신규 입사자가 부담 없이 풀 수 있도록.
6. **explanation 필수**: 모든 문제에 정답 해설을 포함하여 학습 효과를 높입니다.

## Step 5: 출력
생성된 퀴즈를 `project/onboarding-data/onboarding-quiz.json`에 저장합니다.

### 출력 스키마

```json
{
  "meta": {
    "company": "회사명",
    "generated_at": "생성 일시 (ISO 8601)",
    "source": "company-profile.json 경로",
    "total_questions": 20,
    "categories": ["회사 기본 정보", "서비스/제품", "고객사", "파트너십", "기업 문화", "브랜딩", "주요 성과"]
  },
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice | true_false | fill_in_blank | matching | ordering",
      "category": "카테고리명",
      "difficulty": "easy | medium | hard",
      "question": "문제 텍스트",
      "options": [],
      "answer": "정답",
      "explanation": "해설"
    }
  ]
}
```

## 주의사항
- company-profile.json에 **실제로 존재하는 데이터**만으로 문제를 생성합니다. 추측하거나 외부 정보를 추가하지 않습니다.
- 객관식의 오답 보기는 그럴듯하지만 명확히 틀린 것으로 구성합니다.
- 민감한 정보(사업자번호, 이메일 등)는 문제로 출제하지 않습니다.
- 특정 개인을 평가하거나 비교하는 문제는 만들지 않습니다.
