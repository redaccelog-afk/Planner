import { z } from "zod";

export const questionTypeSchema = z.enum(["MCQ", "TRUE_FALSE", "POLL", "PUZZLE"]);
export const mediaTypeSchema = z.enum(["IMAGE", "VIDEO"]);
export const mediaDisplayModeSchema = z.enum(["BEFORE", "WITH", "FULLSCREEN"]);
export const visibilitySchema = z.enum(["PRIVATE", "PUBLIC"]);

// Accepts either a full URL or a root-relative path (e.g. "/uploads/xyz.png") —
// uploaded media is stored as a relative path so it resolves against whichever
// origin the client (host or player) is actually using.
const mediaUrlSchema = z
  .string()
  .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), { message: "URL de média invalide" });

export const choiceInputSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1).max(200),
  isCorrect: z.boolean().default(false),
});

export const questionInputSchema = z.object({
  id: z.string().optional(),
  type: questionTypeSchema.default("MCQ"),
  text: z.string().min(1).max(300),
  mediaUrl: mediaUrlSchema.optional().nullable(),
  mediaType: mediaTypeSchema.optional().nullable(),
  mediaDisplayMode: mediaDisplayModeSchema.default("WITH"),
  timeLimitSec: z.number().int().min(5).max(120).default(20),
  points: z.number().int().min(0).max(2000).default(1000),
  choices: z.array(choiceInputSchema).min(2).max(6),
});

export const quizInputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  category: z.string().max(60).optional().nullable(),
  visibility: visibilitySchema.default("PRIVATE"),
  backgroundTheme: z.string().min(1).max(40).default("cce_log"),
  musicTheme: z.string().max(40).optional().nullable(),
  questions: z.array(questionInputSchema).min(1).max(50),
});

export const joinGameSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
  nickname: z
    .string()
    .min(2, "2 caractères minimum")
    .max(20, "20 caractères maximum")
    .regex(/^[a-zA-Z0-9À-ÿ _-]+$/, "Caractères non autorisés"),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type QuizInput = z.infer<typeof quizInputSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type ChoiceInput = z.infer<typeof choiceInputSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
