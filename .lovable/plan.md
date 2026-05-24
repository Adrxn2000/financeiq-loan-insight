# FinanceIQ — Implementation Plan

A dark-themed AI loan-risk assistant for the Finance/Banking industry. Adapted to Lovable's stack: the Python/FastAPI + scikit-learn backend is reimplemented as TypeScript server functions, and Gemini calls go through the Lovable AI Gateway (no API key needed).

## Stack
- Frontend: React 19 + TanStack Start + Tailwind, dark theme (#080B10 surface, #00E5A0 green, #FF4D6D red, #FFB020 amber), Syne + JetBrains Mono via Google Fonts.
- Backend: TanStack `createServerFn` handlers (the FastAPI endpoints, ported to TS).
- AI: Lovable AI Gateway, model `google/gemini-3-flash-preview`, structured output via tool-calling.
- Data: 100 synthetic applicants generated once on server startup, held in-memory (no DB needed — matches the spec's pre-loaded portfolio behavior).
- Currency: South African Rand (R) throughout.

## Risk model (ported to TS)
Same formula as the spec, deterministic seeded RNG so the 100 applicants are stable across requests:

```
debt_to_income = existing_debt / income
loan_to_income = loan_amount / income
risk = (850-credit_score)/550*0.35
     + loan_to_income*0.25
     + debt_to_income*0.20
     + (num_dependents/5)*0.10
     + (employment_type==="Unemployed" ? 0.10 : 0)
default_probability = clamp(risk, 0, 1)   // used directly as probability
```

Tiers: <0.35 Low/Approve · 0.35–0.59 Medium/Conditional · ≥0.60 High/Decline.

"Model accuracy" surfaced in the UI is computed by re-scoring the 100 applicants against their generated labels (will be ~100% since labels come from the same formula — matches the screenshot spec).

Feature importance shown in the dashboard uses the fixed weights above (credit_score 0.35, loan_to_income 0.25, debt_to_income 0.20, dependents 0.10, employment 0.10, plus derived: income, loan_term).

## Server functions (replaces FastAPI)
All in `src/lib/financeiq.functions.ts` + helpers in `src/lib/financeiq.server.ts`:
- `analyseApplicant({ applicant })` → risk_level, default_probability, recommendation, key_risk_factors, conditions, explanation. Calls Gemini for explanation; falls back to rule-based reasons (credit<500, DTI>0.4, LTI>1.0, Unemployed) on AI failure.
- `getPortfolio()` → the 100 pre-analysed applicants.
- `getPortfolioStats()` → totals, approved/declined/conditional counts, averages, accuracy.
- `chatWithAssistant({ message, history })` → sends last 8 messages + portfolio summary as system context to Gemini, returns reply.

Gemini calls go through the Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) using `LOVABLE_API_KEY` (auto-provisioned, no user setup). Structured JSON for `analyseApplicant` uses tool-calling; chat uses normal completion. 429/402 errors are caught and surfaced as toasts.

## Routes & UI
Single route `/` (chatbot is the app). Dashboard and New Applicant Form are modal overlays, per spec.

`src/routes/index.tsx` — two-column layout:

**Left sidebar (280px):**
- FinanceIQ logo + "AI Risk Assistant"
- Green "View Dashboard" button (opens dashboard modal)
- Portfolio stats panel: Total / Approved / Declined / Conditional / Accuracy with mini horizontal bars
- 8 quick-question buttons (pre-seeded prompts that fire to chat)
- "Assess New Applicant" button (opens form modal)

**Right main area:**
- Top bar: "AI Loan Risk Assistant" + animated green status dot
- Scrollable messages (`MessageBubble`): AI dark card left + "FQ" green avatar; user dark-blue card right + "AM" avatar; markdown-style bold/bullets/inline-code formatting
- Animated 3-dot typing indicator while awaiting response
- Bottom input bar: textarea + send (Enter sends, Shift+Enter newline)

**Dashboard modal (full-screen overlay):**
- Close on X / Escape / outside click
- 5 metric cards (Total, Approved, Declined, Conditional, Accuracy)
- Filter chips: All / Approve / Decline / Conditional / High Risk / Low Risk
- Sortable `ApplicantTable`: ID, Credit Score, Income, Loan Amount, Risk badge, Probability bar, Decision badge — click row → right-side detail panel with full AI analysis (calls `analyseApplicant` lazily and caches)
- Donut chart (canvas) of approve/decline/conditional split
- Horizontal bar chart of top 7 feature importances
- 3 insight cards at the bottom

**New Applicant Form modal:**
- Fields: Age, Income (R), Credit Score (slider 300–850), Loan Amount (R), Loan Term dropdown (12/24/36/48/60), Existing Debt (R), Employment Type, Employment Years, Dependents, Education
- "Assess Risk" → calls `analyseApplicant` → shows risk badge, probability bar, recommendation, risk factors, plain-English explanation, conditions

## Component files
```
src/routes/index.tsx
src/components/financeiq/Sidebar.tsx
src/components/financeiq/Chatbot.tsx
src/components/financeiq/MessageBubble.tsx
src/components/financeiq/TypingIndicator.tsx
src/components/financeiq/DashboardModal.tsx
src/components/financeiq/ApplicantTable.tsx
src/components/financeiq/ApplicantDetail.tsx
src/components/financeiq/DonutChart.tsx
src/components/financeiq/FeatureImportance.tsx
src/components/financeiq/NewApplicantForm.tsx
src/lib/financeiq.types.ts
src/lib/financeiq.model.ts          // synthetic data + scoring (pure, isomorphic)
src/lib/financeiq.server.ts         // Gemini gateway calls, portfolio singleton
src/lib/financeiq.functions.ts      // createServerFn wrappers
```

## Design tokens
Added to `src/styles.css` as oklch equivalents of the spec hexes, plus `--font-display: 'Syne'` and `--font-mono: 'JetBrains Mono'`. All components use semantic tokens (`bg-surface`, `text-foreground`, `text-green`, etc.) — no hardcoded colors in JSX.

## Out of scope (vs original spec)
- No Python/FastAPI process, no `requirements.txt`, no `.env` — Lovable runs TypeScript on Cloudflare Workers and AI keys are auto-managed.
- No real scikit-learn LogisticRegression training — replaced by the deterministic risk formula from the spec (the labels in the spec are already formula-derived, so behavior is equivalent).
- No `data/loan_data.csv` file — applicants generated in code. Can add a CSV export button to the dashboard if you want.

## What you'll get
A polished dark FinanceIQ chatbot at `/` with working AI chat, working new-applicant risk analysis, and a full dashboard over 100 deterministic synthetic applicants — runnable immediately in preview, no setup.
