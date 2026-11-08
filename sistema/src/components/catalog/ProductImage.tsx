import { useState } from "react";
import { sizeLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ProductImage({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return src && src !== failedSource ? (
    <img src={src} alt={name} loading="lazy" className={cn("object-contain", className)} onError={() => setFailedSource(src)} />
  ) : (
    <div role="img" aria-label={name} className={cn("flex items-center justify-center bg-muted text-muted-foreground font-semibold", className)}>
      {sizeLabel(name)}
    </div>
  );
}
