import { randomInt } from "node:crypto";
import { PIN_LENGTH } from "./constants";

/** Server-only: generates a numeric game PIN. Do not import from client components. */
export function generatePin(): string {
  const min = 10 ** (PIN_LENGTH - 1);
  const max = 10 ** PIN_LENGTH;
  return String(randomInt(min, max));
}
