"use client";

import { useState, useTransition } from "react";
import { Plus, Download, Loader2 } from "lucide-react";
import { addParticipantAction, togglePresenceAction } from "./actions";

type Participant = {
  id: string;
  nom: string;
  prenom: string;
  cin: string | null;
  dateNaissance: Date | null;
  fonction: string | null;
  present: boolean;
};

function PresenceToggle({
  participant,
  sessionId,
}: {
  participant: Participant;
  sessionId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(participant.present);

  function handleToggle() {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      await togglePresenceAction(participant.id, next, sessionId);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        optimistic ? "bg-green-500" : "bg-secondary"
      } disabled:opacity-50`}
      aria-label={optimistic ? "Présent" : "Absent"}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          optimistic ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function AddParticipantForm({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    cin: "",
    dateNaissance: "",
    fonction: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim()) return;
    startTransition(async () => {
      await addParticipantAction(sessionId, form);
      setForm({ nom: "", prenom: "", cin: "", dateNaissance: "", fonction: "" });
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter participant
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-secondary/40 border border-border rounded-xl p-4 space-y-3"
    >
      <p className="text-sm font-medium text-foreground">Nouveau participant</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Nom *</label>
          <input
            name="nom"
            value={form.nom}
            onChange={handleChange}
            required
            className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="BENALI"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Prénom *</label>
          <input
            name="prenom"
            value={form.prenom}
            onChange={handleChange}
            required
            className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Youssef"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">CIN</label>
          <input
            name="cin"
            value={form.cin}
            onChange={handleChange}
            className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="AB123456"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Date de naissance</label>
          <input
            name="dateNaissance"
            type="date"
            value={form.dateNaissance}
            onChange={handleChange}
            className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">Fonction</label>
          <input
            name="fonction"
            value={form.fonction}
            onChange={handleChange}
            className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Opérateur cariste"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

export function PresenceClient({
  sessionId,
  participants,
}: {
  sessionId: string;
  participants: Participant[];
}) {
  const presents = participants.filter((p) => p.present).length;

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {presents} / {participants.length} présent(s)
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
            title="Export en cours de développement"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter feuille de présence
          </button>
        </div>
      </div>

      {/* Table */}
      {participants.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Prénom</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">CIN</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date naissance</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Fonction</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Présent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{p.nom}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{p.prenom}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.cin ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {p.dateNaissance
                      ? new Date(p.dateNaissance).toLocaleDateString("fr-MA")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.fonction ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <PresenceToggle participant={p} sessionId={sessionId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form */}
      <AddParticipantForm sessionId={sessionId} />
    </div>
  );
}
