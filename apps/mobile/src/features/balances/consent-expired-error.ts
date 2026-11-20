export class ConsentExpiredError extends Error {
  constructor() {
    super('Accord bancaire à renouveler');
  }
}
