# The Hoard — Mechanics Specification (v0.1, design phase)

This is the normative spec. Where the README simplifies, this document is exact. Terms in **bold** are defined once and used consistently.

## 1. Definitions

- **Snapshot** — the existing periodic capture of every $MAGPIE holder's balance that drives a distribution cycle. Snapshots are numbered (`distribution_id`) and timestamped. This spec adds no new snapshot cadence; it reuses the existing one (~7–10 days, operator- or scheduler-triggered).
- **Balance** — a wallet's snapshot balance, defined exactly as today: in-wallet $MAGPIE **plus** $MAGPIE currently locked as collateral in an active Magpie loan (borrowers are not penalized for using the protocol).
- **Streak** — the number of consecutive days a wallet has held without a **reset event**, measured from the wallet's **streak anchor** (the timestamp of the earliest snapshot in its current unbroken run) to the current snapshot's timestamp.
- **Reset event** — a snapshot-over-snapshot balance decrease exceeding the **dust tolerance** (§3.3).
- **Multiplier** — the loyalty factor applied to a wallet's balance when computing distribution shares (§2).
- **Weight** — `balance × multiplier`, the wallet's actual share numerator.

## 2. Multiplier curve

Step function, evaluated at each snapshot from the wallet's streak:

```
streak <  14 days  → 1.00×
streak >= 14 days  → 1.25×
streak >= 30 days  → 1.50×
streak >= 90 days  → 2.00×
```

- Integer math in implementation: multipliers are expressed in basis points (10000 / 12500 / 15000 / 20000) to keep all allocation math in integers (§4).
- The curve is a **parameter set**, not a constant: tiers and values ship as configuration so governance can tune them without code changes. The values above are the launch proposal.
- Rationale for a step curve over a continuous one: legible to holders ("I hit 30 days, I'm at 1.5×"), trivially explainable by the dashboard and by Pip, and immune to timestamp-precision gaming at tier boundaries (you either held through the snapshot or you didn't).

## 3. Streak rules

### 3.1 Establishment
A wallet's streak begins at the first snapshot in which it appears with an eligible balance. First-seen wallets are at 1.00× — there is no retroactive credit for holding before the wallet's first snapshot appearance, **except** at launch (§6: genesis backfill).

### 3.2 Continuation
At each snapshot, a wallet continues its streak if `balance_now >= balance_prev − dust_tolerance`. Balance **increases never reset** — adding to your hoard is always safe, and the added tokens inherit the wallet's existing streak (no FIFO lot tracking; the wallet is the unit of loyalty, not the token).

### 3.3 Reset (the dust tolerance)
A wallet resets to 1.00× (streak anchor = current snapshot) when:

```
balance_now < balance_prev × (1 − DUST_BPS/10000)      DUST_BPS = 50 (0.5%)
```

The 0.5% tolerance exists for mechanical dust: rounding from wallet migrations, token-2022 fee quirks, integrations that shave microamounts. It is deliberately too small to be a useful exit valve (selling 0.5% per ~week ≈ 2%/month is not meaningful profit-taking).

**Explicitly rejected alternative — proportional decay** (sell 20% → lose 20% of streak): more "fair," but it converts the streak into a continuous quantity that is harder to display honestly, harder for holders to reason about, and easier to game at the margins. Binary reset with a dust floor is legible: *the hoard is intact or it is broken*.

### 3.4 Missed snapshots
A wallet that drops below the eligibility minimum (or to zero) and later returns has, by definition, had a reset event. Streaks never survive absence.

### 3.5 What cannot break a streak
- Balance increases of any size
- Using $MAGPIE as loan collateral (collateralized balance counts per §1)
- Receiving distribution payouts (SOL, doesn't touch token balance)
- The wallet's tokens sitting completely still

## 4. Allocation math

For snapshot *S* with pool *P* (lamports) and eligible set *W*:

```
weight(w)  = balance(w) × multiplier_bps(w)          — integer, bps-scaled
total      = Σ weight(w) for w ∈ W
raw(w)     = P × weight(w) / total                    — integer floor division
```

Floor division leaves a remainder `P − Σ raw(w)`; distribute it by **largest remainder** (one lamport each to the wallets with the largest fractional parts) so that `Σ alloc(w) = P` **exactly**. This is the same rounding discipline the current allocator uses; The Hoard only changes the numerator from `balance` to `weight`.

**Invariants (must hold, machine-checked in the reference implementation):**
1. `Σ alloc(w) = P` — the pool is fully allocated, never over- or under-spent.
2. If all multipliers are equal, allocations are identical to today's pro-rata split (backwards-compatibility degenerate case).
3. `alloc(w)` is monotone in `balance(w)` within a tier, and monotone in tier at equal balance.
4. No wallet's allocation exceeds `P`.

## 5. Eligibility interplay (unchanged systems)

- **Minimum balance / exclusion lists** — unchanged; The Hoard weights the eligible set, it does not redefine it.
- **Rent-exempt floor** — unchanged; sub-minimum payouts to empty accounts are marked unpayable exactly as today. (Secondary benefit: by shifting share toward long-tenured — typically funded — wallets, The Hoard should *reduce* the unpayable count.)
- **Borrower credit** — unchanged (§1: collateralized balances count and continue streaks).

## 6. Genesis backfill

At launch, streaks are **reconstructed from the full archived snapshot history** (every snapshot since distribution #2, plus the genesis distribution record) by replaying §3 rules over each wallet's balance sequence. A wallet that has held unbroken since June launches with its entire streak intact — likely at 2.00× on day one. Early loyalty is grandfathered in full; nobody starts from zero except wallets that actually sold.

Backfill output is a deterministic function of the archived snapshots. The reference implementation includes the replay algorithm; anyone can verify their launch multiplier from public chain data.

## 7. Transparency requirements (launch gates)

The Hoard does not go live until all of these exist:

1. **Per-wallet visibility**: dashboard shows streak, current multiplier, and the date of the next tier — before the first weighted distribution runs.
2. **Advance notice**: at least one full distribution cycle between announcement and the first weighted cycle, so nobody is surprised by changed shares.
3. **Simulation publication**: the projected share-shift of the first weighted cycle (aggregate, no individual wallets) published in this repo.
4. **Pip fluency**: the community agent can answer "what's my multiplier / when's my next tier / what resets it" from live data.
5. **Docs parity**: the whitepaper/docs describe the exact §2–§4 mechanics — full detail, honesty qualifiers intact.

## 8. Parameters (launch proposal, governance-tunable)

| Parameter | Value | Notes |
|---|---|---|
| `TIER_DAYS` | [0, 14, 30, 90] | step thresholds |
| `TIER_BPS` | [10000, 12500, 15000, 20000] | 1.0× / 1.25× / 1.5× / 2.0× |
| `DUST_BPS` | 50 | 0.5% snapshot-over-snapshot decrease tolerated |
| Snapshot cadence | unchanged | ~7–10 days, existing scheduler |
| Pool source | unchanged | existing holder-rewards fee share |
