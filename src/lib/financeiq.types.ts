export type EducationLevel = "High School" | "Diploma" | "Bachelor" | "Master" | "PhD";
export type EmploymentType = "Employed" | "Self-Employed" | "Contract" | "Unemployed";
export type RiskLevel = "Low" | "Medium" | "High";
export type Recommendation = "Approve" | "Decline" | "Conditional Approval";

export interface ApplicantInput {
  age: number;
  income: number;
  credit_score: number;
  loan_amount: number;
  loan_term_months: number;
  existing_debt: number;
  employment_years: number;
  num_dependents: number;
  education: EducationLevel;
  employment_type: EmploymentType;
}

export interface Applicant extends ApplicantInput {
  id: string;
  debt_to_income: number;
  loan_to_income: number;
  default_label: 0 | 1;
}

export interface AnalysisResult {
  risk_level: RiskLevel;
  default_probability: number;
  recommendation: Recommendation;
  key_risk_factors: string[];
  explanation: string;
  conditions: string;
}

export interface AnalysedApplicant extends Applicant {
  analysis: Pick<AnalysisResult, "risk_level" | "default_probability" | "recommendation">;
}

export interface PortfolioStats {
  total: number;
  approved: number;
  declined: number;
  conditional: number;
  accuracy: number;
  avg_credit_score: number;
  avg_income: number;
  avg_loan_amount: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
