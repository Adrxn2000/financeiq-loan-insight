import type { AnalysedApplicant, PortfolioStats } from "@/lib/financeiq.types";

export function formatR(n: number): string {
  if (n >= 1_000_000) return `R${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `R${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `R${n.toLocaleString("en-ZA")}`;
}

export function formatRFull(n: number): string {
  return `R${Math.round(n).toLocaleString("en-ZA")}`;
}

export function decisionColor(rec: string): string {
  if (rec === "Approve") return "text-green";
  if (rec === "Decline") return "text-red";
  return "text-amber";
}
export function decisionBg(rec: string): string {
  if (rec === "Approve") return "bg-green/15 text-green border-green/30";
  if (rec === "Decline") return "bg-red/15 text-red border-red/30";
  return "bg-amber/15 text-amber border-amber/30";
}
export function riskBg(level: string): string {
  if (level === "Low") return "bg-green/15 text-green border-green/30";
  if (level === "High") return "bg-red/15 text-red border-red/30";
  return "bg-amber/15 text-amber border-amber/30";
}

export function summariseStats(p: AnalysedApplicant[]): PortfolioStats {
  const total = p.length;
  const approved = p.filter((x) => x.analysis.recommendation === "Approve").length;
  const declined = p.filter((x) => x.analysis.recommendation === "Decline").length;
  const conditional = total - approved - declined;
  return {
    total,
    approved,
    declined,
    conditional,
    accuracy: 1,
    avg_credit_score: Math.round(p.reduce((s, x) => s + x.credit_score, 0) / Math.max(total, 1)),
    avg_income: Math.round(p.reduce((s, x) => s + x.income, 0) / Math.max(total, 1)),
    avg_loan_amount: Math.round(p.reduce((s, x) => s + x.loan_amount, 0) / Math.max(total, 1)),
  };
}
