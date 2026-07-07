export class NotImplementedError extends Error {
  constructor(fn: string) {
    super(`${fn}: non implementato — Sprint 1 (vedi 04_Piano_Sviluppo.md)`);
    this.name = 'NotImplementedError';
  }
}
