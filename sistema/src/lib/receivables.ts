import { addDays } from "date-fns";
import { parsePaymentMethod } from "@/lib/formatQuote";
import { roundMoney } from "@/lib/quoteCalculations";

export type BoletoPlan = {
  installments: number;
  intervalDays: number;
};

export function getBoletoPlan(paymentMethod?: string | null): BoletoPlan | null {
  const parsed = parsePaymentMethod(paymentMethod);
  if (parsed.base !== "boleto" || !parsed.installments || !parsed.dueDays) return null;
  return { installments: parsed.installments, intervalDays: parsed.dueDays };
}

/** Divide em centavos para que a soma das parcelas seja sempre igual ao total. */
export function splitInstallmentAmounts(total: number, installments: number): number[] {
  if (!Number.isInteger(installments) || installments < 1) return [];
  const totalCents = Math.max(0, Math.round(roundMoney(total) * 100));
  const regularCents = Math.floor(totalCents / installments);
  return Array.from({ length: installments }, (_, index) =>
    (index === installments - 1
      ? totalCents - regularCents * (installments - 1)
      : regularCents) / 100,
  );
}

export function installmentDueDates(baseDate: Date, installments: number, intervalDays: number): Date[] {
  if (!Number.isInteger(installments) || installments < 1 || intervalDays < 1) return [];
  return Array.from({ length: installments }, (_, index) => addDays(baseDate, intervalDays * (index + 1)));
}
