import type { TrainerCandidate, CostBreakdown } from "../types/index";

export interface ScoringInput {
  trainerId: string;
  fullName: string;
  city: string;
  phone: string;
  hasTheme: boolean;
  isAvailable: boolean;
  distanceKm: number;
  hasConsecutiveBonus: boolean;
  ratePerDay: number;
  satisfactionScore?: number;
  reliabilityScore?: number;
  estimatedCost?: CostBreakdown;
}

const WEIGHTS = {
  availability: 40,
  distance: 25,
  cost: 20,
  consecutive: 10,
  reputation: 5,
};

export function scoreTrainer(input: ScoringInput): TrainerCandidate {
  if (!input.hasTheme || !input.isAvailable) {
    return {
      trainerId: input.trainerId,
      fullName: input.fullName,
      city: input.city,
      phone: input.phone,
      score: 0,
      available: false,
      distanceKm: input.distanceKm,
      consecutiveBonus: false,
    };
  }

  // Disponibilité : filtre dur
  let score = WEIGHTS.availability;

  // Distance : inversement proportionnel (0km = max, 500km+ = 0)
  const distanceScore = Math.max(0, 1 - input.distanceKm / 500);
  score += distanceScore * WEIGHTS.distance;

  // Coût : inversement proportionnel (base 5000 MAD)
  if (input.estimatedCost) {
    const costScore = Math.max(0, 1 - input.estimatedCost.total / 8000);
    score += costScore * WEIGHTS.cost;
  }

  // Bonus enchaînement
  if (input.hasConsecutiveBonus) {
    score += WEIGHTS.consecutive;
  }

  // Réputation
  const reputationScore = ((input.satisfactionScore ?? 3) / 5 + (input.reliabilityScore ?? 3) / 5) / 2;
  score += reputationScore * WEIGHTS.reputation;

  return {
    trainerId: input.trainerId,
    fullName: input.fullName,
    city: input.city,
    phone: input.phone,
    score: Math.round(score * 10) / 10,
    available: true,
    distanceKm: input.distanceKm,
    estimatedCost: input.estimatedCost,
    consecutiveBonus: input.hasConsecutiveBonus,
  };
}

export function rankTrainers(candidates: TrainerCandidate[]): TrainerCandidate[] {
  return [...candidates]
    .filter((c) => c.available)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function normalizeClientName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export function fuzzyMatchClient(query: string, candidates: { id: string; name: string; normalizedName: string }[]): { id: string; name: string; score: number }[] {
  const normalized = normalizeClientName(query);
  return candidates
    .map((c) => {
      const a = normalized;
      const b = c.normalizedName;
      let score = 0;
      if (b === a) score = 1;
      else if (b.includes(a) || a.includes(b)) score = 0.8;
      else {
        const words = a.split(" ");
        const matches = words.filter((w) => b.includes(w));
        score = matches.length / words.length;
      }
      return { ...c, score };
    })
    .filter((c) => c.score > 0.3)
    .sort((a, b) => b.score - a.score);
}
