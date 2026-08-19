# Guardian Fund — Eligibility & Remediation Demo

A technical demonstration project recreating the core of a real challenge I worked on as a
senior developer at Radiant Capital (a DeFi lending protocol): calculating user eligibility
and remediation amounts for a protection mechanism called the Guardian Fund.

> **Important:** this is **not** Radiant Capital's original code, which is proprietary and
> confidential. It is a from-scratch recreation of the same technical problem and business
> logic, built for technical evaluation purposes. All data is mocked; nothing here touches a
> real chain, subgraph, or user.

## The domain problem

Users who keep a minimum share of their deposited value staked as **dLP** (Dynamic Liquidity
Pool) are eligible to receive remediation from a protection fund — the Guardian Fund — in
case of risk events (exploit, oracle failure, bad debt, etc). The calculation has three
stages, each a module of pure functions:

1. **Eligibility** (`src/eligibility.ts`) — a user qualifies when their staked dLP value is
   at least a threshold share of their total deposited value. The threshold is
   parametrizable and defaults to **15%**.

2. **Remediation** (`src/remediation.ts`) — each eligible user's payout is:

   ```
   C = MIN((N / U) * G, N)
   ```

   - `N` — the user's net deposits (deposits − borrows), in USD
   - `U` — the sum of net deposits of all eligible users, in USD
   - `G` — total funds available in the Guardian Fund, in USD
   - `C` — the user's remediation amount

   The `MIN` cap means nobody is paid more than they lost: when the fund exceeds total
   eligible losses, everyone is made whole and the surplus stays in the fund.

3. **Per-chain proportional distribution** (`src/proportional.ts`) — each chain (Arbitrum,
   Ethereum, …) has its own fund allocation. When a chain's eligible net deposits exceed its
   fund, payouts scale down proportionally (everyone receives the same coverage ratio
   `G / U`). Allocations are strictly per chain: a surplus on one chain never tops up a
   shortfall on another.

## Running it

The project runs 100% offline — no API keys, environment variables, database, or network
calls. Input data is mocked under `src/mocks/`, standing in for the real subgraph. Requires
Node ≥ 22 (pinned via `engines` and `.nvmrc`).

```bash
npm install
npm test     # 35 unit tests across the three modules
npm start    # end-to-end demo: mocks -> eligibility -> per-chain distribution -> summary
```

`npm start` compiles and runs `src/index.ts`, the only module with I/O, printing each
chain's fund balance, eligible net deposits, coverage ratio, and every user's
net-deposits → remediation line.

## Design notes

### Eligibility edge cases

- **The 15% boundary is inclusive.** Users target the exact threshold to minimize locked
  capital, so an exclusive comparison would disqualify precisely the users following the
  rule. A user staking exactly 15% is eligible, and a test pins that.
- **Zero deposits means not eligible**, even with dLP staked. dLP coverage is undefined for
  them (0/0), and with no deposits there is no loss to remediate. Relatedly, net deposits
  are floored at zero: a user who borrowed more than they deposited can still be
  dLP-eligible, but nets to `N = 0` and receives nothing — and a negative `N` would corrupt
  the pool total `U` for everyone else.

### Floating-point precision

The first run of the remediation tests caught a real IEEE-754 artifact:
`(3500 / 12500) * 5000` evaluates to `1400.0000000000002`, not `1400`. The proportional
tests therefore assert with `toBeCloseTo` rather than exact equality, and the
"total paid never exceeds the fund" test tolerates ULP-level slack (~1e-10 USD). The demo
deliberately keeps raw float math; a production payout pipeline would work in integer cents
with largest-remainder allocation so per-user rounding can never over-spend the fund.

### The `guardian-calc-reviewer` audit

This repo defines a Claude Code subagent (`.claude/agents/guardian-calc-reviewer.md`) whose
job is auditing the financial logic: formula correctness against `C = MIN((N/U)*G, N)`,
edge-case handling, rounding/floating-point risks, and financial invariants (total paid per
chain ≤ `G`, no payout above `N`, no negative payouts, proportional scaling preserves
ordering). It verifies numeric claims empirically with `node -e` instead of asserting from
memory.

Its audit of the three calculation modules found **two real bugs, both fixed** (with
pinning tests):

1. `distributeAcrossChains` paid a chain's users once per `ChainFund` entry, so a
   duplicated `chainId` — type-valid input — silently doubled payouts. It now throws on
   duplicate entries.
2. A negative fund balance produced negative "payouts" (a clawback) and a negative coverage
   ratio. Both are now floored at zero, so corrupt inputs degrade to "no payout".

Three findings were **accepted as informational** for a demo with well-formed whole-dollar
mocks: the inclusive 15% boundary can flip on adversarial float sums (fixable with integer
cents or an epsilon comparison), payout totals can exceed `G` by ULP-level noise (worst
case observed: 2.3e-10 USD across 200k random trials), and NaN monetary inputs propagate
silently (a validation pass at the ingest boundary would close it).

## How this repo was built

This repository was built with **Claude Code** in an agentic, iterative workflow — not
generated in one shot. The work proceeded in reviewed slices, each committed separately:
project scaffolding and eligibility, the remediation formula, per-chain distribution, the
runnable demo, and finally a custom review subagent that audited the finished logic and
whose findings were triaged and fixed. The commit history on `feature/eligibility-core`
shows the progression, including a test failure caught and fixed mid-flight (the
floating-point artifact above) and the audit-driven hardening commit.

## Project structure

```
src/
  types.ts           # domain types (User, Deposit, Borrow, ChainFund)
  eligibility.ts     # dLP threshold logic (parametrizable, default 15%)
  remediation.ts     # C = MIN((N/U)*G, N)
  proportional.ts    # per-chain distribution + coverage ratio
  index.ts           # runnable end-to-end demo (the only module with I/O)
  mocks/             # simulated on-chain data (stand-in for the real subgraph)
tests/
  eligibility.test.ts
  remediation.test.ts
  proportional.test.ts
.claude/agents/
  guardian-calc-reviewer.md   # financial-logic audit subagent
```
