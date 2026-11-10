import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { registerConfirmHandler, type ConfirmOptions } from "@/lib/confirmAction";

/** Modal de confirmação único do sistema. Montado uma vez, usado por confirmAction(). */
export function ConfirmHost() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    registerConfirmHandler((next) => new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpts(next);
    }));
    return () => registerConfirmHandler(null);
  }, []);

  const answer = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <Dialog open={!!opts} onOpenChange={(open) => { if (!open) answer(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{opts?.title}</DialogTitle>
          {opts?.description && <DialogDescription>{opts.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => answer(false)}>{opts?.cancelLabel ?? "Cancelar"}</Button>
          <Button
            variant={opts?.destructive ? "destructive" : "default"}
            onClick={() => answer(true)}
          >
            {opts?.confirmLabel ?? "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
