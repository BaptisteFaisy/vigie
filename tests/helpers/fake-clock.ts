/**
 * Horloge injectée pour les tests (CONTRACTS §0 : jamais `Date.now()`).
 *
 * `fakeClock()` rend un `Clock` figé, pilotable : `set(iso)` fixe l'instant,
 * `advanceDays(n)`/`advanceHours(n)` le font avancer. Tous les lots de domaine
 * l'utilisent pour des tests déterministes.
 */
import type { Clock } from '../../src/ports.js';

export interface FakeClock extends Clock {
  set(iso: string): void;
  advanceDays(days: number): void;
  advanceHours(hours: number): void;
  advanceMinutes(minutes: number): void;
}

/** Un instant de référence stable, dans la période de démonstration (SPEC §27). */
export const REFERENCE_NOW = '2026-11-11T12:00:00.000Z';

export function fakeClock(now: string = REFERENCE_NOW): FakeClock {
  let current = new Date(now).getTime();
  const advance = (ms: number) => {
    current += ms;
  };
  return {
    now: () => new Date(current).toISOString(),
    set(iso: string) {
      current = new Date(iso).getTime();
    },
    advanceDays(days: number) {
      advance(days * 86_400_000);
    },
    advanceHours(hours: number) {
      advance(hours * 3_600_000);
    },
    advanceMinutes(minutes: number) {
      advance(minutes * 60_000);
    },
  };
}

/** Identifiants déterministes : `id_1`, `id_2`, … */
export function fakeIds() {
  let counter = 0;
  return {
    next(prefix: string) {
      counter += 1;
      return `${prefix}_${counter}`;
    },
  };
}

/** ISO → semaine ISO `${année}-S${semaine}` (utilisé par plusieurs tests). */
export function isoWeekOf(iso: string): string {
  const date = new Date(iso);
  const day = (date.getUTCDay() + 6) % 7; // lundi = 0
  date.setUTCDate(date.getUTCDate() - day + 3); // jeudi de la semaine ISO
  const year = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${year}-S${String(week).padStart(2, '0')}`;
}
