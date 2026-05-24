import type { AnalysedApplicant, AnalysisResult, ApplicantInput, ChatMessage } from "./financeiq.types";
import {
  computeRiskProbability,
  decisionFor,
  generatePortfolio,
  ruleBasedConditions,
  ruleBasedExplanation,
  ruleBasedFactors,
} from "./financeiq.model";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

// Cached portfolio singleton (per worker instance).
let _portfolio: AnalysedApplicant[] | null = null;
export function getPortfolioSync(): AnalysedApplicant[] {
  if (!_portfolio) _portfolio = generatePortfolio(42);
  return _portfolio;
}

interface GatewayError extends Error {
  status?: number;
}

async function callGateway(body: unknown): Promise<any> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    const err: GatewayError = new Error("LOVABLE_API_KEY is not configured");
    err.status = 500;
    throw err;
  }
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    const err: GatewayError = new Error(
      resp.status === 429
        ? "AI rate limit reached. Please try again shortly."
        : resp.status === 402
          ? "AI credits exhausted. Add credits in Settings → Workspace → Usage."
          : `AI gateway error (${resp.status}): ${txt.slice(0, 200)}`,
    );
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

export async function aiAnalyseApplicant(input: ApplicantInput): Promise<AnalysisResult> {
  const prob = computeRiskProbability(input);
  const { risk_level, recommendation } = decisionFor(prob);

  // Try Gemini for explanation/factors via tool-calling
  try {
    const sys = `You are a senior credit risk analyst at a South African retail bank.
The deterministic model has already produced:
- default_probability: ${(prob * 100).toFixed(1)}%
- risk_level: ${risk_level}
- recommendation: ${recommendation}

You must call the return_analysis tool. Match the given risk_level and recommendation exactly. Provide 2-4 concise, plain-English key_risk_factors based on the applicant data, a single recommendation conditions sentence (or "N/A" if approving outright), and a two-sentence explanation aimed at the applicant. All money is in South African Rand (R).`;
    const user = `Applicant data:\n${JSON.stringify(input, null, 2)}`;

    const data = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_analysis",
            description: "Return the structured risk analysis.",
            parameters: {
              type: "object",
              properties: {
                key_risk_factors: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 5,
                },
                conditions: { type: "string" },
                explanation: { type: "string" },
              },
              required: ["key_risk_factors", "conditions", "explanation"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_analysis" } },
    });

    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (call?.function?.arguments) {
      const parsed = JSON.parse(call.function.arguments);
      return {
        risk_level,
        default_probability: prob,
        recommendation,
        key_risk_factors: Array.isArray(parsed.key_risk_factors)
          ? parsed.key_risk_factors
          : ruleBasedFactors(input),
        conditions: parsed.conditions || ruleBasedConditions(recommendation),
        explanation: parsed.explanation || ruleBasedExplanation(input, prob),
      };
    }
  } catch (e) {
    console.error("Gemini analyse fallback:", e);
  }

  return {
    risk_level,
    default_probability: prob,
    recommendation,
    key_risk_factors: ruleBasedFactors(input),
    explanation: ruleBasedExplanation(input, prob),
    conditions: ruleBasedConditions(recommendation),
  };
}

export async function aiChat(message: string, history: ChatMessage[]): Promise<string> {
  const portfolio = getPortfolioSync();
  const total = portfolio.length;
  const approved = portfolio.filter((p) => p.analysis.recommendation === "Approve").length;
  const declined = portfolio.filter((p) => p.analysis.recommendation === "Decline").length;
  const conditional = total - approved - declined;
  const avgCredit = Math.round(
    portfolio.reduce((s, p) => s + p.credit_score, 0) / total,
  );
  const avgIncome = Math.round(
    portfolio.reduce((s, p) => s + p.income, 0) / total,
  );
  const avgLoan = Math.round(
    portfolio.reduce((s, p) => s + p.loan_amount, 0) / total,
  );

  const summary = `PORTFOLIO SNAPSHOT (FinanceIQ, ${total} synthetic SA retail-loan applicants)
- Approved: ${approved}, Conditional: ${conditional}, Declined: ${declined}
- Avg credit score: ${avgCredit}
- Avg annual income: R${avgIncome.toLocaleString("en-ZA")}
- Avg loan amount: R${avgLoan.toLocaleString("en-ZA")}
- Model: deterministic logistic-style risk scorer using credit_score (35%), loan-to-income (25%), debt-to-income (20%), dependents (10%), employment status (10%).
- Risk tiers: <35% Approve · 35-59% Conditional · ≥60% Decline.

TOP-RISK APPLICANTS (sample):
${portfolio
  .slice()
  .sort((a, b) => b.analysis.default_probability - a.analysis.default_probability)
  .slice(0, 5)
  .map(
    (p) =>
      `- ${p.id}: credit ${p.credit_score}, income R${p.income.toLocaleString("en-ZA")}, loan R${p.loan_amount.toLocaleString("en-ZA")}, ${(p.analysis.default_probability * 100).toFixed(0)}% risk → ${p.analysis.recommendation}`,
  )
  .join("\n")}`;

  const sys = `You are FinanceIQ, an AI loan-risk assistant for a South African retail bank. Answer concisely, use Rand (R) for all currency, and use markdown formatting (**bold**, bullet lists with "- ", and \`inline code\` for IDs/numbers). When asked about applicants or portfolio metrics, ground answers in this snapshot:\n\n${summary}`;

  const trimmed = history.slice(-8);
  const data = await callGateway({
    model: MODEL,
    messages: [
      { role: "system", content: sys },
      ...trimmed.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ],
  });
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("AI returned an empty response.");
  }
  return reply;
}
