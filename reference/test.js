/**
 * The Hoard — executable test vectors for SPEC v0.1.
 * Run: node reference/test.js   (exits non-zero on any failure)
 */
import { DEFAULT_PARAMS, multiplierBps, advanceStreak, streakDays, allocate, replayHistory, validateParams } from "./hoard.js";

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "  ok " : "FAIL "} ${name}`);
  if (!cond) failures++;
}
const DAY = 86_400_000;
const T0 = 1_750_000_000_000; // arbitrary fixed epoch — tests are deterministic

// ── SPEC §2: multiplier curve ────────────────────────────────────────────────
check("day 0 → 1.00x", multiplierBps(0) === 10000n);
check("day 13 → 1.00x", multiplierBps(13) === 10000n);
check("day 14 → 1.25x", multiplierBps(14) === 12500n);
check("day 29 → 1.25x", multiplierBps(29) === 12500n);
check("day 30 → 1.50x", multiplierBps(30) === 15000n);
check("day 89 → 1.50x", multiplierBps(89) === 15000n);
check("day 90 → 2.00x", multiplierBps(90) === 20000n);
check("day 400 → 2.00x", multiplierBps(400) === 20000n);

// ── SPEC §3: streak rules ────────────────────────────────────────────────────
let s = advanceStreak(null, 1_000_000n, T0);
check("§3.1 establishment anchors at first snapshot", s.anchorMs === T0);

s = advanceStreak(s, 1_500_000n, T0 + 10 * DAY);
check("§3.2 increase keeps anchor", s.anchorMs === T0);
check("§3.2 increase updates lastBalance", s.lastBalance === 1_500_000n);

s = advanceStreak(s, 1_495_000n, T0 + 20 * DAY); // −0.33% within 0.5% dust
check("§3.3 dust-tolerated decrease keeps anchor", s.anchorMs === T0);

const reset = advanceStreak(s, 1_400_000n, T0 + 30 * DAY); // −6.4% → reset
check("§3.3 real sell resets anchor", reset.anchorMs === T0 + 30 * DAY);

check("§3.4 absence kills streak", advanceStreak(s, 0n, T0 + 30 * DAY) === null);
check("streakDays computes whole days", streakDays({ anchorMs: T0, lastBalance: 1n }, T0 + 45 * DAY) === 45);
check("boundary: exactly-dust decrease survives",
  advanceStreak({ anchorMs: T0, lastBalance: 10000n }, 9950n, T0 + DAY).anchorMs === T0);
check("boundary: one-below-dust resets",
  advanceStreak({ anchorMs: T0, lastBalance: 10000n }, 9949n, T0 + DAY).anchorMs === T0 + DAY);

// ── SPEC §4: allocation invariants ───────────────────────────────────────────
const entries = [
  { wallet: "A", balance: 1_000_000n, multBps: 20000n }, // 90d holder
  { wallet: "B", balance: 1_000_000n, multBps: 10000n }, // fresh
  { wallet: "C", balance: 333_333n, multBps: 15000n },
  { wallet: "D", balance: 1n, multBps: 12500n },
];
const POOL = 2_517_686_207n; // a realistic cycle-sized pool
const alloc = allocate(entries, POOL);
const sum = [...alloc.values()].reduce((a, x) => a + x, 0n);
check("invariant 1: Σ alloc = pool exactly", sum === POOL);
check("invariant 3a: 2.0x beats 1.0x at equal balance", alloc.get("A") > alloc.get("B"));
check("invariant 3b: A gets exactly 2x B (equal balances)",
  alloc.get("A") - 2n * alloc.get("B") >= -1n && alloc.get("A") - 2n * alloc.get("B") <= 1n);
check("invariant 4: no wallet exceeds pool", [...alloc.values()].every((v) => v <= POOL));

// invariant 2: equal multipliers ≡ today's pro-rata
const flat = entries.map((e) => ({ ...e, multBps: 10000n }));
const flatAlloc = allocate(flat, POOL);
const proRata = allocate(entries.map((e) => ({ wallet: e.wallet, balance: e.balance, multBps: 1n })), POOL);
check("invariant 2: uniform multipliers reduce to pro-rata",
  [...flatAlloc.entries()].every(([w, v]) => v === proRata.get(w)));

check("degenerate: zero pool allocates zeros",
  [...allocate(entries, 0n).values()].every((v) => v === 0n));

// ── SPEC §6: replay determinism + correctness ────────────────────────────────
const history = [
  { snapMs: T0, balances: new Map([["X", 100n], ["Y", 100n], ["Z", 100n]]) },
  { snapMs: T0 + 10 * DAY, balances: new Map([["X", 100n], ["Y", 50n], ["Z", 100n]]) },  // Y sells half
  { snapMs: T0 + 95 * DAY, balances: new Map([["X", 120n], ["Y", 50n]]) },               // Z vanishes
];
const states = replayHistory(history);
check("§6 unbroken holder keeps original anchor", states.get("X").anchorMs === T0);
check("§6 X launches at 2.0x", multiplierBps(streakDays(states.get("X"), T0 + 95 * DAY)) === 20000n);
check("§6 seller re-anchored at sell snapshot", states.get("Y").anchorMs === T0 + 10 * DAY);
check("§6 vanished wallet has no streak", !states.has("Z"));
const replay2 = replayHistory(history);
const ser = (m) => JSON.stringify([...m.entries()], (_, v) => (typeof v === "bigint" ? v.toString() : v));
check("§6 determinism: independent replays agree", ser(states) === ser(replay2));

// ── Adversarial vectors (Sec3-derived hardening — see SECURITY.md §8) ────────

// [Sec3 L-01 class: time-source manipulation] duplicated snapshot is a no-op
const dupHistory = [
  { snapMs: T0, balances: new Map([["X", 100n]]) },
  { snapMs: T0, balances: new Map([["X", 100n]]) }, // exact replay
  { snapMs: T0 + 10 * DAY, balances: new Map([["X", 100n]]) },
];
check("adv: duplicate snapshot cannot double-advance streaks",
  replayHistory(dupHistory).get("X").anchorMs === T0);

// [Sec3 L-01 class] out-of-order history rejected, never silently re-anchored
let threw = false;
try { replayHistory([{ snapMs: T0 + DAY, balances: new Map() }, { snapMs: T0, balances: new Map() }]); }
catch { threw = true; }
check("adv: non-chronological history throws", threw);

// [overflow class — protocol u64-overflow lesson] whale-scale math stays exact
const whale = [
  { wallet: "W", balance: 999_999_999_999_999_999n, multBps: 20000n }, // ~1e18
  { wallet: "m", balance: 1n, multBps: 10000n },
];
const bigPool = 500_000_000_000_000n; // 500k SOL in lamports
const whaleAlloc = allocate(whale, bigPool);
check("adv: whale-scale allocation conserves pool exactly",
  whaleAlloc.get("W") + whaleAlloc.get("m") === bigPool);
check("adv: minnow is never rounded into oblivion beyond floor+remainder rules",
  whaleAlloc.get("m") >= 0n && whaleAlloc.get("m") <= 1n);

// [param-bounds class] governance cannot set an unsafe/unfair curve
const rejects = [
  { ...DEFAULT_PARAMS, TIER_BPS: [9000n, 12500n, 15000n, 20000n] },          // base below 1x taxes new holders
  { ...DEFAULT_PARAMS, TIER_BPS: [10000n, 15000n, 12500n, 20000n] },         // non-monotone: longer earns less
  { ...DEFAULT_PARAMS, TIER_DAYS: [0, 30, 14, 90] },                          // out-of-order tiers
  { ...DEFAULT_PARAMS, TIER_DAYS: [7, 14, 30, 90] },                          // no day-0 tier
  { ...DEFAULT_PARAMS, DUST_BPS: 500n },                                      // 5% dust = real exit valve
];
check("adv: every unsafe param set is rejected", rejects.every((p) => {
  try { validateParams(p); return false; } catch { return true; }
}));
check("adv: launch params validate clean", validateParams(DEFAULT_PARAMS) === true);

// [degenerate-state class — Sec3 L-07 lesson: poisoned empty state]
check("adv: empty eligible set with non-zero pool allocates nothing (no ghost claims)",
  [...allocate([], 1_000_000n).values()].length === 0);
check("adv: all-zero balances allocate zeros",
  [...allocate([{ wallet: "a", balance: 0n, multBps: 20000n }], 1_000n).values()].every((v) => v === 0n));

// [rounding-conservation fuzz — Sec3 dust/rounding class] 200 randomized trials
let fuzzOk = true;
let seed = 0x9e3779b9;
const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0);
for (let t = 0; t < 200 && fuzzOk; t++) {
  const n = 1 + (rand() % 40);
  const entries2 = Array.from({ length: n }, (_, i) => ({
    wallet: `w${i}`,
    balance: BigInt(1 + (rand() % 1_000_000_000)),
    multBps: [10000n, 12500n, 15000n, 20000n][rand() % 4],
  }));
  const pool2 = BigInt(1 + (rand() % 2_000_000_000));
  const a2 = allocate(entries2, pool2);
  const s2 = [...a2.values()].reduce((x, y) => x + y, 0n);
  if (s2 !== pool2 || [...a2.values()].some((v) => v < 0n || v > pool2)) fuzzOk = false;
}
check("adv: 200-trial fuzz — pool conserved exactly, all allocations bounded", fuzzOk);

console.log(failures === 0 ? "\nALL VECTORS PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
