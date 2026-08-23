# The Hoard — Threat Model

The Hoard moves no funds and adds no on-chain surface, so the threat model is about **gaming the weighting**, not stealing assets. Every vector below is analyzed against the SPEC v0.1 rules.

## 1. Wallet splitting (Sybil)

**Attack:** split one hoard across N wallets to… do what, exactly?

**Analysis: not profitable.** The multiplier applies to balance × time, and both are conserved under splitting: two wallets of 500k tokens at 1.5× earn exactly what one wallet of 1M at 1.5× earns. Splitting only *risks* streaks (each transfer out is a reset event for the source wallet if it exceeds dust tolerance) and burns fees. There is no minimum-balance bonus to farm and no per-wallet flat component. **Verdict: self-defeating; no mitigation needed beyond the existing eligibility minimum.**

## 2. The pre-snapshot hop (wash transfer)

**Attack:** move tokens to a fresh wallet and back, or between own wallets, expecting streaks to follow.

**Analysis: punished by design.** Streaks are wallet-scoped (SPEC §3.2 — "the wallet is the unit of loyalty"). Tokens arriving at a wallet inherit *that wallet's* streak; the source wallet's outbound transfer is a reset event. Moving your hoard anywhere resets you to 1.00×. **Verdict: the attack is indistinguishable from selling, and priced identically.**

*Accepted cost:* legitimate wallet migrations (e.g., to a new hardware wallet) also reset. This is deliberate — any migration-forgiveness mechanism (signed attestations, support tickets) becomes the gaming vector. Holders migrate rarely; the curve rebuilds in 90 days.

## 3. Snapshot-timing games

**Attack:** sell right after a snapshot, rebuy right before the next one — hold the multiplier while being out of the token most of the cycle.

**Analysis: partially effective for one cycle, then fatal.** The rebuy must restore ≥ 99.5% of the prior balance or the *next* snapshot registers a reset. So the attacker holds full price exposure at every snapshot boundary while paying two spreads + fees per cycle, to skim at most one cycle's in-between time. And because snapshot timing is **not pre-announced** (the existing scheduler already randomizes within a window, and the operator can trigger ad hoc), the boundary is not reliably knowable. **Mitigation already in place: keep snapshot times unannounced. Verdict: negative expected value for the attacker.**

## 4. Dust-tolerance farming

**Attack:** sell exactly 0.49% every cycle, forever, keeping the streak.

**Analysis: bounded and tolerable.** ~0.5% per ~week-to-10-days ≈ 2%/month exit rate while maintaining multiplier. This is the designed cost of having a dust floor at all; it is too slow to be an exit strategy and the forfeited price exposure dwarfs the multiplier benefit. **Verdict: acceptable; revisit DUST_BPS if observed in the wild.**

## 5. Borrow-loop laundering

**Attack:** use $MAGPIE as loan collateral, get liquidated on purpose, effectively "selling" via liquidation while the snapshot still counts collateralized balance.

**Analysis:** a liquidation removes the collateral from the wallet's counted balance at the next snapshot → reset event, exactly like a sale. The borrower paid liquidation penalties for the privilege. **Verdict: no advantage.**

## 6. Data-layer integrity

The streak table is derived state, rebuildable from archived snapshots (SPEC §6 backfill is the same algorithm as ongoing updates). Corruption or dispute → recompute from source. Snapshots themselves are the existing, already-audited-in-practice pipeline (9 distributions, every payout signed on-chain). **The Hoard adds no new write path to balances or payouts — it only changes one numerator in the allocator.**

## 7. What The Hoard deliberately does NOT touch

- No new on-chain program, no custody, no token approvals, no signatures requested from holders — **there is nothing to phish**. Any site asking you to "stake" or "approve" $MAGPIE for The Hoard is a scam by definition; the real mechanism never asks for anything.
- No changes to pool funding, payout rails, rent-exempt handling, or eligibility.
- No oracle dependency: streaks derive from token balances alone.

## Reporting

Think we missed a vector? Open an issue in this repo. The design phase exists precisely so this analysis gets adversarial review before anything ships.
