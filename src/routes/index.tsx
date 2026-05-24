import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send } from "lucide-react";
import { Toaster, toast } from "sonner";

import { Sidebar } from "@/components/financeiq/Sidebar";
import { MessageBubble, TypingIndicator } from "@/components/financeiq/MessageBubble";
import { DashboardModal } from "@/components/financeiq/DashboardModal";
import { NewApplicantForm } from "@/components/financeiq/NewApplicantForm";
import { chatFn, getPortfolioFn, getPortfolioStatsFn } from "@/lib/financeiq.functions";
import type { ChatMessage } from "@/lib/financeiq.types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinanceIQ — AI Loan Risk Assistant" },
      { name: "description", content: "AI-powered loan risk assessment chatbot and portfolio dashboard for South African retail banking." },
      { property: "og:title", content: "FinanceIQ — AI Loan Risk Assistant" },
      { property: "og:description", content: "AI-powered loan risk assessment for South African retail banking." },
    ],
  }),
  component: FinanceIQ,
});

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Hi, I'm **FinanceIQ** — your AI loan-risk assistant. I've pre-analysed a portfolio of `100` South African applicants. Ask me about portfolio risk, individual applicants, or click **Assess New Applicant** to score a new application.",
};

function FinanceIQ() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const portfolioQ = useQuery({ queryKey: ["portfolio"], queryFn: () => getPortfolioFn() });
  const statsQ = useQuery({ queryKey: ["portfolio-stats"], queryFn: () => getPortfolioStatsFn() });
  const chat = useServerFn(chatFn);

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const history = messages.slice(-8);
      return chat({ data: { message, history } });
    },
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    },
    onError: (err: Error) => {
      toast.error(err.message || "AI request failed.");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `_Sorry, I couldn't complete that request: ${err.message}_` },
      ]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    mutation.mutate(trimmed);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Toaster theme="dark" position="top-right" />
      <Sidebar
        stats={statsQ.data ?? null}
        busy={mutation.isPending}
        onOpenDashboard={() => setShowDashboard(true)}
        onOpenNewApplicant={() => setShowNew(true)}
        onQuickQuestion={(q) => send(q)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-6 border-b border-border flex items-center gap-3 bg-surface/60 backdrop-blur">
          <div className="size-2.5 rounded-full bg-green fiq-pulse" />
          <h2 className="font-display font-semibold text-base">AI Loan Risk Assistant</h2>
          <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">· powered by Gemini via Lovable AI</span>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}
            {mutation.isPending && <TypingIndicator />}
          </div>
        </div>

        <div className="border-t border-border bg-surface/60 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-end gap-2 bg-surface2 rounded-2xl border border-border focus-within:border-green/40 transition px-3 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Ask about applicants, portfolio risk, or model decisions…"
              className="flex-1 resize-none bg-transparent outline-none text-sm py-2 max-h-32 placeholder:text-muted-foreground"
            />
            <button
              onClick={() => send(input)}
              disabled={mutation.isPending || !input.trim()}
              className="size-10 rounded-xl bg-green text-primary-foreground grid place-items-center hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Enter to send · Shift+Enter for newline · All amounts in South African Rand (R)
          </p>
        </div>
      </main>

      {showDashboard && portfolioQ.data && statsQ.data && (
        <DashboardModal
          applicants={portfolioQ.data}
          stats={statsQ.data}
          onClose={() => setShowDashboard(false)}
        />
      )}
      {showNew && <NewApplicantForm onClose={() => setShowNew(false)} />}
    </div>
  );
}
