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

## 8. Audit-standard hardening (Sec3-derived)

Magpie's lending programs went through a full independent audit by Sec3, and every recommendation was implemented. The Hoard is a different kind of system — off-chain, no custody — but **it inherits the same standard**: we walked the audit's finding *classes* and mapped each applicable one onto this design, with an executable adversarial test vector for every mapping (`reference/test.js`, "adv:" vectors).

| Audit finding class (from the lending audit) | The Hoard analogue | Control | Test vector |
|---|---|---|---|
| Trusting *claimed* amounts over *measured* state (H-class) | streaks/weights derived from inferred rather than actual balances | streaks derive **only** from measured snapshot balances (the same pipeline that already pays 9 cycles); no self-reported input exists anywhere | design-level (no input surface) |
| Time-source manipulation — clustered/replayed samples satisfying a time gate (L-class) | replayed or reordered snapshots double-advancing streaks | replay is **idempotent** (duplicate snapshot = no-op) and **order-enforced** (non-chronological history throws); streak time derives solely from the snapshot sequence — no wall-clock input to spoof | `adv: duplicate snapshot`, `adv: non-chronological` |
| Arithmetic overflow (u64-class) | whale balances × bps-scaled multipliers × pool overflowing fixed-width math | arbitrary-precision integers end-to-end in the spec; production storage requirement: unbounded numeric columns, never 64-bit | `adv: whale-scale` (~10¹⁸ balance) |
| Rounding/dust exploitation — fees rounding to zero, dust leaking value (L-class) | allocation rounding creating or destroying lamports, or systematically shorting small holders | largest-remainder allocation with the machine-checked conservation invariant Σ alloc = pool, **exactly**, always | `adv: 200-trial fuzz`, invariant 1 |
| Poisoned degenerate state — empty pool with live shares stealing deposits (L-class) | empty eligible sets or all-zero balances producing ghost claims | degenerate cases allocate exactly zero; nothing is claimable from an empty state | `adv: empty eligible set`, `adv: all-zero` |
| Unbound accounts — cross-pool substitution (L-class) | streak state detached from its canonical history | streak table is *derived* state, rebuildable only from the canonical snapshot archive; any dispute → deterministic replay from source | `§6 determinism` |
| Unsafe parameter changes (Q/I-class) | governance tuning the curve into an unfair or exploitable shape | `validateParams` hard-rejects: base below 1.00× (would silently tax new holders), non-monotone tiers (longer loyalty earning less), missing day-0 tier, dust tolerance above 2% (real exit valve). Parameter changes take effect only at the **next** snapshot — never retroactively rewriting an anchor | `adv: every unsafe param set` |
| First-exit / timing advantage (L-class) | mid-cycle multiplier games | step function evaluated **at the snapshot**: there is no intra-cycle state to game, and snapshot times are unannounced (§3) | design-level |

**Fairness is part of the threat model.** A curve that quietly taxes newcomers, a rounding scheme that shorts small wallets, or a governance change that retroactively rewrites streaks are treated as exploits here, not policy choices — which is why they are *structurally rejected* by validation and invariants rather than left to good intentions.

Before any implementation phase begins, this mapping gets re-walked against the then-current audit findings list — the standard is standing, not one-time.

## Reporting

Think we missed a vector? Open an issue in this repo. The design phase exists precisely so this analysis gets adversarial review before anything ships.
