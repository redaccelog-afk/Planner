import { MIN_SCORE_FACTOR } from "./constants";

export function computeSpeedScore(basePoints: number, timeMs: number, timeLimitSec: number): number {
  const timeLimitMs = timeLimitSec * 1000;
  const clampedTimeMs = Math.min(Math.max(timeMs, 0), timeLimitMs);
  const speedFactor = 1 - clampedTimeMs / timeLimitMs;
  const factor = MIN_SCORE_FACTOR + (1 - MIN_SCORE_FACTOR) * speedFactor;
  return Math.round(basePoints * factor);
}

export function isPuzzleOrderCorrect(submitted: string[], correctOrder: string[]): boolean {
  if (submitted.length !== correctOrder.length) return false;
  return submitted.every((id, index) => id === correctOrder[index]);
}
