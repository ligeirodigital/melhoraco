import { differenceInCalendarDays, format, parseISO } from "date-fns";

export interface FollowUpQuote {
  id: string;
  status: string;
  created_at: string;
  last_follow_up?: string | null;
  next_follow_up_at?: string | null;
}
export function contactDays(quote: Pick<FollowUpQuote, "created_at" | "last_follow_up">, now = new Date()) {
  const date = parseISO(quote.last_follow_up || quote.created_at);
  return Number.isNaN(date.getTime()) ? 0 : Math.max(0, differenceInCalendarDays(now, date));
}
export function contactUrgency(days: number) {
  return days <= 2 ? "success" : days <= 6 ? "warning" : "destructive";
}
export function isFutureReturn(quote: FollowUpQuote, now = new Date()) {
  return Boolean(quote.next_follow_up_at && quote.next_follow_up_at > format(now, "yyyy-MM-dd"));
}
export function followUpQueue<T extends FollowUpQuote>(quotes: T[], now = new Date()): T[] {
  return quotes.filter(q => q.status === "pendente").sort((a, b) => {
    const deferred = Number(isFutureReturn(a, now)) - Number(isFutureReturn(b, now));
    if (deferred) return deferred;
    if (isFutureReturn(a, now)) {
      const dates = (a.next_follow_up_at || "").localeCompare(b.next_follow_up_at || "");
      if (dates) return dates;
    }
    const age = Date.parse(a.last_follow_up || a.created_at) - Date.parse(b.last_follow_up || b.created_at);
    return (Number.isFinite(age) ? age : 0) || a.id.localeCompare(b.id);
  });
}
export const LOST_REASONS = ["preço", "prazo", "sem resposta", "comprou de outro", "outro"] as const;
