/**
 * Placeholder per i TC di tipo STATO/INVARIANTE che richiedono l'application layer
 * (operazioni → items → ledger → roster → contracts → audit) o il DB.
 * Restano rossi finché non vengono riscritti come test d'integrazione (Sprint 1-2).
 */
export function richiedeApplicationLayer(tc: string): never {
  throw new Error(`${tc}: richiede application layer/DB — skeleton rosso (Sprint 1-2)`);
}
