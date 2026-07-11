import type { EsitoValidazione } from './types';

/** Arrotonda a 2 decimali (importi in € e crediti). */
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export const consentito = (): EsitoValidazione => ({ ok: true, violazioni: [] });

export const bloccato = (...violazioni: string[]): EsitoValidazione => ({
  ok: false,
  violazioni,
});
