---
name: company-crawler
description: 회사 홈페이지 URL을 입력하면 Playwright MCP로 사이트를 크롤링하여 회사 정보를 자동 수집하는 스킬
inclusion: manual
---

# 회사 홈페이지 크롤러 스킬

## 개요
회사 홈페이지 URL 하나만 입력하면, Playwright MCP를 활용하여 메인 페이지와 네비게이션 링크의 서브 페이지들을 자동으로 순회하며 회사 정보를 수집합니다.

## 사전 조건
- Playwright MCP 서버가 `.kiro/settings/mcp.json`에 설정되어 있어야 합니다
- MCP 서버가 연결 상태여야 합니다

## 워크플로우

### Step 1: 메인 페이지 접속 및 기본 정보 수집
1. `browser_navigate`로 입력된 URL 접속
2. `browser_snapshot`으로 페이지 구조 추출
3. `browser_evaluate`로 메타태그, CSS 변수, 로고 URL, 색상값 추출
4. `browser_take_screenshot`으로 메인 페이지 스크린샷 저장

### Step 2: 네비게이션 링크 탐지 및 서브 페이지 순회
1. `browser_evaluate`로 네비게이션 영역의 내부 링크 목록 추출
2. 외부 링크(다른 도메인) 제외, 내부 링크만 필터링
3. 각 서브 페이지에 대해:
   - `browser_navigate`로 이동
   - `browser_snapshot`으로 텍스트 콘텐츠 추출
   - 페이지 유형(솔루션, 채용, FAQ, 소개 등)을 자동 분류

### Step 3: 정보 통합 및 JSON 생성
수집된 정보를 아래 스키마로 통합하여 `project/onboarding-data/company-profile.json`에 저장합니다.

## 출력 스키마

```json
{
  "company": {
    "name": "회사 영문명",
    "name_ko": "회사 한글명",
    "legal_name": "법인명",
    "business_number": "사업자번호",
    "website": "홈페이지 URL",
    "description": "회사 소개 (메타 description)",
    "tagline": "메인 슬로건",
    "sub_tagline": "서브 슬로건",
    "address": "주소",
    "contact": {
      "general": "대표 이메일",
      "recruiting": "채용 이메일",
      "phone": "전화번호"
    },
    "social": {
      "blog": "블로그 URL",
      "linkedin": "링크드인 URL",
      "instagram": "인스타그램 URL"
    }
  },
  "branding": {
    "logo_url": "로고 이미지 URL",
    "favicon": "파비콘 URL",
    "colors": {
      "primary": "주요 브랜드 색상",
      "background": "배경색",
      "text": "텍스트 색상"
    },
    "style": "디자인 스타일 요약"
  },
  "pages": {
    "home": { "url": "", "summary": "페이지 핵심 내용 요약" },
    "solutions": { "url": "", "summary": "" },
    "about": { "url": "", "summary": "" },
    "careers": { "url": "", "summary": "" },
    "contact": { "url": "", "summary": "" },
    "faq": { "url": "", "summary": "" }
  },
  "services": {
    "core_platform": "핵심 플랫폼명",
    "pillars": [],
    "target_segments": []
  },
  "key_partnerships": [],
  "achievements": [],
  "culture": {
    "values": [],
    "benefits": [],
    "tech_stack": []
  },
  "extracted_at": "추출 일시",
  "source": "소스 URL"
}
```

## 수집 전략
- 네비게이션에 있는 링크만 따라감 (무한 크롤링 방지)
- 같은 도메인의 링크만 방문
- 각 페이지에서 `<main>` 또는 주요 콘텐츠 영역만 추출
- 뉴스/블로그 개별 글은 건너뜀 (목록만 수집)
- 최대 10페이지까지만 순회

## 사용법
채팅에서 `#company-crawler`를 컨텍스트로 추가한 뒤:
```
https://example.com 크롤링해줘
```
