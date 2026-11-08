/**
 * Fonte única de verdade operacional do agendamento de instalação.
 *
 * Regra: `installation_schedule` é o ÚNICO registro mutável de data/hora/endereço/
 * instalador/telefone/status. `contracts.service_order_data` passa a ser apenas um
 * SNAPSHOT DOCUMENTAL, gravado no momento em que o PDF é emitido — nunca reescrito
 * depois (contrato assinado não muda por reagendamento).
 */

export type InstallationStatus =
  | "agendado"
  | "confirmado"
  | "em_andamento"
  | "concluido"
  | "cancelado";

/** Status realmente suportados hoje pelo domínio (não inventar novos). */
export const INSTALLATION_STATUSES: InstallationStatus[] = [
  "agendado",
  "confirmado",
  "em_andamento",
  "concluido",
  "cancelado",
];

export const INSTALLATION_STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const INSTALLATION_STATUS_STYLES: Record<string, string> = {
  agendado: "bg-blue-50 text-blue-700 border-blue-200",
  confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  em_andamento: "bg-amber-50 text-amber-700 border-amber-200",
  concluido: "bg-slate-100 text-slate-600 border-slate-200",
  cancelado: "bg-rose-50 text-rose-600 border-rose-200",
};

/** Query keys centralizadas — venda e /agenda leem o mesmo dataset. */
export const installationKeys = {
  all: ["installations-all"] as const,
  byQuote: (quoteId: string) => ["installations", quoteId] as const,
  week: (userId: string | undefined, weekStartIso: string) =>
    ["installations-all", userId, weekStartIso] as const,
};

export type ScheduleRow = {
  id?: string;
  quote_id?: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  duration_hours?: number | string | null;
  installer_name?: string | null;
  installer_phone?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: string | null;
};

export type ScheduleFormValues = {
  scheduled_date: string;
  scheduled_time: string;
  duration_hours: string;
  installer_name: string;
  installer_phone: string;
  address: string;
  notes: string;
  status: InstallationStatus;
};

/**
 * Endereço sugerido: endereço de entrega da venda > endereço do cadastro do cliente.
 * O endereço do agendamento é independente e NÃO atualiza o cadastro mestre do cliente.
 */
export function suggestedAddress(quote: any): string {
  const delivery = (quote?.delivery_address || "").trim();
  if (delivery) return delivery;
  const c = quote?.clients || quote?.client;
  return [c?.address, c?.address_number, c?.address_complement].filter(Boolean).join(", ");
}

/** Telefone operacional padrão = telefone do cliente (pode ser sobrescrito no agendamento). */
export function suggestedPhone(quote: any): string {
  const c = quote?.clients || quote?.client;
  return c?.phone || "";
}

/** Pré-preenche o formulário com dados confiáveis já existentes. */
export function buildScheduleDefaults(quote: any, existing?: ScheduleRow | null): ScheduleFormValues {
  return {
    scheduled_date: existing?.scheduled_date ?? "",
    scheduled_time: (existing?.scheduled_time ?? "").slice(0, 5),
    duration_hours: existing?.duration_hours != null ? String(existing.duration_hours) : "2",
    installer_name: existing?.installer_name ?? "",
    installer_phone: existing?.installer_phone ?? suggestedPhone(quote),
    address: existing?.address ?? suggestedAddress(quote),
    notes: existing?.notes ?? "",
    status: ((existing?.status as InstallationStatus) ?? "agendado"),
  };
}

/** Agendamento principal = o mais recente ainda não cancelado; histórico é preservado. */
export function pickPrimarySchedule<T extends ScheduleRow>(rows: T[] | undefined | null): T | null {
  if (!rows || rows.length === 0) return null;
  const active = rows.filter((r) => r.status !== "cancelado");
  const pool = active.length > 0 ? active : rows;
  return [...pool].sort((a, b) =>
    String(b.scheduled_date ?? "").localeCompare(String(a.scheduled_date ?? "")),
  )[0];
}

/** Snapshot documental derivado do agendamento vigente (usado só na emissão do PDF). */
export function scheduleToServiceOrderData(schedule: ScheduleRow | null | undefined, quote: any) {
  return {
    scheduled_date: schedule?.scheduled_date ?? "",
    scheduled_time: (schedule?.scheduled_time ?? "").slice(0, 5),
    installer_name: schedule?.installer_name ?? "",
    address: schedule?.address ?? suggestedAddress(quote),
    technical_notes: schedule?.notes ?? "",
  };
}

export function toDbPayload(values: ScheduleFormValues) {
  return {
    scheduled_date: values.scheduled_date,
    scheduled_time: values.scheduled_time || null,
    duration_hours: Number(values.duration_hours) || 2,
    installer_name: values.installer_name || null,
    installer_phone: values.installer_phone || null,
    address: values.address || null,
    notes: values.notes || null,
    status: values.status || "agendado",
  };
}
