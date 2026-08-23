/**
 * The Hoard — reference implementation (SPEC v0.1).
 *
 * Pure functions, no dependencies, integer math throughout (BigInt lamports,
 * bps-scaled multipliers). This is the executable form of SPEC.md §2–§4 and
 * the replay algorithm of §6. It is NOT the production integration — it exists
 * so the mechanics can be reviewed, tested, and independently verified.
 *
 * Run the test vectors: `node reference/test.js`
 */

export const DEFAULT_PARAMS = Object.freeze({
  TIER_DAYS: [0, 14, 30, 90],
  TIER_BPS: [10000n, 12500n, 15000n, 20000n],
  DUST_BPS: 50n, // 0.5% snapshot-over-snapshot decrease tolerated (SPEC §3.3)
});

const DAY_MS = 86_400_000;

/** SPEC §2 — streak (days) → multiplier (bps). Step function. */
export function multiplierBps(streakDays, params = DEFAULT_PARAMS) {
  let out = params.TIER_BPS[0];
  for (let i = 0; i < params.TIER_DAYS.length; i++) {
    if (streakDays >= params.TIER_DAYS[i]) out = params.TIER_BPS[i];
  }
  return out;
}

/**
 * SPEC §3 — advance one wallet's streak state across one snapshot boundary.
 *
 * state:   null (first appearance) or { anchorMs, lastBalance }
 * balance: BigInt balance at the new snapshot (per SPEC §1, includes collateralized)
 * snapMs:  timestamp (ms) of the new snapshot
 *
 * Returns the new state. A wallet absent from a snapshot (balance 0n /
 * ineligible) should be passed balance 0n — which resets per §3.4.
 */
export function advanceStreak(state, balance, snapMs, params = DEFAULT_PARAMS) {
  if (balance <= 0n) return null; // §3.4 — absence: streak does not survive
  if (state == null) return { anchorMs: snapMs, lastBalance: balance }; // §3.1
  // §3.3 — reset iff balance dropped more than DUST_BPS below previous
  const floor = (state.lastBalance * (10000n - params.DUST_BPS)) / 10000n;
  if (balance < floor) return { anchorMs: snapMs, lastBalance: balance };
  // §3.2 — continue (increases and dust-tolerated decreases keep the anchor)
  return { anchorMs: state.anchorMs, lastBalance: balance };
}

/** Whole days between anchor and snapshot. */
export function streakDays(state, snapMs) {
  if (state == null) return 0;
  return Math.floor((snapMs - state.anchorMs) / DAY_MS);
}

/**
 * SPEC §4 — allocate pool P across wallets by balance × multiplier with
 * exact largest-remainder rounding.
 *
 * entries: [{ wallet, balance (BigInt), multBps (BigInt) }]
 * pool:    BigInt lamports
 * Returns Map<wallet, BigInt> with Σ = pool exactly (invariant 1).
 */
export function allocate(entries, pool) {
  const weights = entries.map((e) => ({ w: e.wallet, wt: e.balance * e.multBps }));
  const total = weights.reduce((a, x) => a + x.wt, 0n);
  const out = new Map();
  if (total <= 0n || pool <= 0n) {
    for (const { w } of weights) out.set(w, 0n);
    return out;
  }
  let allocated = 0n;
  const rem = [];
  for (const { w, wt } of weights) {
    const exactNum = pool * wt; // scaled numerator
    const floor = exactNum / total;
    out.set(w, floor);
    allocated += floor;
    rem.push({ w, frac: exactNum % total });
  }
  // distribute the remainder lamports to the largest fractional parts,
  // ties broken deterministically by wallet string ordering
  rem.sort((a, b) => (a.frac === b.frac ? (a.w < b.w ? -1 : 1) : a.frac > b.frac ? -1 : 1));
  let left = pool - allocated;
  for (let i = 0; left > 0n; i = (i + 1) % rem.length, left -= 1n) {
    out.set(rem[i].w, out.get(rem[i].w) + 1n);
  }
  return out;
}

/**
 * SPEC §6 — genesis backfill: replay a full snapshot history and return the
 * final streak state per wallet. Deterministic in the input.
 *
 * history: [{ snapMs, balances: Map<wallet, BigInt> }] in chronological order.
 */
export function replayHistory(history, params = DEFAULT_PARAMS) {
  const states = new Map();
  const seen = new Set();
  for (const snap of history) {
    for (const w of snap.balances.keys()) seen.add(w);
    for (const w of seen) {
      const bal = snap.balances.get(w) ?? 0n;
      const next = advanceStreak(states.get(w) ?? null, bal, snap.snapMs, params);
      if (next == null) states.delete(w);
      else states.set(w, next);
    }
  }
  return states;
}
