import { format, addDays, isBefore, isAfter, differenceInDays, isWeekend, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { TIMEZONE } from "../constants";

export function toMarocDate(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(d, TIMEZONE);
}

export function fromMarocDate(date: Date): Date {
  return fromZonedTime(date, TIMEZONE);
}

export function formatMaroc(date: Date | string, pattern = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(toZonedTime(d, TIMEZONE), pattern);
}

export function formatMarocFull(date: Date | string): string {
  return formatMaroc(date, "EEEE d MMMM yyyy");
}

export function getBusinessDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let current = start;
  while (!isAfter(current, end)) {
    if (!isWeekend(current)) {
      days.push(new Date(current));
    }
    current = addDays(current, 1);
  }
  return days;
}

export function addBusinessDays(date: Date, days: number): Date {
  let result = date;
  let remaining = days;
  const direction = days > 0 ? 1 : -1;
  while (remaining !== 0) {
    result = addDays(result, direction);
    if (!isWeekend(result)) {
      remaining -= direction;
    }
  }
  return result;
}

export function isDateInRange(date: Date, from: Date | null, to: Date | null): boolean {
  if (from && isBefore(date, from)) return false;
  if (to && isAfter(date, to)) return false;
  return true;
}

export function sessionDurationDays(start: Date, end: Date): number {
  return differenceInDays(end, start) + 1;
}

export function getNotificationDate(sessionStart: Date, offsetDays: number): Date {
  return addDays(sessionStart, offsetDays);
}
