# WebInspector — CLAUDE.md

> **Chrome Extension** — 실시간 웹 디자인 정보 추출·분석·변환 도구
> 웹 디자이너/개발자를 위한 실시간 디자인 정보 추출 도구

---

## 📋 프로젝트 개요

사용자가 브라우저에서 보고 있는 현재 디자인, layout, 이미지, style 등을 **눈에 보이는 그대로** HTML 포맷 싱글파일로 다운로드.

**핵심 철학:** 최대한 눈에 보이는 필수 내용만 남겨서 HTML tag, style, layout을 간결하게 생성. 복잡한 HTML 코드를 단순화시켜 디자인/구조/style을 쉽게 파악할 수 있게 함.

**지원 변환 포맷:** PDF, HWP, DOCX, 이미지 파일 변환 제공. Figma, XD 등 디자인 툴에서 import 가능한 형태로도 지원.

---

## 🎯 대상 고객

- **Primary:** 프론트엔드 개발자, 웹 디자이너, UI 엔지니어
- **Secondary:** 프로덕트 매니저, QA 엔지니어, 디자인 에이전시
- **Goal:** 일일 활성 사용자(DAU) 1,000,000+

---

## ⭐ 핵심 기능 TOP 3

1. **🔍 요소 검사** — 크기·여백·폰트 실시간 확인 (hover 시각화)
2. **📐 레이아웃 분석** — 구조적 HTML 추출 및 단순화 (AI 기반)
3. **💾 디자인 추출/저장 + 파일 포맷 컨버전** — HTML → PDF/HWP/DOCX/Image + Figma/XD Import

---

## 💰 수익 모델

### Freemium + Subscription

| 구분 | Free Tier | Premium (월 구독) |
|------|-----------|-------------------|
| 광고 | Google AdSense | ❌ 광고 제거 |
| 다운로드 | 3회/일 제한 | ✅ 무제한 |
| AI 분석 | ❌ | ✅ DeepSeek AI 분석 |
| 파일 포맷 | HTML only | ✅ PDF/HWP/DOCX/Image + Figma/XD |
| 가격 | 무료 | 월 정액 |

**보안/인증:** 결제 즉시 plan에 따라 활성화, 보안/인증/부정사용 방지 필수 구현

---

## 🏆 경쟁사 차별점

VisBug / CSS Peeper 대비 **통합 솔루션**:

| 기능 | VisBug | CSS Peeper | WebInspector |
|------|--------|------------|--------------|
| 요소 측정 | ✅ | ❌ | ✅ |
| CSS 검사 | ✅ | ✅ | ✅ |
| 디자인 추출 | ❌ | ❌ | ✅ |
| 오프라인 저장 | ❌ | ❌ | ✅ |
| 디자인 툴 포맷 지원 | ❌ | ❌ | ✅ (Figma/XD) |
| AI 분석 | ❌ | ❌ | ✅ |

---

## 🚫 절대 하지 말아야 할 것 (Do Not)

1. **절대 경쟁사의 디자인/UI를 완전 동일하게 사용 금지.** 참고는 okay, 하나라도 같지 않게.
2. **모든 페이지는 동일한 font, 컴포넌트, layout, 컬럼, 분위기, 양식으로 일관성 있게 제작.**
3. **디자인이 구리면 절대 안 됨.** 2025-2026년 기준 세련되고 깔끔한 디자인만 사용.
4. **공통 기능 재사용 원칙.** 비슷한 기능 여기저기 남발 금지.
5. **코드 수정 시 연관 코드 영향 확인, 더미 코드 방지.**
6. **DB 마스터 데이터는 선계획, 체계적으로 설계.**
7. **하루 2회 release + snapshot branch 생성.**

---

## 🛠 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| **Frontend** | React + TypeScript (Chrome Extension MV3) | Base v1.0.0 |
| **Backend** | Spring Boot | Base v1.0.0 |
| **Database** | PostgreSQL | 16 |
| **AI** | DeepSeek API | HTML 단순화, 디자인 분석 |
| **Auth** | Google OAuth 2.0 | — |
| **Payment** | Toss Payments (KR) / Stripe (Global) | — |

---

## 🧠 AI Instructions (Agent Guide)

When modifying code:

1. **Base Framework 버전과 일관성 유지** (Backend v1.0.0 / Frontend v1.0.0)
2. **엔터프라이즈 안정성 최우선** — 과격한 리팩토링보다 안정성
3. **시각적 정밀도는 신성하다** — 추출된 HTML은 원본 디자인의 95% 이상 보존
4. **단순함이 승리한다** — 복잡성을 추가하지 말고 제거할 것

### 신규 기능 제안 전 체크리스트

1. ❓ 타겟 고객(개발자/디자이너)에게 실질적 가치를 제공하는가?
2. ❓ Freemium → Premium 전략에 부합하는가?
3. ❓ 추출 워크플로우를 단순화하는가, 복잡하게 하는가?
4. ❓ 수익 창출 또는 비용 절감에 기여하는가?

→ **#1 또는 #2가 "No"면 기능 제안 거절.**

---

## 🔐 보안 & 결제

- **Auth:** Google OAuth 2.0 로그인
- **JWT:** JWT 인증 토큰 기반 세션 관리
- **Rate Limit:** 다운로드 횟수 제한 + Device Fingerprinting
- **Premium:** 서버사이드에서만 Premium 활성화 검증 (클라이언트 변조 방지)

---

## 📐 디자인 원칙

- **Consistency:** 통일된 디자인 언어 (font, component, layout, color)
- **Modernity:** 2025-2026 트렌드 반영, 세련되고 깔끔한 UI
- **Simplicity:** 불필요한 복잡성 제거, 직관적인 UX
- **Reusability:** 공통 컴포넌트 재사용, 중복 코드 금지

---

## 📦 릴리스 정책

- **Daily Releases:** 하루 2회 release
- **Snapshot Branches:** 각 release마다 snapshot branch 생성
- **Commit Convention:** `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` prefix 사용
