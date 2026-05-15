import { z } from "zod";

// ─── Trainer ─────────────────────────────────────────────────────
export const TrainerSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2),
  phone: z.string().regex(/^\+212[0-9]{9}$/, "Numéro WhatsApp invalide (+212...)"),
  email: z.string().email().optional().nullable(),
  city: z.string().min(2),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  active: z.boolean(),
  notes: z.string().optional().nullable(),
});

export const CreateTrainerSchema = TrainerSchema.omit({ id: true });
export const UpdateTrainerSchema = CreateTrainerSchema.partial();

// ─── Theme ───────────────────────────────────────────────────────
export const ThemeSchema = z.object({
  id: z.string(),
  code: z.string().min(3),
  label: z.string().min(3),
  category: z.enum(["CACES", "VR", "SECURITE", "SECOURISME", "AUTRE"]),
  durationDays: z.number().int().min(1).max(30),
  description: z.string().optional().nullable(),
  active: z.boolean(),
});

export const CreateThemeSchema = ThemeSchema.omit({ id: true });

// ─── Client ──────────────────────────────────────────────────────
export const ClientSiteSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  label: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  active: z.boolean(),
});

export const ClientContactSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  name: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  primary: z.boolean(),
});

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  normalizedName: z.string(),
  active: z.boolean(),
  notes: z.string().optional().nullable(),
});

export const CreateClientSchema = ClientSchema.omit({ id: true, normalizedName: true });

// ─── Training Request ────────────────────────────────────────────
export const TrainingRequestSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  siteId: z.string(),
  themeIds: z.array(z.string()).min(1),
  participants: z.number().int().min(1).max(200),
  desiredDateFrom: z.coerce.date().optional().nullable(),
  desiredDateTo: z.coerce.date().optional().nullable(),
  urgency: z.number().int().min(0).max(3),
  notes: z.string().optional().nullable(),
});

export const CreateTrainingRequestSchema = TrainingRequestSchema.omit({ id: true });

// ─── Training Session ────────────────────────────────────────────
export const SessionStatusSchema = z.enum(["PROVISOIRE", "CONFIRMEE", "ANNULEE"]);

export const CreateSessionSchema = z.object({
  requestId: z.string(),
  trainerId: z.string(),
  themeId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Cost Breakdown ──────────────────────────────────────────────
export const CostBreakdownSchema = z.object({
  honoraires: z.number(),
  transport: z.number(),
  hotel: z.number(),
  perDiem: z.number(),
  consommables: z.number(),
  total: z.number(),
});

export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;

// ─── Trainer Candidate (matching) ────────────────────────────────
export const TrainerCandidateSchema = z.object({
  trainerId: z.string(),
  fullName: z.string(),
  city: z.string(),
  phone: z.string(),
  score: z.number(),
  available: z.boolean(),
  distanceKm: z.number().optional(),
  estimatedCost: CostBreakdownSchema.optional(),
  consecutiveBonus: z.boolean(),
  notes: z.string().optional(),
});

export type TrainerCandidate = z.infer<typeof TrainerCandidateSchema>;

// ─── AI Extraction ───────────────────────────────────────────────
export const AiEmailExtractionSchema = z.object({
  clientNameGuess: z.string().optional(),
  clientId: z.string().optional(),
  themes: z.array(z.string()),
  participants: z.number().int().optional(),
  desiredDateFrom: z.string().optional(),
  desiredDateTo: z.string().optional(),
  city: z.string().optional(),
  urgency: z.number().int().min(0).max(3),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type AiEmailExtraction = z.infer<typeof AiEmailExtractionSchema>;

// ─── WhatsApp Intent ─────────────────────────────────────────────
export const WaIntentSchema = z.object({
  intent: z.enum(["proposition_date", "refus", "confirmation", "question", "autre"]),
  proposedDates: z.array(z.string()).optional(),
  message: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type WaIntent = z.infer<typeof WaIntentSchema>;

// ─── Session Cost Input ──────────────────────────────────────────
export interface SessionCostInput {
  trainerRatePerDay: number;
  durationDays: number;
  distanceKm: number;
  needsHotel: boolean;
  hotelNights: number;
  hotelCostPerNight: number;
  consumablesCost: number;
}
