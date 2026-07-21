import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

/**
 * Escaneia QR Codes usando a câmera do dispositivo.
 * Ao ler, chama onDetected(text) e fecha automaticamente.
 */
export function QRScannerDialog({
  open,
  onOpenChange,
  onDetected,
  title = "Escanear QR Code",
  description = "Aponte a câmera para o QR do cliente.",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDetected: (text: string) => void;
  title?: string;
  description?: string;
}) {
  const regionId = "qr-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    const start = async () => {
      try {
        // Aguarda o elemento existir no DOM
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const el = document.getElementById(regionId);
        if (!el || cancelled) return;

        const instance = new Html5Qrcode(regionId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            onDetected(decodedText);
            onOpenChange(false);
          },
          () => {
            /* ignore per-frame errors */
          },
        );
      } catch (e) {
        setError(
          (e as Error)?.message ??
            "Não foi possível acessar a câmera. Verifique as permissões do navegador.",
        );
      }
    };

    start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .catch(() => {})
          .finally(() => {
            try {
              s.clear();
            } catch {
              /* ignore */
            }
          });
      }
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div
          id={regionId}
          className="w-full aspect-square overflow-hidden rounded-xl bg-slate-900"
        />
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" /> Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}