# The Hoard — Architecture & Rollout Plan

How the design in [SPEC.md](./SPEC.md) integrates with Magpie's live rewards pipeline, and the phased path from this document to the first weighted distribution. **Nothing here is implemented yet.**

## Integration surface (deliberately tiny)

The live pipeline today:

```
fees → holder pool accrual → snapshot (balances) → pro-rata allocate → pay from treasury → verify → ledger
```

The Hoard touches exactly **one arrow** — the allocator's numerator — and adds one derived table beside it:

```
                                  ┌──────────────────┐
snapshot (balances) ──────────────▶  streak engine    │   derived, rebuildable
                                  │  (hoard_streaks)  │   from snapshot history
                                  └────────┬─────────┘
                                           ▼
             allocate by balance × multiplier   (was: by balance)
```

Everything downstream — payout batching, retry loops, rent-exempt handling, signatures, ledger, public stats — is unchanged and unaware The Hoard exists.

### Components

1. **Streak engine** (new service module): after each snapshot, for each eligible wallet, apply SPEC §3 against the previous snapshot's balance; upsert `(wallet, streak_anchor_at, last_balance, multiplier_bps)`. Pure function of snapshot history — idempotent, replayable.
2. **Streak table** (one new DB table + migration): derived state only. Rebuild = replay all snapshots (same code path as genesis backfill, SPEC §6).
3. **Allocator change** (one line of intent): `weight = balance × multiplier_bps` with bps-scaled integer math and the existing largest-remainder rounding. Ships behind a flag (`HOARD_WEIGHTING_ENABLED`), default **off**.
4. **Read API**: per-wallet `{streak_days, multiplier, next_tier_at}` for the dashboard card, plus aggregate tier distribution for public stats.
5. **Surfaces**: dashboard "Your Hoard" card, public stats tier chart, docs section, community-agent (Pip) answers — all reading the same table.

## Phased rollout (each phase gates the next)

### Phase 0 — Design review *(this repo, now)*
Public spec + threat model + reference implementation with executable test vectors. Community review window. Exit gate: no unresolved correctness or gaming issues.

### Phase 1 — Shadow mode (compute, don't apply)
Streak engine runs against every new snapshot **and the full archive** (genesis backfill), storing streaks and logging what each cycle's allocations *would have been* under Hoard weighting — while actual distributions continue unweighted. Exit gates:
- Backfill is deterministic (two independent replays agree byte-for-byte)
- Shadow allocations satisfy all four SPEC §4 invariants on ≥ 2 real cycles
- Aggregate simulation published in this repo (share-shift by tier, no individual wallets)

### Phase 2 — Surfaces before stakes
Dashboard card, stats, docs, and Pip go live showing everyone their streak and multiplier — **while distributions remain unweighted**. Holders get ≥ 1 full cycle to see their standing and object before money moves differently (SPEC §7 gates 1–2). Announcement of the activation date happens here, honestly framed.

### Phase 3 — First weighted cycle
Flag on. The first Hoard-weighted distribution runs with the standard verification (row counts, signature completeness, treasury reconciliation) **plus** the §4 invariant checks against the pre-published simulation. Any mismatch → flag off, unweighted payout, post-mortem in public.

### Phase 4 — Steady state & governance
Curve parameters (`TIER_DAYS`, `TIER_BPS`, `DUST_BPS`) become governance-tunable configuration. Ledger and archives note the parameter set active for each cycle, so every historical allocation stays auditable against the rules that produced it.

## Verification standard (per protocol doctrine)

The activation change (Phase 3) is a reward-economics change on the money path, so it inherits the protocol's proof standard: **verified end-to-end with a real cycle** — machine-checked invariants, on-chain signatures, treasury reconciliation — before being called done. A rewards feature that misallocates by one lamport is a broken promise; the invariants exist so that class of bug is structurally impossible, not merely unlikely.

## Non-goals (explicitly out of scope)

- On-chain staking/lock contracts — see SECURITY.md §7 and README ("why no staking contract")
- Changing pool funding percentages, payout cadence, or eligibility rules
- Per-token-lot accounting (FIFO tracking) — the wallet is the loyalty unit
- Any mechanism requiring holders to sign, approve, or interact — holding is the entire UX
