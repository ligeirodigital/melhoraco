import { useState, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { renderPdfBlob, downloadBlob } from "@/lib/pdfLoader";

/**
 * Renders a button that loads @react-pdf/renderer (~1.46MB) and the requested
 * PDF component only when clicked, then triggers the download.
 *
 * Replaces <PDFDownloadLink> usages that previously pulled react-pdf into the
 * initial bundle of the route that mounted them.
 */
export interface LazyPdfButtonProps {
  fileName: string;
  className?: string;
  children: ReactNode;
  /**
   * Async factory returning the React element to render as a PDF document.
   * The factory itself MUST dynamic-import the PDF component so the chunk
   * stays out of the parent route bundle.
   */
  documentFactory: () => Promise<JSX.Element>;
  onError?: (e: unknown) => void;
}

export function LazyPdfButton({
  fileName,
  className,
  children,
  documentFactory,
  onError,
}: LazyPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const doc = await documentFactory();
      downloadBlob(await renderPdfBlob(doc), fileName);
    } catch (e) {
      console.error("LazyPdfButton:", e);
      onError?.(e);
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={loading}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Gerando…
        </span>
      ) : (
        children
      )}
    </button>
  );
}
