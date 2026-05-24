import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { analyseApplicantFn } from "@/lib/financeiq.functions";
import type { AnalysisResult, ApplicantInput, EducationLevel, EmploymentType } from "@/lib/financeiq.types";
import { decisionBg, formatRFull, riskBg } from "@/lib/financeiq.format";

interface Props {
  onClose: () => void;
}

const DEFAULT: ApplicantInput = {
  age: 35,
  income: 420_000,
  credit_score: 680,
  loan_amount: 180_000,
  loan_term_months: 36,
  existing_debt: 60_000,
  employment_years: 5,
  num_dependents: 2,
  education: "Bachelor",
  employment_type: "Employed",
};

export function NewApplicantForm({ onClose }: Props) {
  const [form, setForm] = useState<ApplicantInput>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const analyse = useServerFn(analyseApplicantFn);

  const upd = <K extends keyof ApplicantInput>(k: K, v: ApplicantInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await analyse({ data: form });
      setResult(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to analyse applicant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <h2 className="font-display font-bold text-lg">Assess New Applicant</h2>
            <p className="text-xs text-muted-foreground">All amounts in South African Rand (R)</p>
          </div>
          <button onClick={onClose} className="size-9 rounded-lg hover:bg-surface2 grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 grid grid-cols-2 gap-4 text-sm">
          <Field label="Age">
            <input type="number" min={18} max={100} value={form.age}
              onChange={(e) => upd("age", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Annual Income (R)">
            <input type="number" min={0} value={form.income}
              onChange={(e) => upd("income", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label={`Credit Score: ${form.credit_score}`}>
            <input type="range" min={300} max={850} value={form.credit_score}
              onChange={(e) => upd("credit_score", Number(e.target.value))} className="w-full accent-green" />
          </Field>
          <Field label="Loan Amount (R)">
            <input type="number" min={1000} value={form.loan_amount}
              onChange={(e) => upd("loan_amount", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Loan Term (months)">
            <select value={form.loan_term_months}
              onChange={(e) => upd("loan_term_months", Number(e.target.value))} className={inputCls}>
              {[12, 24, 36, 48, 60].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Existing Debt (R)">
            <input type="number" min={0} value={form.existing_debt}
              onChange={(e) => upd("existing_debt", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Employment Type">
            <select value={form.employment_type}
              onChange={(e) => upd("employment_type", e.target.value as EmploymentType)} className={inputCls}>
              {(["Employed", "Self-Employed", "Contract", "Unemployed"] as EmploymentType[]).map((t) =>
                <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Employment Years">
            <input type="number" min={0} max={60} value={form.employment_years}
              onChange={(e) => upd("employment_years", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Dependents">
            <input type="number" min={0} max={15} value={form.num_dependents}
              onChange={(e) => upd("num_dependents", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Education">
            <select value={form.education}
              onChange={(e) => upd("education", e.target.value as EducationLevel)} className={inputCls}>
              {(["High School", "Diploma", "Bachelor", "Master", "PhD"] as EducationLevel[]).map((t) =>
                <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <div className="col-span-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green text-primary-foreground font-semibold rounded-lg py-3 hover:brightness-110 transition disabled:opacity-60"
            >
              {loading ? "Assessing…" : "Assess Risk"}
            </button>
          </div>
        </form>

        {result && (
          <div className="px-6 pb-6 border-t border-border pt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${riskBg(result.risk_level)}`}>
                {result.risk_level} Risk
              </span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${decisionBg(result.recommendation)}`}>
                {result.recommendation}
              </span>
              <span className="font-mono text-sm text-muted-foreground ml-auto">
                Loan: {formatRFull(form.loan_amount)}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Default probability</span>
                <span className="font-mono font-semibold">{(result.default_probability * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface2 overflow-hidden">
                <div
                  className={`h-full ${
                    result.risk_level === "Low" ? "bg-green" : result.risk_level === "High" ? "bg-red" : "bg-amber"
                  }`}
                  style={{ width: `${Math.min(100, result.default_probability * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Key risk factors</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {result.key_risk_factors.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Explanation</h3>
              <p className="text-sm leading-relaxed">{result.explanation}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Conditions</h3>
              <p className="text-sm leading-relaxed text-foreground/80">{result.conditions}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-green/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 block">
      <span className="block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
