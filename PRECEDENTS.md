# The Hoard — Precedent Study: What the Best Staking Programs Got Right

The Hoard was not designed in a vacuum. This document surveys the most successful (and most instructively failed) staking and loyalty-weighting programs in crypto, extracts the practice that made each work, and states — explicitly — whether The Hoard **adopts**, **adapts**, or **rejects** it, and why. Survey reflects the landscape as of early 2026.

---

## 1. Cardano — the no-lockup precedent

**What it is:** ADA staking has no lockup, no unbonding period, no slashing for delegators. Tokens never leave the holder's wallet; rewards accrue every epoch (~5 days).

**Why it matters:** it produced one of the highest sustained staking-participation rates in the industry (~60%+ of supply for years) — evidence that **removing exit friction increases, not decreases, long-term participation**. People commit more when they aren't trapped.

**The Hoard: ✅ ADOPTS as the foundation.** No custody, no lockup, no unbonding — holding *is* staking. Cardano proved the model at scale; The Hoard adds the loyalty curve Cardano lacks (ADA pays the mercenary and the faithful identically).

## 2. Curve (veCRV) — the loyalty-boost precedent

**What it is:** vote-escrowed CRV — lock up to 4 years for up to 2.5× reward boost and governance weight. The most-forked loyalty design in DeFi.

**What it got right:** the **capped boost ratio**. 2.5× is large enough to matter, small enough that newcomers aren't structurally excluded. Systems with unbounded boosts collapse into oligarchy; Curve's cap kept new entrants viable for years.

**What it got wrong:** the lock itself — illiquid positions, a secondary industry (Convex) built purely to escape the lockup, and wars over bribed governance. When your design spawns an escape-hatch industry, the design is fighting its users.

