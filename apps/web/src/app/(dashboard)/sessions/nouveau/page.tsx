"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSessionAction } from "./actions";

type Client = { id: string; name: string };
type Site = { id: string; label: string; city: string; clientId: string };
type Theme = { id: string; code: string; label: string; durationDays: number };
type Trainer = { id: string; fullName: string; phone: string; type: string };

export default function NouvelleSessionPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    fetch("/api/sessions/form-data")
      .then((r) => {
        if (!r.ok) return r.text().then((t) => { throw new Error(`${r.status}: ${t}`); });
        return r.json();
      })
      .then((d) => {
        setClients(d.clients ?? []);
        setSites(d.sites ?? []);
        setThemes(d.themes ?? []);
        setTrainers(d.trainers ?? []);
      })
      .catch((err) => console.error("[sessions/nouveau] form-data fetch failed:", err));
  }, []);

  const filteredSites = sites.filter((s) => !selectedClientId || s.clientId === selectedClientId);

  const selectedTheme = themes.find((t) => t.id === selectedThemeId);

  function handleStartDate(val: string) {
    setStartDate(val);
  }

  function computedEndDate(): string {
    if (!startDate || !selectedTheme) return "";
    const d = new Date(startDate);
    d.setDate(d.getDate() + (selectedTheme.durationDays - 1));
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux sessions
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nouvelle session</h1>
        <p className="text-sm text-muted-foreground mt-1">Planifier une session de formation</p>
      </div>

      <form action={createSessionAction} className="space-y-6">
        {/* Client & Site */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Client & Site</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label required>Client</Label>
              <select
                name="clientId"
                required
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={selectCls}
              >
                <option value="">— Choisir un client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label required>Site</Label>
              <select name="siteId" required className={selectCls} disabled={!selectedClientId}>
                <option value="">— Choisir un site —</option>
                {filteredSites.map((s) => (
                  <option key={s.id} value={s.id}>{s.label} ({s.city})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Thème & Formateur */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Thème & Formateur</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label required>Thème de formation</Label>
              <select
                name="themeId"
                required
                value={selectedThemeId}
                onChange={(e) => setSelectedThemeId(e.target.value)}
                className={selectCls}
              >
                <option value="">— Choisir un thème —</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>{t.code} — {t.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label required>Formateur</Label>
              <select name="trainerId" required className={selectCls}>
                <option value="">— Choisir un formateur —</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.type === "INTERNE" ? "Interne" : "Externe"}) — {t.phone}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dates & Lieu */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Dates & Lieu</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Date de début</Label>
              <input
                name="startDate"
                type="date"
                required
                value={startDate}
                onChange={(e) => handleStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <Label required>Date de fin</Label>
              <input
                name="endDate"
                type="date"
                required
                defaultValue={computedEndDate()}
                key={computedEndDate()}
                className={inputCls}
              />
              {selectedTheme && (
                <p className="text-xs text-muted-foreground mt-1">
                  Durée standard : {selectedTheme.durationDays} jour(s)
                </p>
              )}
            </div>
            <div>
              <Label required>Nombre de participants</Label>
              <input name="participants" type="number" min="1" defaultValue="1" required className={inputCls} />
            </div>
            <div>
              <Label>Lieu (salle / adresse)</Label>
              <input name="location" type="text" placeholder="Salle de formation, bâtiment A..." className={inputCls} />
            </div>
            <div className="col-span-2">
              <Label>Notes internes</Label>
              <textarea name="notes" rows={3} className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/sessions" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Annuler
          </Link>
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Créer la session
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";
const selectCls = "w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

function Label({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs text-muted-foreground block mb-1">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}
