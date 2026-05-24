import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AnalysedApplicant, AnalysisResult, ChatMessage, PortfolioStats } from "./financeiq.types";

const educationEnum = z.enum(["High School", "Diploma", "Bachelor", "Master", "PhD"]);
const employmentEnum = z.enum(["Employed", "Self-Employed", "Contract", "Unemployed"]);

const applicantSchema = z.object({
  age: z.number().min(18).max(100),
  income: z.number().min(0).max(50_000_000),
  credit_score: z.number().min(300).max(850),
  loan_amount: z.number().min(1000).max(50_000_000),
  loan_term_months: z.number().min(6).max(360),
  existing_debt: z.number().min(0).max(50_000_000),
  employment_years: z.number().min(0).max(60),
  num_dependents: z.number().min(0).max(15),
  education: educationEnum,
  employment_type: employmentEnum,
});

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .max(20)
    .default([]),
});

export const analyseApplicantFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => applicantSchema.parse(data))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const { aiAnalyseApplicant } = await import("./financeiq.server");
    return aiAnalyseApplicant(data);
  });

export const getPortfolioFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnalysedApplicant[]> => {
    const { getPortfolioSync } = await import("./financeiq.server");
    return getPortfolioSync();
  },
);

export const getPortfolioStatsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PortfolioStats> => {
    const { getPortfolioSync } = await import("./financeiq.server");
    const p = getPortfolioSync();
    const total = p.length;
    const approved = p.filter((x) => x.analysis.recommendation === "Approve").length;
    const declined = p.filter((x) => x.analysis.recommendation === "Decline").length;
    const conditional = total - approved - declined;
    // Re-score check: deterministic model => 100% match with default_label-derived decisions.
    const correct = p.filter((x) => {
      const wouldDefault = x.analysis.default_probability > 0.45 ? 1 : 0;
      return wouldDefault === x.default_label;
    }).length;
    return {
      total,
      approved,
      declined,
      conditional,
      accuracy: total > 0 ? correct / total : 0,
      avg_credit_score: Math.round(p.reduce((s, x) => s + x.credit_score, 0) / total),
      avg_income: Math.round(p.reduce((s, x) => s + x.income, 0) / total),
      avg_loan_amount: Math.round(p.reduce((s, x) => s + x.loan_amount, 0) / total),
    };
  },
);

export const chatFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => chatSchema.parse(data))
  .handler(async ({ data }): Promise<{ reply: string }> => {
    const { aiChat } = await import("./financeiq.server");
    const reply = await aiChat(data.message, data.history as ChatMessage[]);
    return { reply };
  });
