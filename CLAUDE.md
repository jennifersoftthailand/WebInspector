# WebInspector

> Chrome Extension — 실시간 웹 디자인 정보 추출·분석·변환 도구
> Built on SaaS Factory Base Framework

## Project Overview
WebInspector revolutionizes how web designers and developers extract design information from any website. It captures visual design — layout, images, styles, typography — exactly as rendered, generating a clean simplified HTML file.

**Core value:** See it → Extract it → Use it (Figma, XD, PDF, HWP, DOCX)

## Technology Stack
- **Frontend:** React + TypeScript (Chrome Extension MV3) — Base v1.0.0
- **Backend:** Spring Boot 3.x — Base v1.0.0
- **Database:** PostgreSQL 16
- **AI:** DeepSeek API (HTML simplification, design analysis)

## Target Customers
- Primary: Frontend developers, Web designers, UI engineers
- Secondary: Product managers, QA engineers, Design agencies
- Goal: 1,000,000+ daily active users

## Core Features
1. **Element Inspector** — Real-time dimensions, margins, fonts, colors, CSS properties
2. **Layout Analysis** — AI-powered HTML simplification, structural extraction, CSS optimization
3. **Design Export** — Multi-format (HTML/PDF/HWP/DOCX/PNG), Figma/XD import support

## Business Strategy
- **Revenue:** Freemium + Google AdSense (free) → Monthly subscription (premium)
- **Free tier:** Limited downloads (3/day), ads, basic formats
- **Premium:** Unlimited downloads, ad-free, AI analysis, all formats, design tool exports
- **Focus:** Visual fidelity 95%+, enterprise reliability, simplicity
- **Avoid:** Bloat features, complex workflows, steep learning curves

## Competitive Differentiation
VisBug/CSS Peeper 대비 통합 솔루션 (측정+검사+디자인 추출+오프라인 저장+디자인 툴 연동)

## Design Principles
1. No identical copying of competitor designs — reference only, always distinct
2. Consistent design language across all pages
3. Beautiful by 2025-2026 standards — sleek, modern, clean
4. Reuse common components — no ad-hoc duplicate functionality
5. Clean code — remove dead code, check impact before changes
6. Database-first design — master data planned before implementation
7. Daily releases — 2 releases + snapshot branches per day

## Project Structure


## AI Instructions

When modifying code:
- Maintain Base Framework consistency (Backend v1.0.0 / Frontend v1.0.0)
- Enterprise reliability over aggressive refactoring
- Visual fidelity is sacred — extracted HTML must preserve appearance 95%+
- Simplicity wins — remove complexity, not add it

Before proposing new features, ask:
1. Does it serve our target customers (developers/designers)?
2. Does it align with our freemium→premium strategy?
3. Does it simplify or complicate the extraction workflow?
4. Will it generate revenue or reduce cost?
If #1 or #2 is "No", reject the feature.

## Security & Payment
- Google OAuth 2.0 login
- Payment: Toss Payments (KR) / Stripe (Global)
- JWT authentication
- Download rate limiting + device fingerprinting
- Premium validation server-side only
