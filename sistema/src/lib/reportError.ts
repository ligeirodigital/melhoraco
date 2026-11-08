import { toast } from "sonner";

type ErrorContext = {
  scope?: string;
  silent?: boolean;
  fallbackMessage?: string;
  extra?: Record<string, unknown>;
};

/**
 * Normalize any thrown value into a readable message.
 */
export function toErrorMessage(err: unknown, fallback = "Erro inesperado"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  const anyErr = err as { message?: string; error_description?: string; msg?: string };
  return anyErr.message || anyErr.error_description || anyErr.msg || fallback;
}

/**
 * Centralized error reporter.
 * - Logs with structured scope for future telemetry hook (Sentry/Logflare).
 * - Shows a toast unless `silent` is true.
 * - Returns the normalized message for further use.
 */
export function reportError(err: unknown, ctx: ErrorContext = {}): string {
  const message = toErrorMessage(err, ctx.fallbackMessage);
  const scope = ctx.scope ?? "app";

  // Single funnel — swap this for Sentry.captureException later without touching callers.
  // eslint-disable-next-line no-console
  console.error(`[${scope}]`, err, ctx.extra ?? {});

  if (!ctx.silent) {
    toast.error(message);
  }
  return message;
}
