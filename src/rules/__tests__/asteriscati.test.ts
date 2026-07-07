// Asteriscati e Osimhen Gate — doc 02 §8.
import { describe, expect, it } from 'vitest';
import { incassoAsteriscato, validaSostitutoAsteriscato } from '../asteriscati';
import { incassoSvincolo } from '../svincoli';
import { richiedeApplicationLayer } from './helpers';

describe('Asteriscati (§8)', () => {
  it('TC-053 [Must] asterisco rende inutilizzabile: stato aggiornato, alert, ingaggio resta a bilancio', () => {
    richiedeApplicationLayer('TC-053');
  });

  it('TC-054 [Must] svincolo asteriscato: incasso FVM M del momento (38)', () => {
    expect(incassoSvincolo('asteriscato', { fvmRiferimento: 38 })).toBe(38);
  });

  it('TC-055 [Must] sostituto con FVM ≤ asteriscato (35 ≤ 38) dalla lista svincolati → consentito', () => {
    const esito = validaSostitutoAsteriscato({
      fvmAsteriscato: 38,
      fvmSostituto: 35,
      daListaSvincolatiPostUltimaAsta: true,
    });
    expect(esito.ok).toBe(true);
  });

  it('TC-056 [Must] BLOCCO sostituto con FVM superiore (40 > 38)', () => {
    const esito = validaSostitutoAsteriscato({
      fvmAsteriscato: 38,
      fvmSostituto: 40,
      daListaSvincolatiPostUltimaAsta: true,
    });
    expect(esito.ok).toBe(false);
  });

  it('TC-057 [Should] BLOCCO sostituto non presente nella lista svincolati post ultima asta', () => {
    const esito = validaSostitutoAsteriscato({
      fvmAsteriscato: 38,
      fvmSostituto: 35,
      daListaSvincolatiPostUltimaAsta: false,
    });
    expect(esito.ok).toBe(false);
  });

  it('TC-058 [Must] Osimhen Gate: pagato 120, asteriscato prima di nuove sessioni, FVM 180 → incasso 120 (no plusvalenza)', () => {
    const incasso = incassoAsteriscato({
      creditiSpesi: 120,
      fvmAttuale: 180,
      asteriscatoPrimaNuovaSessione: true,
    });
    expect(incasso).toBe(120);
  });

  it('TC-059 [Should] asterisco nel mercato invernale pre-asta: sostituto come prestito gratuito, svincolato all asta', () => {
    richiedeApplicationLayer('TC-059');
  });
});
