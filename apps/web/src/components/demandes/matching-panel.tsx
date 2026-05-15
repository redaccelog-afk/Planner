"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, MapPin, TrendingUp, Phone, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { TrainerCandidate } from "@ccelog/shared";

interface MatchingPanelProps {
  requestId: string;
}

interface MatchingResult {
  candidates: TrainerCandidate[];
  totalCandidates: number;
}

export function MatchingPanel({ requestId }: MatchingPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchingResult | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  const runMatching = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/demandes/${requestId}/matching`);
      if (res.ok) {
        const data = await res.json() as MatchingResult;
        setResult(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectTrainer = async (trainerId: string) => {
    setSelecting(trainerId);
    // La création de session est déléguée à la page de création de session
    router.push(`/sessions/nouveau?requestId=${requestId}&trainerId=${trainerId}`);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Matching formateurs</h2>
        <button
          onClick={runMatching}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
          {loading ? "Calcul en cours…" : result ? "Relancer" : "Lancer le matching"}
        </button>
      </div>

      {result && (
        <div className="divide-y divide-border">
          {result.candidates.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">
              Aucun formateur disponible sur cette période pour ce thème.
            </div>
          ) : (
            result.candidates.map((candidate, idx) => (
              <div key={candidate.trainerId} className="flex items-center gap-4 px-6 py-4">
                {/* Rang */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  idx === 0 ? "bg-amber-500/20 text-amber-400" :
                  idx === 1 ? "bg-gray-500/20 text-gray-400" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {idx + 1}
                </div>

                {/* Info formateur */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{candidate.fullName}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {candidate.city}
                      {candidate.distanceKm ? ` (${candidate.distanceKm} km)` : ""}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {candidate.phone}
                    </span>
                    {candidate.consecutiveBonus && (
                      <span className="text-xs text-green-400 font-medium">+ Enchaînement possible</span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-center">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-bold text-foreground">{candidate.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">score</p>
                </div>

                {/* Coût estimé */}
                {candidate.estimatedCost && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(candidate.estimatedCost.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">estimé</p>
                  </div>
                )}

                {/* Action */}
                <button
                  onClick={() => selectTrainer(candidate.trainerId)}
                  disabled={!!selecting}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {selecting === candidate.trainerId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Sélectionner
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
