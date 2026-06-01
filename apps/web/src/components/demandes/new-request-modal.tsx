"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { createRequestAction } from "@/app/(dashboard)/demandes/actions";

interface Theme {
  id: string;
  code: string;
  label: string;
  durationDays: number;
}

interface Site {
  id: string;
  label: string;
  city: string;
}

interface Client {
  id: string;
  name: string;
  sites: Site[];
}

interface NewRequestModalProps {
  clients: Client[];
  themes: Theme[];
}

export function NewRequestModal({ clients, themes }: NewRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedThemeCodes, setSelectedThemeCodes] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const toggleTheme = (code: string) => {
    setSelectedThemeCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    selectedThemeCodes.forEach((code) => formData.append("themeCodes", code));

    startTransition(async () => {
      try {
        await createRequestAction(formData);
        setOpen(false);
        setSelectedClientId("");
        setSelectedThemeCodes([]);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inattendue");
      }
    });
  };

  return (
    <>
      {/* Bouton déclencheur */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Nouvelle demande
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Nouvelle demande de formation</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulaire */}
            <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Client */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Client *</label>
                <div className="relative">
                  <select
                    name="clientId"
                    required
                    value={selectedClientId}
                    onChange={(e) => { setSelectedClientId(e.target.value); }}
                    className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground pr-8 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Sélectionner un client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Site */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Site *</label>
                <div className="relative">
                  <select
                    name="siteId"
                    required
                    disabled={!selectedClient}
                    className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground pr-8 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                  >
                    <option value="">
                      {selectedClient ? "Sélectionner un site…" : "Choisir d'abord un client"}
                    </option>
                    {selectedClient?.sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.label} — {s.city}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Thèmes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Thèmes *
                  {selectedThemeCodes.length > 0 && (
                    <span className="ml-1.5 text-xs text-primary font-normal">
                      ({selectedThemeCodes.length} sélectionné{selectedThemeCodes.length > 1 ? "s" : ""})
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-background border border-border rounded-lg min-h-[48px]">
                  {themes.map((t) => {
                    const selected = selectedThemeCodes.includes(t.code);
                    return (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => toggleTheme(t.code)}
                        title={t.label}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {t.code}
                      </button>
                    );
                  })}
                </div>
                {selectedThemeCodes.length === 0 && (
                  <p className="text-xs text-muted-foreground">Cliquez sur les codes pour sélectionner</p>
                )}
              </div>

              {/* Participants + Urgence */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Participants *</label>
                  <input
                    type="number"
                    name="participants"
                    required
                    min={1}
                    max={999}
                    placeholder="Ex : 12"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Urgence</label>
                  <div className="relative">
                    <select
                      name="urgency"
                      defaultValue="0"
                      className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground pr-8 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="0">Normal</option>
                      <option value="1">Assez urgent</option>
                      <option value="2">Urgent</option>
                      <option value="3">Très urgent</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Dates souhaitées */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Date de début</label>
                  <input
                    type="date"
                    name="desiredDateFrom"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Date de fin</label>
                  <input
                    type="date"
                    name="desiredDateTo"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Informations complémentaires, contraintes particulières…"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Erreur */}
              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending || selectedThemeCodes.length === 0}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Création…" : "Créer la demande"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
