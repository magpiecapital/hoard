# The Hoard — Simulations & Validation

Two validation tracks, per the devnet-first mandate: **real-history aggregates** (a one-time
read-only replay over Magpie's actual snapshot archive) and the **reproducible devnet harness**
anyone can run from this repo. No production system carries any Hoard code.

## 1. Real-history replay (read-only, 2026-08-25)

SPEC v0.1 rules replayed over the complete mainnet snapshot archive (distributions #2–#10,
Jun 19 → Aug 23 2026). Aggregates only — no wallet-level data is published.

| Metric | Value |
|---|---|
| Wallets tracked at latest snapshot | 1,521 |
| At 1.00× (new / reset) | 638 (42%) |
| At 1.25× (14+ days) | 89 (6%) |
| **At 1.50× (30+ days unbroken)** | **794 (52%)** |
| At 2.00× (90+ days) | 0 — archive spans ~65 days; first 2.0× wallets mature ~mid-Sept 2026 |

Shadow-allocating the real cycle #10 pool (2.5177 SOL) under Hoard weights vs the actual
pro-rata result: **794 wallets gain, 646 reduced**; largest single-wallet change ±0.02 SOL at
this pool size. Headline: **a majority of current holders are loyalists who benefit immediately.**

## 2. Devnet harness (reproducible)

```
node engine/devnet.js [--wallets 1500] [--snapshots 12] [--seed 7]
```

Fully deterministic (seeded LCG): generates a synthetic population calibrated to the observed
mainnet archetype mix (~50% long holders / ~6% mid joiners / ~44% churn+new), replays the full
streak engine, runs a weighted-vs-pro-rata shadow allocation, and machine-checks the SPEC §4
invariants (exact pool conservation, bounds) on every run. Longer synthetic histories exercise
the 2.0× tier that mainnet history cannot yet reach.

Default-seed output:
```
DEVNET REPLAY — 1500 wallets over 12 snapshots
  tiers: {"10000":255,"12500":153,"15000":285,"20000":807}
SHADOW ALLOCATION — pool 2.5 SOL
  gainers 807 | reduced 693 | unchanged 0
  invariant Σalloc==pool: PASS
  invariant bounds: PASS
```

## Engine portability

`engine/engine.js` is the production-shaped module (single encoding of the SPEC — it imports the
audited reference implementation) behind a pluggable Store interface (`engine/store.js`). At the
operator-gated Phase-3 activation, only a Postgres Store implementation is added; the engine and
its test surface move unchanged.
