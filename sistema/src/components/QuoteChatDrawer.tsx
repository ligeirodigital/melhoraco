import { functionUrl } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { reportError } from "@/lib/reportError";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  quoteId: string;
  token: string;
  clientName?: string;
};

const CHAT_URL = functionUrl("public-quote-chat");

export function QuoteChatDrawer({ quoteId, token, clientName }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: `Olá${clientName ? `, ${clientName.split(" ")[0]}` : ""}! Posso te ajudar com dúvidas sobre este orçamento — prazo, garantia, formas de pagamento, entrega. Manda a sua pergunta.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ quote_id: quoteId, token, messages: next }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro no chat" }));
        reportError(new Error(err.error || `HTTP ${res.status}`), { scope: "public-quote-chat" });
        setMessages([...next, { role: "assistant", content: "Não consegui responder agora. Tenta de novo em alguns segundos ou fala com a gente pelo WhatsApp." }]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Sem stream");
      const decoder = new TextDecoder();
      let assistantText = "";
      let assistantIndex = -1;

      setMessages((prev) => {
        assistantIndex = prev.length;
        return [...prev, { role: "assistant", content: "" }];
      });

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              assistantText += delta;
              setMessages((prev) => {
                const copy = [...prev];
                if (assistantIndex >= 0 && copy[assistantIndex]) {
                  copy[assistantIndex] = { role: "assistant", content: assistantText };
                }
                return copy;
              });
            }
          } catch {
            // ignore heartbeat / non-json
          }
        }
      }
    } catch (e) {
      reportError(e, { scope: "public-quote-chat/stream" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full h-14 pl-5 pr-6 gap-2 shadow-2xl bg-slate-900 hover:bg-slate-800 text-white"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-black text-sm">Tire dúvidas</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 bg-white">
          <SheetHeader className="p-6 border-b bg-slate-900 text-white">
            <SheetTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Assistente Melhoraço
            </SheetTitle>
            <p className="text-xs text-white/60 font-bold uppercase tracking-widest">Respostas em segundos</p>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-primary text-white rounded-br-sm"
                    : "bg-white border border-slate-200 text-slate-900 rounded-bl-sm shadow-sm",
                )}
              >
                {m.content || (loading && i === messages.length - 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : "")}
              </div>
            ))}
          </div>

          <div className="p-3 border-t bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Sua pergunta..."
              disabled={loading}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="rounded-xl h-10 w-10 shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
