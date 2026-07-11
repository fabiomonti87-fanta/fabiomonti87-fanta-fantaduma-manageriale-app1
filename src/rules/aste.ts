// Aste — doc 02 §10: estiva base 1 credito; invernale base = FVM M del giorno d'asta.

export function baseAsta(
  tipo: 'asta_estiva' | 'asta_riparazione',
  ctx?: { fvmGiornoAsta?: number }
): number {
  if (tipo === 'asta_estiva') return 1;
  if (ctx?.fvmGiornoAsta === undefined) {
    throw new Error("baseAsta: per l'asta di riparazione serve il FVM M del giorno d'asta");
  }
  return ctx.fvmGiornoAsta;
}
