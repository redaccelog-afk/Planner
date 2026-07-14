"use client";

import { useState } from "react";
import { musicPlayer } from "@/lib/musicPlayer";

export default function MusicToggle() {
  const [muted, setMuted] = useState(false);

  function toggle() {
    const next = !muted;
    musicPlayer.setMuted(next);
    setMuted(next);
  }

  return (
    <button
      onClick={toggle}
      className="fixed right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-lg backdrop-blur hover:bg-white/20"
      title={muted ? "Réactiver la musique" : "Couper la musique"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
