---
name: "onboarding-quiz"
displayName: "Onboarding Quiz"
description: "company-profile.json 데이터를 기반으로 신규 입사자를 위한 온보딩 퀴즈를 자동 생성하는 Power. 회사 정보, 서비스, 문화, 고객사 등을 재미있게 학습할 수 있도록 다양한 유형의 문제를 출제합니다."
keywords: ["onboarding", "quiz", "온보딩", "퀴즈", "신규입사자", "회사정보", "company profile", "교육", "학습"]
author: "workspace"
---

# Onboarding Quiz

## Overview

이 Power는 `company-profile.json` 데이터를 기반으로 신규 입사자용 온보딩 퀴즈를 자동 생성합니다.

## When to Use This Power

- 사용자가 온보딩 퀴즈를 만들어달라고 할 때
- 신규 입사자 교육 자료가 필요할 때
- company-profile.json 기반으로 회사 학습 문제를 생성할 때

## Prerequisites

- `project/onboarding-data/company-profile.json` 파일이 존재해야 합니다
- `company-crawler` Power로 사전에 회사 정보가 수집되어 있어야 합니다

## Steering

- **퀴즈 생성 워크플로우** → `readPowerSteering("onboarding-quiz", "generate-quiz.md")`

## Quick Usage Examples

### 전체 퀴즈 생성
"온보딩 퀴즈 만들어줘"
→ `generate-quiz.md` steering을 로드하고 워크플로우를 따릅니다.

### 특정 카테고리 퀴즈
"서비스/제품 관련 퀴즈만 만들어줘"

### 난이도 조절
"쉬운 문제 위주로 온보딩 퀴즈 만들어줘"
