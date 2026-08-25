/**
 * Storage interface for the Hoard engine — pluggable so the SAME engine runs
 * on devnet (in-memory) and, at Phase-3 activation, against Postgres in the
 * production bot. The engine only ever talks to this interface.
 *
 * Contract:
 *   getSnapshots()            -> [{id, atMs, balances: Map<wallet, bigint>}] chronological
 *   putStreaks(rows)          -> persist full derived streak set (replace-all)
 *   getStreaks()              -> current streak rows
 */
export class MemoryStore {
  constructor() { this.snapshots = []; this.streaks = []; }
  async getSnapshots() { return this.snapshots; }
  async putStreaks(rows) { this.streaks = rows; }
  async getStreaks() { return this.streaks; }
  addSnapshot(id, atMs, balances) { this.snapshots.push({ id, atMs, balances }); }
}
