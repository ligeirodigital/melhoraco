export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Handler = (options: ConfirmOptions) => Promise<boolean>;
let handler: Handler | null = null;

/** Registrado pelo ConfirmHost, montado uma vez no app. */
export function registerConfirmHandler(next: Handler | null) {
  handler = next;
}

/**
 * Pede confirmação com o modal do sistema (no lugar de window.confirm).
 * Sem o host montado, cai no diálogo nativo para não bloquear a ação.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (handler) return handler(options);
  return Promise.resolve(window.confirm(options.description ? `${options.title}\n${options.description}` : options.title));
}
