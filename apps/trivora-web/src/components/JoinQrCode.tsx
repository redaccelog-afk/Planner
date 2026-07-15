"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function JoinQrCode({ pin }: { pin: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // Prefer the configured network URL over window.location.origin: the host
    // may be viewing this on "localhost", which a phone can never reach.
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const joinUrl = `${base}/play?pin=${pin}`;
    QRCode.toDataURL(joinUrl, { width: 180, margin: 1, color: { dark: "#0F2744", light: "#FFFFFF" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [pin]);

  if (!dataUrl) return null;

  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="QR code pour rejoindre la partie" width={140} height={140} />
      <span className="text-xs font-medium text-[#0F2744]">Scanne pour rejoindre</span>
    </div>
  );
}
