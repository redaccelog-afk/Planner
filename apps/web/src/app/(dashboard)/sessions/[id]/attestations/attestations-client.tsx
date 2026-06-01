"use client";

import { useState, useTransition } from "react";
import { Loader2, Download, FileText } from "lucide-react";
import {
  setAttestationResultatAction,
  setCacesResultatAction,
} from "./actions";
import type { AptitudeResult, CacesModuleRef } from "@ccelog/db";

type ParticipantWithData = {
  id: string;
  nom: string;
  prenom: string;
  attestations: {
    id: string;
    resultat: AptitudeResult;
    note: number | null;
    fileUrl: string | null;
    numero: string;
  }[];
  cacesResults: {
    id: string;
    module: CacesModuleRef;
    theoriqueNote: number | null;
    pratiqueNote: number | null;
    resultat: AptitudeResult;
    fileUrl: string | null;
    numero: string | null;
    validUntil: Date | null;
  }[];
};

const RESULTAT_COLORS: Record<AptitudeResult, string> = {
  APTE: "text-green-400",
  INAPT: "text-red-400",
  EN_ATTENTE: "text-yellow-400",
};

function ResultatSelect({
  value,
  onChange,
  disabled,
}: {
  value: AptitudeResult;
  onChange: (v: AptitudeResult) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AptitudeResult)}
      disabled={disabled}
      className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
    >
      <option value="EN_ATTENTE">En attente</option>
      <option value="APTE">Apte</option>
      <option value="INAPT">Inapt</option>
    </select>
  );
}

function ParticipantRow({
  participant,
  sessionId,
  isCaces,
}: {
  participant: ParticipantWithData;
  sessionId: string;
  isCaces: boolean;
}) {
  const attest = participant.attestations[0];
  const [resultat, setResultat] = useState<AptitudeResult>(
    attest?.resultat ?? "EN_ATTENTE"
  );
  const [note, setNote] = useState<string>(attest?.note != null ? String(attest.note) : "");
  const [pending, startTransition] = useTransition();

  function handleResultatChange(v: AptitudeResult) {
    setResultat(v);
    if (attest) {
      startTransition(async () => {
        await setAttestationResultatAction(attest.id, v, note ? Number(note) : null, sessionId);
      });
    }
  }

  function handleNoteBlur() {
    if (attest) {
      startTransition(async () => {
        await setAttestationResultatAction(attest.id, resultat, note ? Number(note) : null, sessionId);
      });
    }
  }

  return (
    <tr className="hover:bg-secondary/20 transition-colors border-b border-border last:border-0">
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {participant.nom} {participant.prenom}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ResultatSelect value={resultat} onChange={handleResultatChange} disabled={pending} />
          {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
      </td>
      <td className="px-4 py-3">
        {!isCaces && (
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="/20"
            className="w-20 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        )}
      </td>
      <td className="px-4 py-3">
        {attest?.fileUrl ? (
          <a
            href={attest.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            {attest.numero}
          </a>
        ) : attest ? (
          <span className="text-xs text-muted-foreground italic">Non généré</span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </td>
    </tr>
  );
}

function CacesModuleRow({
  participant,
  module,
  sessionId,
}: {
  participant: ParticipantWithData;
  module: CacesModuleRef;
  sessionId: string;
}) {
  const existing = participant.cacesResults.find((r) => r.module === module);
  const [resultat, setResultat] = useState<AptitudeResult>(existing?.resultat ?? "EN_ATTENTE");
  const [theoriqueNote, setTheoriqueNote] = useState<string>(
    existing?.theoriqueNote != null ? String(existing.theoriqueNote) : ""
  );
  const [pratiqueNote, setPratiqueNote] = useState<string>(
    existing?.pratiqueNote != null ? String(existing.pratiqueNote) : ""
  );
  const [pending, startTransition] = useTransition();

  function save(r: AptitudeResult, theo: string, prat: string) {
    startTransition(async () => {
      await setCacesResultatAction(
        sessionId,
        participant.id,
        module,
        r,
        theo ? Number(theo) : null,
        prat ? Number(prat) : null
      );
    });
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
      <td className="px-4 py-2 text-sm text-foreground">{module}</td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={theoriqueNote}
          onChange={(e) => setTheoriqueNote(e.target.value)}
          onBlur={() => save(resultat, theoriqueNote, pratiqueNote)}
          placeholder="/100"
          className="w-20 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={pratiqueNote}
          onChange={(e) => setPratiqueNote(e.target.value)}
          onBlur={() => save(resultat, theoriqueNote, pratiqueNote)}
          placeholder="/100"
          className="w-20 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <ResultatSelect
            value={resultat}
            onChange={(v) => {
              setResultat(v);
              save(v, theoriqueNote, pratiqueNote);
            }}
            disabled={pending}
          />
          {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
      </td>
      <td className="px-4 py-2">
        {existing?.fileUrl ? (
          <a
            href={existing.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            {existing.numero ?? "Télécharger"}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </td>
    </tr>
  );
}

export function AttestationsClient({
  sessionId,
  isCaces,
  cacesModules,
  participants,
}: {
  sessionId: string;
  isCaces: boolean;
  cacesModules: CacesModuleRef[];
  participants: ParticipantWithData[];
}) {
  const aptes = participants.filter((p) =>
    p.attestations.some((a) => a.resultat === "APTE")
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total participants :</span>
          <span className="font-medium text-foreground">{participants.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={RESULTAT_COLORS.APTE}>Aptes :</span>
          <span className="font-medium text-green-400">{aptes}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={RESULTAT_COLORS.INAPT}>Inaptes :</span>
          <span className="font-medium text-red-400">
            {participants.filter((p) =>
              p.attestations.some((a) => a.resultat === "INAPT")
            ).length}
          </span>
        </div>
      </div>

      {/* Attestations table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Résultats et attestations
          </h2>
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
            title="Génération PDF en cours de développement"
          >
            Générer attestations
          </button>
        </div>

        {participants.length === 0 ? (
          <div className="bg-card border border-border rounded-xl flex items-center justify-center h-24">
            <p className="text-sm text-muted-foreground">
              Aucun participant — ajoutez des participants dans la feuille de présence.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Participant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Résultat</th>
                  {!isCaces && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Note</th>
                  )}
                  {isCaces && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground"></th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Attestation</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    sessionId={sessionId}
                    isCaces={isCaces}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CACES modules table */}
      {isCaces && participants.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Résultats par module CACES
          </h2>
          {participants.map((p) => (
            <div key={p.id} className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                {p.nom} {p.prenom}
              </p>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Module</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Théorique</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Pratique</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Résultat</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">CACES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cacesModules.map((mod) => (
                      <CacesModuleRow
                        key={mod}
                        participant={p}
                        module={mod}
                        sessionId={sessionId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
