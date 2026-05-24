import type {
  AnalysedApplicant,
  Applicant,
  ApplicantInput,
  EducationLevel,
  EmploymentType,
  Recommendation,
  RiskLevel,
} from "./financeiq.types";

// Deterministic seeded RNG (mulberry32) so the 100 applicants are stable.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const EDUCATIONS: readonly EducationLevel[] = [
  "High School",
  "Diploma",
  "Bachelor",
  "Master",
  "PhD",
];
const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  "Employed",
  "Employed",
  "Employed",
  "Self-Employed",
  "Contract",
  "Unemployed",
];
const LOAN_TERMS = [12, 24, 36, 48, 60];

export function computeRiskProbability(a: ApplicantInput): number {
  const income = Math.max(a.income, 1);
  const debt_to_income = a.existing_debt / income;
  const loan_to_income = a.loan_amount / income;
  const credit_part = ((850 - a.credit_score) / 550) * 0.35;
  const lti_part = loan_to_income * 0.25;
  const dti_part = debt_to_income * 0.20;
  const dep_part = (a.num_dependents / 5) * 0.10;
  const unemp_part = a.employment_type === "Unemployed" ? 0.10 : 0;
  const risk = credit_part + lti_part + dti_part + dep_part + unemp_part;
  return Math.max(0, Math.min(1, risk));
}

export function decisionFor(prob: number): {
  risk_level: RiskLevel;
  recommendation: Recommendation;
} {
  if (prob < 0.35) return { risk_level: "Low", recommendation: "Approve" };
  if (prob < 0.60)
    return { risk_level: "Medium", recommendation: "Conditional Approval" };
  return { risk_level: "High", recommendation: "Decline" };
}

export function ruleBasedFactors(a: ApplicantInput): string[] {
  const factors: string[] = [];
  const income = Math.max(a.income, 1);
  const dti = a.existing_debt / income;
  const lti = a.loan_amount / income;
  if (a.credit_score < 500) factors.push("Very low credit score");
  else if (a.credit_score < 620) factors.push("Below-average credit score");
  if (dti > 0.4) factors.push("High debt-to-income ratio");
  if (lti > 1.0) factors.push("Loan amount exceeds annual income");
  else if (lti > 0.6) factors.push("Loan-to-income ratio is elevated");
  if (a.employment_type === "Unemployed") factors.push("Currently unemployed");
  if (a.num_dependents >= 4) factors.push("Large number of dependents");
  if (a.employment_years < 1) factors.push("Limited employment history");
  if (factors.length === 0) factors.push("Strong overall financial profile");
  return factors.slice(0, 4);
}

export function ruleBasedExplanation(a: ApplicantInput, prob: number): string {
  const { recommendation } = decisionFor(prob);
  const pct = Math.round(prob * 100);
  if (recommendation === "Approve") {
    return `Based on a credit score of ${a.credit_score} and a healthy income-to-loan ratio, default risk is estimated at ${pct}%. The application meets the bank's standard approval criteria.`;
  }
  if (recommendation === "Conditional Approval") {
    return `The applicant shows moderate risk (${pct}% estimated default probability). Approval is possible with safeguards such as a co-signer, lower loan amount, or shorter term.`;
  }
  return `Estimated default probability of ${pct}% exceeds the bank's risk threshold. Affordability and credit indicators do not currently support approval.`;
}

export function ruleBasedConditions(rec: Recommendation): string {
  if (rec === "Approve") return "N/A";
  if (rec === "Conditional Approval")
    return "Require co-signer, proof of stable income for 6+ months, or reduced principal.";
  return "Decline; revisit after credit score improvement and debt reduction.";
}

export function generatePortfolio(seed = 42): AnalysedApplicant[] {
  const rng = mulberry32(seed);
  const out: AnalysedApplicant[] = [];
  for (let i = 1; i <= 100; i++) {
    const employment_type = pick(rng, EMPLOYMENT_TYPES);
    const employment_years =
      employment_type === "Unemployed" ? 0 : randInt(rng, 0, 25);
    const age = randInt(rng, 22, 65);
    const income =
      employment_type === "Unemployed"
        ? randInt(rng, 30_000, 90_000)
        : randInt(rng, 120_000, 1_500_000);
    const credit_score = randInt(rng, 380, 820);
    const loan_amount = randInt(rng, 25_000, Math.max(50_000, income * 1.4));
    const loan_term_months = pick(rng, LOAN_TERMS);
    const existing_debt = randInt(rng, 0, Math.floor(income * 0.7));
    const num_dependents = randInt(rng, 0, 5);
    const education = pick(rng, EDUCATIONS);

    const input: ApplicantInput = {
      age,
      income,
      credit_score,
      loan_amount,
      loan_term_months,
      existing_debt,
      employment_years,
      num_dependents,
      education,
      employment_type,
    };
    const prob = computeRiskProbability(input);
    const decision = decisionFor(prob);
    const debt_to_income = existing_debt / Math.max(income, 1);
    const loan_to_income = loan_amount / Math.max(income, 1);

    const applicant: Applicant = {
      ...input,
      id: `LA-${String(i).padStart(4, "0")}`,
      debt_to_income,
      loan_to_income,
      default_label: prob > 0.45 ? 1 : 0,
    };
    out.push({
      ...applicant,
      analysis: {
        risk_level: decision.risk_level,
        default_probability: prob,
        recommendation: decision.recommendation,
      },
    });
  }
  return out;
}

export const FEATURE_IMPORTANCE: { feature: string; weight: number }[] = [
  { feature: "Credit Score", weight: 0.35 },
  { feature: "Loan-to-Income", weight: 0.25 },
  { feature: "Debt-to-Income", weight: 0.20 },
  { feature: "Dependents", weight: 0.10 },
  { feature: "Employment Type", weight: 0.10 },
  { feature: "Income", weight: 0.08 },
  { feature: "Loan Term", weight: 0.05 },
];
