import { useEffect, useRef } from "react";

/** Lightweight markdown: **bold**, `inline code`, and `- ` bullet lists. */
function renderInline(text: string): React.ReactNode {
  // Split on `code` and **bold** while preserving them.
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={key++}
          className="font-mono text-[0.85em] bg-surface2 text-green px-1.5 py-0.5 rounded"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let bulletBuf: string[] = [];
  const flushBullets = () => {
    if (bulletBuf.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 my-2">
          {bulletBuf.map((b, i) => (
            <li key={i}>{renderInline(b)}</li>
          ))}
        </ul>,
      );
      bulletBuf = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      bulletBuf.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushBullets();
      blocks.push(<div key={`sp-${blocks.length}`} className="h-2" />);
    } else {
      flushBullets();
      blocks.push(
        <p key={`p-${blocks.length}`} className="leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushBullets();
  return blocks;
}

interface Props {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [content]);

  const isUser = role === "user";
  return (
    <div
      ref={ref}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`shrink-0 size-9 rounded-full grid place-items-center text-xs font-bold ${
          isUser
            ? "bg-blue/20 text-blue border border-blue/30"
            : "bg-green/20 text-green border border-green/30"
        }`}
      >
        {isUser ? "AM" : "FQ"}
      </div>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-blue/10 border border-blue/20 text-foreground rounded-tr-sm"
            : "bg-surface border border-border text-foreground rounded-tl-sm"
        }`}
      >
        {renderMarkdown(content)}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 size-9 rounded-full grid place-items-center text-xs font-bold bg-green/20 text-green border border-green/30">
        FQ
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-surface border border-border px-4 py-3 flex items-center gap-1.5">
        <span className="fiq-dot inline-block size-2 rounded-full bg-green" />
        <span className="fiq-dot inline-block size-2 rounded-full bg-green" />
        <span className="fiq-dot inline-block size-2 rounded-full bg-green" />
      </div>
    </div>
  );
}
