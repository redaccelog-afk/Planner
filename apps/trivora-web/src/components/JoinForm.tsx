"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = pin.trim();
    if (!/^\d{6}$/.test(trimmed)) return;
    router.push(`/play?pin=${trimmed}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card flex w-full max-w-sm flex-col gap-3 p-6">
      <label htmlFor="pin" className="text-sm font-medium text-white/70">
        Code de la partie
      </label>
      <input
        id="pin"
        className="input text-center text-2xl tracking-widest"
        inputMode="numeric"
        maxLength={6}
        placeholder="123456"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
      />
      <button type="submit" className="btn-primary" disabled={pin.length !== 6}>
        Rejoindre
      </button>
    </form>
  );
}
