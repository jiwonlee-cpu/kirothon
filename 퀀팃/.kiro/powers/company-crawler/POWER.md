---
name: "company-crawler"
displayName: "Company Crawler"
description: "회사 홈페이지 URL을 입력하면 Playwright MCP로 사이트를 크롤링하여 회사 정보를 자동 수집하는 Power. 메인 페이지와 네비게이션 링크의 서브 페이지들을 자동으로 순회하며 회사 정보를 구조화된 JSON으로 저장합니다."
keywords: ["crawler", "크롤링", "크롤러", "회사정보", "company", "홈페이지", "website", "scraping", "스크래핑", "playwright", "수집"]
author: "workspace"
---

# Company Crawler

## Overview

회사 홈페이지 URL 하나만 입력하면, Playwright MCP를 활용하여 메인 페이지와 네비게이션 링크의 서브 페이지들을 자동으로 순회하며 회사 정보를 수집합니다.

## When to Use This Power

- 사용자가 회사 홈페이지 URL을 주고 크롤링/수집을 요청할 때
- 온보딩 데이터를 위해 회사 정보를 수집해야 할 때
- 회사 프로필 JSON을 생성해야 할 때

## Prerequisites

- Playwright MCP 서버가 `.kiro/settings/mcp.json`에 설정되어 있어야 합니다
- MCP 서버가 연결 상태여야 합니다

## Steering

- **크롤링 워크플로우** → `readPowerSteering("company-crawler", "crawl-website.md")`

## Quick Usage Examples

### 회사 홈페이지 크롤링
"https://example.com 크롤링해줘"
→ `crawl-website.md` steering을 로드하고 워크플로우를 따릅니다.
