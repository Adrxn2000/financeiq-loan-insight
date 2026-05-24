import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { AnalysedApplicant, AnalysisResult, PortfolioStats } from "@/lib/financeiq.types";
import { FEATURE_IMPORTANCE } from "@/lib/financeiq.model";
import { analyseApplicantFn } from "@/lib/financeiq.functions";
import { decisionBg, formatR, formatRFull, riskBg } from "@/lib/financeiq.format";

type Filter = "All" | "Approve" | "Decline" | "Conditional Approval" | "High" | "Low";
type SortKey = "id" | "credit_score" | "income" | "loan_amount" | "probability";

interface Props {
  applicants: AnalysedApplicant[];
  stats: PortfolioStats;
  onClose: () => void;
}

export function DashboardModal({ applicants, stats, onClose }: Props) {
  const [filter, setFilter] = useState<Filter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("probability");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<AnalysedApplicant | null>(null);
  const [detail, setDetail] = useState<AnalysisResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const analyse = useServerFn(analyseApplicantFn);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (selected ? setSelected(null) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, selected]);

  const filtered = useMemo(() => {
    const arr = applicants.filter((a) => {
      if (filter === "All") return true;
      if (filter === "High" || filter === "Low") return a.analysis.risk_level === filter;
      return a.analysis.recommendation === filter;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const av =
        sortKey === "id" ? a.id :
        sortKey === "probability" ? a.analysis.default_probability :
        (a as any)[sortKey];
      const bv =
        sortKey === "id" ? b.id :
        sortKey === "probability" ? b.analysis.default_probability :
        (b as any)[sortKey];
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [applicants, filter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const selectRow = async (a: AnalysedApplicant) => {
    setSelected(a);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await analyse({ data: applicantToInput(a) });
      setDetail(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load applicant analysis.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/85 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-2xl max-w-7xl mx-auto my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10 rounded-t-2xl">
          <div>
            <h2 className="font-display font-bold text-xl">Portfolio Dashboard</h2>
            <p className="text-xs text-muted-foreground">FinanceIQ · 100 synthetic SA retail-loan applicants</p>
          </div>
          <button onClick={onClose} className="size-9 rounded-lg hover:bg-surface2 grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3 p-6">
          <Metric label="Total" value={stats.total} />
          <Metric label="Approved" value={stats.approved} tone="green" />
          <Metric label="Declined" value={stats.declined} tone="red" />
          <Metric label="Conditional" value={stats.conditional} tone="amber" />
          <Metric label="Model Accuracy" value={`${Math.round(stats.accuracy * 100)}%`} tone="green" />
        </div>

        <div className="px-6 grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {(["All", "Approve", "Decline", "Conditional Approval", "High", "Low"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
                    filter === f
                      ? "bg-green/15 border-green/40 text-green"
                      : "bg-surface2 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "High" || f === "Low" ? `${f} Risk` : f}
                </button>
              ))}
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface2 sticky top-0">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <Th label="ID" k="id" {...{ sortKey, sortDir, toggleSort }} />
                      <Th label="Credit" k="credit_score" {...{ sortKey, sortDir, toggleSort }} />
                      <Th label="Income" k="income" {...{ sortKey, sortDir, toggleSort }} />
                      <Th label="Loan" k="loan_amount" {...{ sortKey, sortDir, toggleSort }} />
                      <th className="px-3 py-2">Risk</th>
                      <Th label="Probability" k="probability" {...{ sortKey, sortDir, toggleSort }} />
                      <th className="px-3 py-2">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {filtered.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => selectRow(a)}
                        className={`border-t border-border hover:bg-surface2/60 cursor-pointer ${
                          selected?.id === a.id ? "bg-surface2/80" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-foreground/90">{a.id}</td>
                        <td className="px-3 py-2">{a.credit_score}</td>
                        <td className="px-3 py-2">{formatR(a.income)}</td>
                        <td className="px-3 py-2">{formatR(a.loan_amount)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${riskBg(a.analysis.risk_level)}`}>
                            {a.analysis.risk_level}
                          </span>
                        </td>
                        <td className="px-3 py-2 w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-surface2 overflow-hidden">
                              <div
                                className={`h-full ${
                                  a.analysis.risk_level === "Low"
                                    ? "bg-green"
                                    : a.analysis.risk_level === "High"
                                      ? "bg-red"
                                      : "bg-amber"
                                }`}
                                style={{ width: `${a.analysis.default_probability * 100}%` }}
                              />
                            </div>
                            <span className="text-[11px] tabular-nums w-10 text-right">
                              {Math.round(a.analysis.default_probability * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${decisionBg(a.analysis.recommendation)}`}>
                            {a.analysis.recommendation === "Conditional Approval" ? "Conditional" : a.analysis.recommendation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-surface2/60 border border-border rounded-xl p-4">
              <h3 className="font-display font-semibold text-sm mb-3">Portfolio breakdown</h3>
              <Donut approved={stats.approved} declined={stats.declined} conditional={stats.conditional} />
            </div>

            <div className="bg-surface2/60 border border-border rounded-xl p-4">
              <h3 className="font-display font-semibold text-sm mb-3">Feature importance</h3>
              <div className="space-y-2">
                {FEATURE_IMPORTANCE.map((f) => (
                  <div key={f.feature}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">{f.feature}</span>
                      <span className="font-mono">{(f.weight * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                      <div className="h-full bg-green" style={{ width: `${(f.weight / 0.35) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-6">
          <Insight title="Credit score drives 35%" body={`Avg credit score across the portfolio is ${stats.avg_credit_score}.`} />
          <Insight title="Average loan size" body={`${formatRFull(stats.avg_loan_amount)} over typically 36 months.`} />
          <Insight title="Risk discipline" body={`${stats.declined + stats.conditional} of ${stats.total} applicants fall above the auto-approve threshold.`} />
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm grid place-items-center p-4" onClick={() => setSelected(null)}>
          <div
            className="bg-surface border border-border rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="font-display font-bold text-lg">{selected.id}</h3>
                <p className="text-xs text-muted-foreground">{selected.education} · {selected.employment_type} · {selected.age}y</p>
              </div>
              <button onClick={() => setSelected(null)} className="size-9 rounded-lg hover:bg-surface2 grid place-items-center">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 font-mono">
                <Kv k="Credit Score" v={String(selected.credit_score)} />
                <Kv k="Income" v={formatRFull(selected.income)} />
                <Kv k="Loan Amount" v={formatRFull(selected.loan_amount)} />
                <Kv k="Term" v={`${selected.loan_term_months} mo`} />
                <Kv k="Existing Debt" v={formatRFull(selected.existing_debt)} />
                <Kv k="Dependents" v={String(selected.num_dependents)} />
                <Kv k="Debt/Income" v={`${(selected.debt_to_income * 100).toFixed(0)}%`} />
                <Kv k="Loan/Income" v={`${(selected.loan_to_income * 100).toFixed(0)}%`} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${riskBg(selected.analysis.risk_level)}`}>
                  {selected.analysis.risk_level} Risk
                </span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${decisionBg(selected.analysis.recommendation)}`}>
                  {selected.analysis.recommendation}
                </span>
                <span className="font-mono text-xs ml-auto">
                  {(selected.analysis.default_probability * 100).toFixed(1)}% default probability
                </span>
              </div>
              {detailLoading && <p className="text-xs text-muted-foreground">Loading AI analysis…</p>}
              {detail && (
                <>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Key risk factors</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {detail.key_risk_factors.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Explanation</h4>
                    <p className="leading-relaxed">{detail.explanation}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Conditions</h4>
                    <p className="leading-relaxed text-foreground/80">{detail.conditions}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function applicantToInput(a: AnalysedApplicant) {
  const { id, debt_to_income, loan_to_income, default_label, analysis, ...rest } = a;
  return rest;
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: "green" | "red" | "amber" }) {
  const color = tone === "green" ? "text-green" : tone === "red" ? "text-red" : tone === "amber" ? "text-amber" : "text-foreground";
  return (
    <div className="bg-surface2 border border-border rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display font-bold text-2xl ${color}`}>{value}</div>
    </div>
  );
}

function Th({
  label, k, sortKey, sortDir, toggleSort,
}: { label: string; k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc"; toggleSort: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <th className="px-3 py-2 cursor-pointer select-none" onClick={() => toggleSort(k)}>
      <span className={active ? "text-green" : ""}>
        {label}{active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </span>
    </th>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-surface2/60 border border-border rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="text-sm text-foreground">{v}</div>
    </div>
  );
}

function Insight({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-surface2/60 border border-border rounded-xl p-4">
      <h4 className="font-display font-semibold text-sm text-green">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

function Donut({ approved, declined, conditional }: { approved: number; declined: number; conditional: number }) {
  const total = Math.max(1, approved + declined + conditional);
  const segs = [
    { label: "Approved", value: approved, color: "var(--green)" },
    { label: "Conditional", value: conditional, color: "var(--amber)" },
    { label: "Declined", value: declined, color: "var(--red)" },
  ];
  const C = 2 * Math.PI * 40;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="size-32 -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--surface)" strokeWidth="14" />
        {segs.map((s, i) => {
          const len = (s.value / total) * C;
          const el = (
            <circle
              key={i}
              cx="50" cy="50" r="40" fill="none"
              stroke={s.color} strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="space-y-1.5 text-xs flex-1">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground flex-1">{s.label}</span>
            <span className="font-mono">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
