/** Caminho base do sistema (ex.: "/sistema"), sem barra no final. */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

/** URL absoluta do sistema (origem + /sistema), para links enviados a clientes e retornos de pagamento. */
export const appUrl = () => `${window.location.origin}${BASE_PATH}`;
