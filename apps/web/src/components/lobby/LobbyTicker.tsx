import { useEffect } from "react";

export interface LobbyTickerMessage {
  id: string;
  text: string;
  tone?: "info" | "success" | "warning";
}

interface LobbyTickerProps {
  messages: LobbyTickerMessage[];
  onRemove: (id: string) => void;
}

function toneClass(tone: LobbyTickerMessage["tone"]): string {
  if (tone === "success") return "border-emerald-300/60 bg-emerald-900/35 text-emerald-100";
  if (tone === "warning") return "border-amber-300/70 bg-amber-900/35 text-amber-100";
  return "border-cyan-300/60 bg-cyan-900/25 text-cyan-100";
}

export function LobbyTicker({ messages, onRemove }: LobbyTickerProps) {
  useEffect(() => {
    if (messages.length === 0) return;
    const timers = messages.map((message) =>
      window.setTimeout(() => {
        onRemove(message.id);
      }, 3200)
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [messages, onRemove]);

  if (messages.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {messages.slice(0, 3).map((message) => (
        <div
          key={message.id}
          className={`lobby-ticker-item rounded-lg border px-3 py-2 text-sm font-medium shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${toneClass(message.tone)}`}
        >
          {message.text}
        </div>
      ))}
    </div>
  );
}
