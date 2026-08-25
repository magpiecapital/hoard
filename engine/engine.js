/**
 * The Hoard engine — devnet build. Production-shaped: this exact module is
 * what ports into the bot at Phase 3; only the Store implementation changes.
 * All mechanics delegate to the audited reference implementation so there is
 * exactly ONE encoding of the SPEC in this repo.
 */
import { DEFAULT_PARAMS, validateParams, advanceStreak, streakDays, multiplierBps, allocate } from "../reference/hoard.js";

export class HoardEngine {
  constructor(store, params = DEFAULT_PARAMS) {
    validateParams(params);
    this.store = store;
    this.params = params;
  }

  /** Deterministic full replay (SPEC §6). Persists derived streaks. */
  async replay() {
    const snaps = await this.store.getSnapshots();
    const state = new Map();
    const seen = new Set();
    let prev = -Infinity;
    for (const s of snaps) {
      if (s.atMs === prev) continue;               // idempotent on duplicates
      if (s.atMs < prev) throw new Error("history not chronological");
      prev = s.atMs;
      for (const w of s.balances.keys()) seen.add(w);
      for (const w of seen) {
        const bal = s.balances.get(w) ?? 0n;
        const next = advanceStreak(state.get(w) ?? null, bal, s.atMs, this.params);
        if (next == null) state.delete(w); else state.set(w, next);
      }
    }
    const last = snaps.length ? snaps[snaps.length - 1].atMs : 0;
    const rows = [...state.entries()].map(([wallet, st]) => {
      const days = streakDays(st, last);
      return { wallet, anchorMs: st.anchorMs, lastBalance: st.lastBalance, days, bps: multiplierBps(days, this.params) };
    });
    await this.store.putStreaks(rows);
    return rows;
  }

  /** Weighted allocation for a pool over the latest snapshot's holders. */
  async shadowAllocate(poolLamports) {
    const snaps = await this.store.getSnapshots();
    if (!snaps.length) return { alloc: new Map(), proRata: new Map() };
    const latest = snaps[snaps.length - 1];
    const streaks = new Map((await this.store.getStreaks()).map((r) => [r.wallet, r]));
    const entries = [...latest.balances.entries()].filter(([, b]) => b > 0n).map(([wallet, balance]) => ({
      wallet, balance, multBps: BigInt(streaks.get(wallet)?.bps ?? 10000),
    }));
    const flat = entries.map((e) => ({ ...e, multBps: 10000n }));
    return { alloc: allocate(entries, poolLamports), proRata: allocate(flat, poolLamports) };
  }

  tierCounts(rows) {
    const c = {};
    for (const r of rows) c[r.bps] = (c[r.bps] || 0) + 1;
    return c;
  }
}
