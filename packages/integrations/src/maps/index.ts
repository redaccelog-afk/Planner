/**
 * Google Maps Distance Matrix API
 * Cache 30 jours en base de données
 */
import { db } from "@ccelog/db";
import { DISTANCE_CACHE_DAYS } from "@ccelog/shared";
import { addDays } from "date-fns";

export interface DistanceResult {
  distanceKm: number;
  durationMin: number;
  fromCache: boolean;
}

export async function getDistance(
  trainerId: string,
  siteId: string,
  trainerCoords: { lat: number; lng: number },
  siteCoords: { lat: number; lng: number }
): Promise<DistanceResult> {
  // Vérifier le cache
  const cached = await db.distanceCache.findUnique({
    where: { trainerId_siteId: { trainerId, siteId } },
  });

  if (cached && cached.expiresAt > new Date()) {
    return { distanceKm: cached.distanceKm, durationMin: cached.durationMin, fromCache: true };
  }

  // Appel API Google Maps
  const result = await fetchDistanceFromGoogle(trainerCoords, siteCoords);

  // Mise en cache
  const expiresAt = addDays(new Date(), DISTANCE_CACHE_DAYS);

  await db.distanceCache.upsert({
    where: { trainerId_siteId: { trainerId, siteId } },
    update: { distanceKm: result.distanceKm, durationMin: result.durationMin, cachedAt: new Date(), expiresAt },
    create: { trainerId, siteId, distanceKm: result.distanceKm, durationMin: result.durationMin, expiresAt },
  });

  return { ...result, fromCache: false };
}

async function fetchDistanceFromGoogle(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distanceKm: number; durationMin: number }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    // Mode fallback : calcul à vol d'oiseau × 1.3
    const R = 6371;
    const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const dLon = ((destination.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((destination.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.round(R * c * 1.3);
    const durationMin = Math.round((distanceKm / 80) * 60);
    return { distanceKm, durationMin };
  }

  const endpoint = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=driving&language=fr&key=${apiKey}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Google Maps API: ${res.status}`);

  const data = (await res.json()) as {
    rows: [{ elements: [{ distance: { value: number }; duration: { value: number }; status: string }] }];
    status: string;
  };

  if (data.status !== "OK" || data.rows[0].elements[0].status !== "OK") {
    throw new Error(`Google Maps Distance Matrix: ${data.status}`);
  }

  return {
    distanceKm: Math.round(data.rows[0].elements[0].distance.value / 1000),
    durationMin: Math.round(data.rows[0].elements[0].duration.value / 60),
  };
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ", Maroc")}&key=${apiKey}`;

  const res = await fetch(endpoint);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    results: [{ geometry: { location: { lat: number; lng: number } } }];
    status: string;
  };

  if (data.status !== "OK" || !data.results[0]) return null;

  return data.results[0].geometry.location;
}
