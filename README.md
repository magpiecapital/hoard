# 💎 The Hoard

**Loyalty-weighted rewards for $MAGPIE holders. No lockups. No vaults. Your tokens never leave your wallet.**

> **Status: DESIGN PHASE.** The Hoard is a proposed upgrade to Magpie's holder-rewards system. Nothing described here is live yet. This repository is the public specification — we design in the open so holders can scrutinize the mechanics before a single lamport moves differently.

---

## The idea in one paragraph

Magpie already distributes a share of protocol fees to $MAGPIE holders, pro-rata by balance, cycle after cycle ([9 distributions and counting](https://www.magpie.capital/distributions)). The Hoard adds one variable to that math: **time**. Magpies hoard treasure — and holders who keep their hoard intact earn a growing multiplier on their share of every distribution. Sell, and the hoard breaks: back to base. That's it. No staking contract, no lockup, no custody, no new on-chain program. Your $MAGPIE stays in your wallet the entire time.

## The multiplier curve (proposed)

| Unbroken holding streak | Hoard multiplier |
|---|---|
| Day 0 (base) | **1.00×** |
| 14 days | **1.25×** |
| 30 days | **1.50×** |
| 90 days | **2.00×** |

Your share of a distribution = `your balance × your multiplier`, divided by the sum of everyone's weighted balances. The fee pool is unchanged — The Hoard redistributes the **same pool** toward loyalty. Sellers subsidize holders.

## Why no staking contract?

Because every lockup vault is attack surface, and Magpie's first law is that user funds are never put at risk. A traditional staking program means audits, custody, upgrade keys, and a honeypot. The Hoard achieves the same economic behavior — rewarding conviction — with **zero new on-chain surface**: streaks are computed from the same balance snapshots that already drive distributions, verifiable by anyone from public chain data.

| | Lockup staking | The Hoard |
|---|---|---|
| Custody of your tokens | the contract | **you, always** |
| New audited program needed | yes | **no** |
| Can be rugged/exploited | new surface | **no new surface** |
| Rewards conviction | yes | **yes** |
| Exit penalty | unlock periods | none — just resets your streak |

## Documents

- **[SPEC.md](./SPEC.md)** — the full mechanics: streak definition, weighting math, rounding, edge cases
- **[PRECEDENTS.md](./PRECEDENTS.md)** — what the best staking programs (and the worst failures) taught us; every practice adopted, adapted, or rejected with rationale
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — how it integrates with the live rewards pipeline, phased rollout plan
- **[SECURITY.md](./SECURITY.md)** — threat model: gaming vectors and mitigations
- **[reference/](./reference)** — standalone reference implementation of the streak engine (pure JS, no dependencies) with test vectors

## Honest disclosures

- The Hoard changes **relative** shares, not the pool size. If everyone holds 90+ days, everyone is at 2.00× and shares are identical to today's pro-rata split.
- Multiplier tiers, thresholds, and reset rules are **proposals** and may change before launch based on holder feedback and simulation results.
- Nothing in this repository is financial advice, an offer, or a promise of returns. Distribution amounts depend entirely on protocol fee revenue.

---

*Built by [Magpie](https://www.magpie.capital) — permissionless lending on Solana. Three collateral classes, one protocol.*
