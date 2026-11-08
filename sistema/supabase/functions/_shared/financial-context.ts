export type FinancialRow = {
  amount: number | string; type: string; status: string | null;
  due_date?: string | null; transaction_date: string;
  installment_number?: number | null; paid_at?: string | null;
};

const cents = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : 0;
};
const day = (date: string) => new Date(date).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/** Read-only analysis, not an alternative to the app's commercial calculations. */
export function summarizeFinancialRows(rows: FinancialRow[], now: Date) {
  const today = day(now.toISOString());
  let pending = 0, overdue = 0, received = 0, pendingCount = 0, overdueCount = 0;
  let unknownDates = 0, ignoredStatuses = 0, upcomingExpenses = 0;
  const windows = [0, 0, 0];
  const months: Record<string, number> = {};
  for (const row of rows) {
    const amount = cents(row.amount);
    const rawDate = row.due_date || row.transaction_date;
    const parsed = new Date(rawDate);
    const validDate = Number.isFinite(parsed.getTime());
    const dueDay = validDate ? day(rawDate) : "";
    const days = validDate ? Math.round((Date.parse(dueDay) - Date.parse(today)) / 86400000) : NaN;
    if (row.type === "expense" && row.status === "pendente" && days >= 0 && days <= 90) upcomingExpenses += amount;
    if (row.type !== "income" || !row.installment_number) continue;
    if (row.status === "pago") { received += amount; continue; }
    if (row.status !== "pendente") { ignoredStatuses++; continue; }
    pending += amount; pendingCount++;
    if (!validDate) { unknownDates++; continue; }
    if (days < 0) { overdue += amount; overdueCount++; }
    else if (days <= 90) windows[Math.min(2, Math.max(0, Math.ceil(days / 30) - 1))] += amount;
    const month = dueDay.slice(0, 7);
    months[month] = (months[month] || 0) + amount;
  }
  return {
    asOf: today, pending: pending / 100, overdue: overdue / 100, received: received / 100,
    pendingCount, overdueCount, unknownDates, ignoredStatuses,
    next30Days: windows[0] / 100, days31To60: windows[1] / 100, days61To90: windows[2] / 100,
    pendingExpensesNext90Days: upcomingExpenses / 100,
    monthlyPending: Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount: amount / 100 })),
  };
}
