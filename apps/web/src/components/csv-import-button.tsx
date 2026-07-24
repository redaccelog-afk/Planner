"use client";

import { useRef, useState } from "react";
import { Upload, X, CheckCircle, AlertCircle, Download, Loader2 } from "lucide-react";

type Entity =
  | "clients"
  | "formateurs"
  | "themes"
  | "consumables"
  | "materials"
  | "hotels"
  | "sessions"
  | "demandes"
  | "participants"
  | "preselections"
  | "templates";

const TEMPLATES: Record<Entity, { headers: string[]; example: string[] }> = {
  clients: {
    headers: ["nom", "site_label", "site_adresse", "site_ville", "latitude", "longitude"],
    example: ["HUTCHINSON BOUSKOURA", "Hutchinson Bouskoura", "Zone Industrielle Bouskoura", "Bouskoura", "33.3719", "-7.6497"],
  },
  formateurs: {
    headers: ["type", "nom_complet", "telephone", "email", "ville", "adresse", "statut_juridique", "tarif_journalier", "delai_paiement", "ice", "rc", "if_fiscal", "cnss", "iban", "banque", "matricule", "cout_employeur", "notes"],
    example: ["EXTERNE", "Mohammed Alaoui", "+212600000000", "m.alaoui@email.com", "Casablanca", "", "Auto-entrepreneur", "1500", "30", "", "", "", "", "", "", "", "", ""],
  },
  themes: {
    headers: ["code", "label", "categorie", "duree_jours", "actif"],
    example: ["CACES_R489", "CACES R489 — Chariots élévateurs", "CACES", "3", "oui"],
  },
  consumables: {
    headers: ["label", "unite", "stock_qt", "seuil_alerte", "cout_unitaire"],
    example: ["Stylo CCE LOG", "pièce", "200", "50", "3"],
  },
  materials: {
    headers: ["label", "categorie", "numero_serie", "notes"],
    example: ["Casque VR Oculus Quest 2", "VR", "VR-005", ""],
  },
  hotels: {
    headers: ["nom", "ville", "adresse", "telephone", "email", "prix_min", "prix_max"],
    example: ["Ibis Casablanca Centre", "Casablanca", "Rue Hassan II", "+212522000000", "", "400", "600"],
  },
  sessions: {
    headers: ["client_nom", "site_ville", "theme_code", "formateur_telephone", "date_debut", "date_fin", "statut", "participants", "lieu", "formateur_confirme", "client_confirme", "notes"],
    example: ["HUTCHINSON BOUSKOURA", "Bouskoura", "CACES_R489", "+212600000001", "2026-07-15", "2026-07-17", "PROVISOIRE", "12", "", "non", "non", ""],
  },
  demandes: {
    headers: ["client_nom", "site_ville", "themes", "participants", "urgence", "date_debut", "date_fin", "notes"],
    example: ["HUTCHINSON BOUSKOURA", "Bouskoura", "CACES_R489,SST", "12", "0", "2026-08-01", "2026-08-03", ""],
  },
  participants: {
    headers: ["session_id", "nom", "prenom", "cin", "fonction", "present", "date_naissance"],
    example: ["", "Alami", "Youssef", "AB123456", "Opérateur", "oui", "1990-05-20"],
  },
  preselections: {
    headers: ["formateur_telephone", "statut", "source", "score", "cv_url", "notes"],
    example: ["+212600000000", "CANDIDAT", "recommandation", "75", "", "Très bon profil CACES"],
  },
  templates: {
    headers: ["code", "nom", "nomenclature", "actif"],
    example: ["ATT_CACES_R489", "Attestation CACES R489", "ATT-{YEAR}-{SEQ:4}", "oui"],
  },
};

const ENTITY_LABELS: Record<Entity, string> = {
  clients: "clients",
  formateurs: "formateurs",
  themes: "thèmes",
  consumables: "consommables",
  materials: "matériels",
  hotels: "hôtels",
  sessions: "sessions",
  demandes: "demandes",
  participants: "participants",
  preselections: "présélections",
  templates: "templates",
};

type ImportResult = {
  created: number;
  updated: number;
  errors: string[];
  total: number;
};

export function CsvImportButton({
  entity,
  onSuccess,
}: {
  entity: Entity;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tpl = TEMPLATES[entity];

  function downloadTemplate() {
    const csv = [tpl.headers.join(";"), tpl.example.join(";")].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template_import_${entity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      alert("Veuillez sélectionner un fichier .csv");
      return;
    }
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("entity", entity);
    fd.append("file", file);
    try {
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setResult(data);
      if (data.errors.length === 0) onSuccess?.();
    } catch (e) {
      setResult({ created: 0, updated: 0, errors: [e instanceof Error ? e.message : "Erreur inconnue"], total: 0 });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setResult(null); }}
        className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Upload className="h-4 w-4" />
        Importer CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">Importer des {ENTITY_LABELS[entity]}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fichier CSV séparé par point-virgule (;)</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Template download */}
              <div className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Modèle CSV</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Colonnes : {tpl.headers.join(", ")}
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-secondary/30"
                }`}
              >
                {loading ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {loading ? "Import en cours..." : "Glissez votre fichier ici"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loading ? "Veuillez patienter" : "ou cliquez pour sélectionner un fichier .csv"}
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {/* Results */}
              {result && (
                <div className="space-y-2">
                  {(result.created > 0 || result.updated > 0) && (
                    <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-emerald-400">Import réussi</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {result.created > 0 && `${result.created} créé(s)`}
                          {result.created > 0 && result.updated > 0 && " · "}
                          {result.updated > 0 && `${result.updated} mis à jour`}
                          {" · "}
                          {result.total} ligne(s) traitée(s)
                        </p>
                      </div>
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <p className="text-sm font-medium text-red-400">{result.errors.length} erreur(s)</p>
                      </div>
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {result.errors.map((e, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-secondary/20">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
