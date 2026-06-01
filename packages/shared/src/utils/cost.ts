import { RATE_PER_KM, PER_DIEM_MAD } from "../constants";
import type { CostBreakdown, SessionCostInput } from "../types/index";

export function calculateSessionCost(input: SessionCostInput): CostBreakdown {
  const honoraires = input.trainerRatePerDay * input.durationDays;
  const transport = input.distanceKm * 2 * RATE_PER_KM; // aller-retour
  const hotel = input.needsHotel
    ? input.hotelNights * input.hotelCostPerNight
    : 0;
  const perDiem = input.needsHotel ? input.hotelNights * PER_DIEM_MAD : 0;
  const consommables = input.consumablesCost;
  const total = honoraires + transport + hotel + perDiem + consommables;

  return { honoraires, transport, hotel, perDiem, consommables, total };
}

export function shouldRequireHotel(
  distanceKm: number,
  thresholdKm = 150,
  hasConsecutiveNextDay = false
): boolean {
  return distanceKm > thresholdKm || hasConsecutiveNextDay;
}

export function formatCostMAD(amount: number): string {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function costDelta(current: CostBreakdown, optimized: CostBreakdown): number {
  return current.total - optimized.total;
}

/** Alias utilisé dans les templates email */
export const formatCurrency = formatCostMAD;