**The Hoard: ✅ ADOPTS the capped boost (2.0×, even more newcomer-friendly than Curve's 2.5×), ❌ REJECTS the lock.** Time-held replaces time-locked: the same conviction signal, without the hostage-taking. **🔄 ADAPTS (future, governance-gated):** veCRV's second insight — loyalty should weight *governance*, not just rewards — is a natural Phase-4+ extension: Hoard multipliers weighting MGP votes. Flagged as a future proposal, not in scope for v0.1.

## 3. GMX — the real-yield and multiplier-point precedent

**What it is:** staked GMX earns a share of **actual protocol fees** (the "real yield" standard-bearer) plus Multiplier Points that accrue with staking time and **burn proportionally on unstake**.

**What it got right:** paying real revenue, not printed emissions — GMX outlived the entire emissions-farm era because its yield was real. And its MP system proved holders respond strongly to *visible, accruing* loyalty state.

**Where The Hoard differs:** GMX burns loyalty **proportionally** on exit (sell 20% → lose 20% of MPs). The Hoard uses **binary reset with a dust floor** instead (SPEC §3.3, rejected-alternatives note). Rationale: proportional decay turns the streak into a continuous quantity that invites margin-gaming and is hard to display honestly; binary reset is legible — *the hoard is intact or it is broken*. We consider this a deliberate simplification of GMX's design, not an oversight; if holder feedback in the design phase strongly favors proportional decay, SPEC §3.3 documents exactly what would change.

**The Hoard: ✅ ADOPTS real-yield-only (the pool is 100% protocol fees, zero emissions), 🔄 ADAPTS the loyalty-accrual idea, with binary reset instead of proportional burn.**

## 4. Solana native staking — the boundary-activation precedent

**What it is:** stake activates and deactivates only at **epoch boundaries** — no intra-epoch state changes, no timing games around activation.

**What it got right:** discrete boundaries make the system auditable and kill an entire class of just-in-time gaming. You were staked for the epoch or you weren't.

**The Hoard: ✅ ADOPTS.** Multipliers change only at snapshot boundaries (SPEC §2); there is no intra-cycle state to game, and snapshot times are unannounced (SECURITY §3). Same principle, same benefit.

## 5. Aave Safety Module — the exit-friction cautionary precedent

**What it is:** stkAAVE with a 20-day cooldown and slashing exposure, in exchange for acting as protocol backstop.

**The lesson for us:** cooldowns and slashing are justified **only when stakers underwrite risk**. Hoard participants underwrite nothing — their tokens secure nothing and back no liabilities — so importing exit friction would be friction without function. This is why The Hoard's only "penalty" is the streak reset: you lose the *bonus*, never your principal, never your liquidity.

**The Hoard: ❌ REJECTS cooldowns/slashing, with the Aave criterion as the test:** no underwriting → no exit friction.

## 6. Exchange/perp tier programs (the legibility precedent)

**What they are:** the tiered fee-discount programs run by the major trading venues — hold/stake X, get tier Y, see exactly what tier Z requires.

**What they got right:** **legibility drives behavior.** Users demonstrably move assets to hit visible tier thresholds with clear progress bars. Complex formulas don't change behavior; visible next-tier targets do.

**The Hoard: ✅ ADOPTS** — the four-tier step curve (not a smooth formula) exists precisely for this, and Phase 2 ships "surfaces before stakes": every holder sees streak, multiplier, and next-tier date **before** the first weighted cycle (ARCHITECTURE Phase 2, SPEC §7 gate 1). The dashboard progress-to-next-tier card is a launch requirement, not a nice-to-have.

## 7. OlympusDAO — the failure precedent

**What it was:** (3,3) rebase staking — four-digit APYs paid in token emissions, marketed as staking yield.

**Why it matters:** the definitive proof that **emissions-funded "staking yield" is a death spiral wearing a party hat.** When yield is printed rather than earned, staking becomes a game of who exits first, and the loyalty framing inverts into a trap for the last honest holder.

**The Hoard: structurally immune, by three properties it would take governance malice to remove:** (1) the pool is fee revenue only — if the protocol earns nothing, The Hoard pays nothing, honestly; (2) multipliers redistribute the pool, they never mint claims (Σ allocations = pool, machine-checked); (3) the README states outright that if everyone reaches 2.0×, shares equal today's pro-rata — The Hoard promises *relative* advantage for loyalty, never absolute yield. The disclosure discipline is the practice being adopted: Olympus failed its holders with framing before it failed them with math.

## 8. Liquid-staking transparency (Lido/Rocket Pool/Jito lineage)

**What they got right:** relentless public stats — participation rates, distribution histories, everything auditable by anyone at any time.

**The Hoard: ✅ ADOPTS.** Aggregate tier distribution becomes a public stat (SPEC §7 gate 3 publishes the pre-launch simulation; ARCHITECTURE Phase 2 puts the tier chart on public stats). Magpie already publishes every distribution with on-chain signatures; The Hoard extends that ledger with the multiplier context per cycle.

---

## Summary table

| Practice | Source | The Hoard |
|---|---|---|
| No lockup, no custody, liquid always | Cardano | ✅ foundation |
| Capped loyalty boost | Curve (2.5×) | ✅ adopted at 2.0× |
| Vote-escrow locks | Curve | ❌ rejected — time-held replaces time-locked |
| Real yield only, zero emissions | GMX | ✅ adopted |
| Accruing, visible loyalty state | GMX MPs | 🔄 adapted (binary reset, not proportional burn) |
| Boundary-only activation | Solana epochs | ✅ adopted (snapshot boundaries) |
| Cooldowns / slashing | Aave SM | ❌ rejected — no underwriting, no exit friction |
| Legible tiers + progress UI | exchange tier programs | ✅ adopted (launch gate) |
| Emissions-funded APY | OlympusDAO | ❌ structurally impossible here |
| Radical public stats | liquid-staking lineage | ✅ adopted |
| Loyalty-weighted governance | veCRV | 🔄 future proposal, governance-gated |

**The synthesis:** The Hoard is Cardano's liquidity + Curve's capped boost + GMX's real yield + Solana's boundary discipline + exchange-tier legibility — minus every mechanism (locks, cooldowns, emissions, unbounded boosts) that history shows eventually turns a loyalty program against its own users.
