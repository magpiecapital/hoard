/**
 * Devnet harness — run the full Hoard system end-to-end on a synthetic
 * population modeled on real mainnet aggregates (see SIMULATIONS.md).
 *
 *   node engine/devnet.js [--wallets 1500] [--snapshots 12] [--seed 7]
 *
 * Deterministic: seeded LCG, no Date.now/Math.random — same inputs, same
 * output, every run. Prints tier distribution, weighted-vs-pro-rata
 * comparison, and machine-checks the SPEC §4 invariants.
 */
import { MemoryStore } from "./store.js";
import { HoardEngine } from "./engine.js";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const N = arg("wallets", 1500), SNAPS = arg("snapshots", 12), SEED = arg("seed", 7);

let s = SEED >>> 0;
const rand = () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32);

// Population archetypes calibrated to mainnet observation (SIMULATIONS.md):
// ~50% long holders, ~6% mid joiners, ~42% churn/new.
const T0 = 1_770_000_000_000, WEEK = 7 * 86_400_000;
const store = new MemoryStore();
const wallets = Array.from({ length: N }, (_, i) => {
  const r = rand();
  return {
    id: "w" + i,
    joinSnap: r < 0.5 ? 0 : r < 0.56 ? Math.floor(SNAPS * 0.6) : Math.floor(rand() * SNAPS),
    churn: r >= 0.56 && rand() < 0.5,          // occasionally sells >dust
    bal: BigInt(Math.floor(10_000 + rand() * 5_000_000)) * 1_000_000n,
  };
});
for (let i = 0; i < SNAPS; i++) {
  const balances = new Map();
  for (const w of wallets) {
    if (i < w.joinSnap) continue;
    let b = w.bal;
    if (w.churn && rand() < 0.25) b = b / 2n;   // real sell → reset
    else if (rand() < 0.3) b = b + b / 20n;      // buys never reset
    w.bal = b;
    balances.set(w.id, b);
  }
  store.addSnapshot(i + 2, T0 + i * WEEK * 1.4, balances);
}

const engine = new HoardEngine(store);
const rows = await engine.replay();
const tiers = engine.tierCounts(rows);
console.log(`DEVNET REPLAY — ${rows.length} wallets over ${SNAPS} snapshots`);
console.log("  tiers:", JSON.stringify(tiers));

const POOL = 2_500_000_000n; // 2.5 SOL, mainnet-cycle-sized
const { alloc, proRata } = await engine.shadowAllocate(POOL);
let sum = 0n, up = 0, down = 0, same = 0;
for (const [w, v] of alloc) {
  sum += v;
  const p = proRata.get(w) ?? 0n;
  if (v > p) up++; else if (v < p) down++; else same++;
}
console.log(`SHADOW ALLOCATION — pool ${Number(POOL) / 1e9} SOL`);
console.log(`  gainers ${up} | reduced ${down} | unchanged ${same}`);
console.log(`  invariant Σalloc==pool: ${sum === POOL ? "PASS" : "FAIL"}`);
const neg = [...alloc.values()].some((v) => v < 0n || v > POOL);
console.log(`  invariant bounds: ${neg ? "FAIL" : "PASS"}`);
process.exit(sum === POOL && !neg ? 0 : 1);
