# FinanceIQ — AI Loan Risk Assistant

An AI-powered loan risk assessment chatbot for the South African retail banking sector. Built for the **Clickatell × CAPACITI AI Bootcamp 2026 — Week 4**.

FinanceIQ pairs a deterministic, logistic-style risk scorer with a Gemini-powered conversational interface. Users can chat with the assistant about portfolio risk, assess new loan applicants, and explore a dashboard of 100 synthetic applicants — all in South African Rand (R).

---

## Features

- **AI Chat** — Conversational assistant grounded in live portfolio data (powered by Gemini via the Lovable AI Gateway).
- **Risk Assessment** — Submit a new applicant and receive a risk level, default probability, recommendation, key risk factors, conditions, and plain-English explanation.
- **Portfolio Dashboard** — 100 pre-loaded applicants with sortable table, filter chips, donut chart, feature importance bar, and insight cards.
- **Deterministic Scoring** — Reproducible risk scoring formula so results stay stable across requests.
- **Rand Throughout** — All currency formatted as `R` (en-ZA).

---

## Tech Stack

| Layer        | Choice                                                                 |
|--------------|------------------------------------------------------------------------|
| Frontend     | React 19 + TanStack Start + Tailwind CSS (dark theme)                  |
| Server       | TanStack `createServerFn` handlers (TypeScript on Cloudflare Workers)  |
| AI           | Google `gemini-3-flash-preview` via the Lovable AI Gateway             |
| Data         | 100 synthetic applicants generated in-memory with a seeded RNG         |
| Tooling      | Vite 7, TypeScript (strict), Bun                                       |

> **Note on the original spec.** The original brief proposed a Python/FastAPI + scikit-learn backend. Lovable runs on Cloudflare Workers (TypeScript only), so the same logistic-style risk model was ported to TypeScript server functions. Behavior matches the spec: the same formula, the same risk tiers, and the same Gemini-powered explanations.

---

## Project Structure

```
src/
├── routes/
│   ├── __root.tsx               # Root layout
│   └── index.tsx                # Chatbot page (main app)
├── components/financeiq/
│   ├── Sidebar.tsx              # Logo, dashboard button, quick questions
│   ├── MessageBubble.tsx        # Chat message renderer (markdown-lite)
│   ├── DashboardModal.tsx       # Portfolio dashboard overlay
│   └── NewApplicantForm.tsx     # New applicant assessment modal
├── lib/
│   ├── financeiq.types.ts       # Shared TypeScript types
│   ├── financeiq.model.ts       # Risk formula + synthetic data generator
│   ├── financeiq.server.ts      # Gemini gateway calls + portfolio singleton
│   ├── financeiq.functions.ts   # createServerFn wrappers (the "API")
│   └── financeiq.format.ts      # Rand / percent formatting
└── styles.css                   # Dark theme tokens (oklch) + fonts
```

---

## Risk Model

A deterministic, logistic-style scorer (ported from the original Python spec):

```
debt_to_income = existing_debt / income
loan_to_income = loan_amount / income

risk = ((850 - credit_score) / 550) * 0.35
     + loan_to_income           * 0.25
     + debt_to_income           * 0.20
     + (num_dependents / 5)     * 0.10
     + (employment == "Unemployed" ? 0.10 : 0)

default_probability = clamp(risk, 0, 1)
```

### Risk Tiers

| Probability     | Risk Level | Recommendation         |
|-----------------|------------|------------------------|
| `< 0.35`        | Low        | Approve                |
| `0.35 – 0.59`   | Medium     | Conditional Approval   |
| `≥ 0.60`        | High       | Decline                |

### Feature Importance (fixed weights)

| Feature           | Weight |
|-------------------|--------|
| Credit Score      | 0.35   |
| Loan-to-Income    | 0.25   |
| Debt-to-Income    | 0.20   |
| Dependents        | 0.10   |
| Employment Type   | 0.10   |

---

## Server Functions

All backend logic is implemented as TanStack `createServerFn` handlers — no separate Python server is required.

| Function              | Purpose                                                   |
|-----------------------|-----------------------------------------------------------|
| `analyseApplicantFn`  | Score a single applicant and ask Gemini for an explanation|
| `getPortfolioFn`      | Return the 100 pre-analysed applicants                    |
| `getPortfolioStatsFn` | Totals, approval rates, accuracy, averages                |
| `chatFn`              | Chat with the assistant (last 8 turns + portfolio context)|

Gemini calls use structured tool-calling for analysis and standard completions for chat. AI failures fall back to rule-based explanations.

---

## Running Locally

Lovable runs the project automatically in preview, but if you clone the repo:

```bash
bun install
bun run dev
```

No API keys, `.env`, or Python environment required — `LOVABLE_API_KEY` is auto-provisioned for the AI Gateway.

---

## Acknowledgements

- **Clickatell × CAPACITI AI Bootcamp 2026** — Week 4 project brief.
- **Lovable AI Gateway** — managed access to Gemini models.
- All applicant data is **synthetic** and used for demonstration only.
