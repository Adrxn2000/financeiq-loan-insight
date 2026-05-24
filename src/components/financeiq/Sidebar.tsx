import { LayoutDashboard, PlusCircle, Sparkles } from "lucide-react";
import type { PortfolioStats } from "@/lib/financeiq.types";

const QUICK_QUESTIONS = [
  "Summarise the portfolio's overall risk",
  "Which 5 applicants are highest risk?",
  "What's the average credit score of approved loans?",
  "How many unemployed applicants did we decline?",
  "Explain the conditional approvals",
  "What does the feature importance tell us?",
  "What's the average loan amount?",
  "Suggest 3 policy changes to reduce defaults",
];

interface Props {
  stats: PortfolioStats | null;
  onOpenDashboard: () => void;
  onOpenNewApplicant: () => void;
  onQuickQuestion: (q: string) => void;
  busy: boolean;
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value} <span className="text-muted-foreground">· {pct}%</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Sidebar({ stats, onOpenDashboard, onOpenNewApplicant, onQuickQuestion, busy }: Props) {
  return (
    <aside className="w-[280px] shrink-0 h-screen flex flex-col bg-surface border-r border-border">
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-green/15 border border-green/30 grid place-items-center">
            <Sparkles className="size-4 text-green" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-none tracking-tight">FinanceIQ</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">AI Risk Assistant</p>
          </div>
        </div>
        <button
          onClick={onOpenDashboard}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-green text-primary-foreground font-semibold text-sm rounded-lg py-2.5 hover:brightness-110 transition"
        >
          <LayoutDashboard className="size-4" /> View Dashboard
        </button>
      </div>

      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Portfolio</h2>
        <div className="grid grid-cols-2 gap-2 mb-3 font-mono">
          <div className="bg-surface2 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground">TOTAL</div>
            <div className="text-lg font-semibold text-foreground">{stats?.total ?? "—"}</div>
          </div>
          <div className="bg-surface2 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground">ACCURACY</div>
            <div className="text-lg font-semibold text-green">{stats ? `${Math.round(stats.accuracy * 100)}%` : "—"}</div>
          </div>
        </div>
        {stats && (
          <div className="space-y-2.5">
            <Bar label="Approved" value={stats.approved} total={stats.total} color="bg-green" />
            <Bar label="Declined" value={stats.declined} total={stats.total} color="bg-red" />
            <Bar label="Conditional" value={stats.conditional} total={stats.total} color="bg-amber" />
          </div>
        )}
      </div>

      <div className="px-5 py-4 flex-1 overflow-y-auto">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Quick questions</h2>
        <div className="space-y-1.5">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              disabled={busy}
              onClick={() => onQuickQuestion(q)}
              className="w-full text-left text-xs text-foreground/80 hover:text-foreground bg-surface2/60 hover:bg-surface2 border border-border/60 hover:border-green/40 rounded-lg px-3 py-2 transition disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border">
        <button
          onClick={onOpenNewApplicant}
          className="w-full flex items-center justify-center gap-2 bg-surface2 hover:bg-surface2/70 border border-green/30 text-green text-sm font-semibold rounded-lg py-2.5 transition"
        >
          <PlusCircle className="size-4" /> Assess New Applicant
        </button>
      </div>
    </aside>
  );
}
