"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

const PROFILES = [
  {
    role: "ADMIN",
    label: "Administrateur",
    email: "admin@ccelog.demo",
    color: "bg-red-600 hover:bg-red-700",
    icon: "⚙️",
  },
  {
    role: "PLANIFICATEUR",
    label: "Planificateur",
    email: "planificateur@ccelog.demo",
    color: "bg-blue-600 hover:bg-blue-700",
    icon: "📅",
  },
  {
    role: "FORMATEUR",
    label: "Formateur",
    email: "formateur@ccelog.demo",
    color: "bg-green-600 hover:bg-green-700",
    icon: "🎓",
  },
  {
    role: "COMPTABILITE",
    label: "Comptabilité",
    email: "comptabilite@ccelog.demo",
    color: "bg-purple-600 hover:bg-purple-700",
    icon: "💼",
  },
  {
    role: "CLIENT",
    label: "Client",
    email: "client@ccelog.demo",
    color: "bg-orange-600 hover:bg-orange-700",
    icon: "🏢",
  },
] as const;

export function DemoLoginButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loginAs(email: string, role: string) {
    setLoading(role);
    setError("");
    const result = await signIn("credentials", {
      email,
      password: "demo2024",
      redirect: false,
    });
    if (result?.error) {
      setError("Erreur de connexion. Vérifiez que la base de données est initialisée.");
      setLoading(null);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center">
        Choisissez un profil pour accéder à la plateforme
      </p>
      <div className="grid grid-cols-1 gap-2">
        {PROFILES.map((p) => (
          <button
            key={p.role}
            onClick={() => loginAs(p.email, p.role)}
            disabled={loading !== null}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60 ${p.color}`}
          >
            <span className="text-base">{p.icon}</span>
            <span className="flex-1 text-left">{p.label}</span>
            {loading === p.role && (
              <span className="text-xs opacity-75">Connexion…</span>
            )}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
