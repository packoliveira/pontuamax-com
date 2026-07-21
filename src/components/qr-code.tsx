import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renderiza um QR Code como <img> (data URL). Client-only. */
export function QRCodeImage({
  value,
  size = 220,
  className,
  alt = "QR Code",
}: {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc("");
      });
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!src) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, background: "#F1F5F9", borderRadius: 12 }}
        aria-label="Gerando QR Code"
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 12 }}
    />
  );
}