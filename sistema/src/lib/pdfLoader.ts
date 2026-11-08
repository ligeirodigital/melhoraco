/**
 * Ponto único de carregamento de `@react-pdf/renderer` (~1.46 MB).
 *
 * Nenhum módulo da aplicação deve importar `@react-pdf/renderer` estaticamente.
 * Todo caminho de geração/visualização de PDF passa por aqui, garantindo que a
 * biblioteca só entre na rede quando o usuário realmente inicia a geração.
 */

/** Renderiza um elemento de documento react-pdf em Blob, carregando a lib sob demanda. */
export async function renderPdfBlob(element: JSX.Element): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  return pdf(element).toBlob();
}

/** Dispara o download de um Blob já gerado. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Gera e baixa em um passo. */
export async function generateAndDownloadPdf(element: JSX.Element, fileName: string) {
  downloadBlob(await renderPdfBlob(element), fileName);
}
