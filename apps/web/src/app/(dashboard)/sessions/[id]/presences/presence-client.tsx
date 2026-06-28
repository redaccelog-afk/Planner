"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, Download, Loader2, Upload, Camera, X, CheckCircle2 } from "lucide-react";
import { addParticipantAction, togglePresenceAction, importParticipantsAction } from "./actions";
import type { ParticipantRow } from "./actions";

type Participant = {
  id: string;
  nom: string;
  prenom: string;
  cin: string | null;
  dateNaissance: Date | null;
  fonction: string | null;
  present: boolean;
  photoUrl?: string | null;
};

// ─── CSV parsing (client-side, no library) ────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): ParticipantRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines
    .map((line): ParticipantRow | null => {
      const cols = parseCsvLine(line);
      const nom = cols[0] ?? "";
      const prenom = cols[1] ?? "";
      if (!nom || !prenom) return null;

      const rawNote1 = cols[6] ?? "";
      const rawNote2 = cols[7] ?? "";

      return {
        nom: nom.toUpperCase(),
        prenom: prenom,
        dateNaissance: cols[2] || undefined,
        cin: cols[3] || undefined,
        cnss: cols[4] || undefined,
        matricule: cols[5] || undefined,
        noteTheorique: rawNote1 ? parseFloat(rawNote1.replace(",", ".")) : undefined,
        notePratique: rawNote2 ? parseFloat(rawNote2.replace(",", ".")) : undefined,
        appreciation: cols[8] || undefined,
        remarque: cols[9] || undefined,
      };
    })
    .filter((r): r is ParticipantRow => r !== null);
}

// ─── Photo upload button ───────────────────────────────────────────────────────

function PhotoUploadButton({ participantId }: { participantId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      await fetch(`/api/participants/${participantId}/photo`, {
        method: "POST",
        body: fd,
      });
      setDone(true);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Téléverser une photo"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Ajouter une photo"
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : done ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>
    </>
  );
}

// ─── CSV import panel ──────────────────────────────────────────────────────────

function CsvImportPanel({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError("Aucun participant valide trouvé. Vérifiez le format du fichier.");
        setRows([]);
      } else {
        setRows(parsed);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleConfirm() {
    startTransition(async () => {
      await importParticipantsAction(sessionId, rows);
      onClose();
    });
  }

  return (
    <div className="bg-secondary/30 border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Importer depuis un fichier CSV</p>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="text-xs text-muted-foreground bg-card border border-border rounded-md px-3 py-2 font-mono overflow-x-auto whitespace-nowrap">
        Nom,Prénom,Date de naissance,N° CINE,N° CNSS,Matricule,Note Théorique,Note Pratique,Appréciations,Remarque
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Sélectionner un fichier CSV"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Upload className="h-3.5 w-3.5" />
          Choisir un fichier CSV
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {rows.length} participant(s) détecté(s) — vérifiez avant de confirmer
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {(["Nom", "Prénom", "Date naiss.", "CIN", "CNSS", "Matricule", "Note th.", "Note pr.", "Appréciation", "Remarque"] as const).map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-secondary/20">
                    <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{r.nom}</td>
                    <td className="px-3 py-2 text-foreground whitespace-nowrap">{r.prenom}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.dateNaissance ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.cin ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.cnss ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.matricule ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums whitespace-nowrap">
                      {r.noteTheorique != null ? r.noteTheorique : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums whitespace-nowrap">
                      {r.notePratique != null ? r.notePratique : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[120px] truncate">
                      {r.appreciation ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[120px] truncate">
                      {r.remarque ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirmer l&apos;import ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setRows([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Presence toggle ───────────────────────────────────────────────────────────

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

// ─── Add participant form ──────────────────────────────────────────────────────

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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

// ─── Main export ───────────────────────────────────────────────────────────────

export function PresenceClient({
  sessionId,
  participants,
}: {
  sessionId: string;
  participants: Participant[];
}) {
  const presents = participants.filter((p) => p.present).length;
  const [showCsvPanel, setShowCsvPanel] = useState(false);

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {presents} / {participants.length} présent(s)
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCsvPanel((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Upload className="h-3.5 w-3.5" />
            Importer CSV
          </button>
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

      {/* CSV import panel */}
      {showCsvPanel && (
        <CsvImportPanel sessionId={sessionId} onClose={() => setShowCsvPanel(false)} />
      )}

      {/* Table */}
      {participants.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Prénom</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">CIN</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date naissance</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Fonction</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Présent</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Photo</th>
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
                    <td className="px-4 py-3 text-center">
                      <PhotoUploadButton participantId={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add form */}
      <AddParticipantForm sessionId={sessionId} />
    </div>
  );
}
