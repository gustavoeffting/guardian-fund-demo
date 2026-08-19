# Guardian Fund Eligibility & Remediation — Demo Project

## About this project

This is a **technical demonstration project**, built for a job interview process, recreating
the core of a real challenge I worked on as a senior developer at Radiant Capital (a DeFi
lending protocol): calculating user eligibility and remediation amounts for a protection
mechanism called the Guardian Fund.

**Important:** this code is NOT Radiant Capital's original code (proprietary/confidential). It
is a from-scratch recreation of the same technical problem and business logic, built for
technical evaluation purposes.

## Domain context

- Users who keep a minimum share of their deposited value staked as dLP (Dynamic Liquidity
  Pool) are eligible to receive remediation from a protection fund (Guardian Fund) in case of
  risk events (exploit, oracle failure, bad debt, etc).
- Each eligible user's remediation amount is calculated with the formula:

  ```
  C = MIN((N / U) * G, N)
  ```

  - `N` = the user's net deposits (deposits - borrows), in USD
  - `U` = the sum of net deposits of all eligible users, in USD
  - `G` = total funds available in the Guardian Fund, in USD
  - `C` = the user's remediation amount

- Each chain (e.g. Arbitrum, Ethereum) has its own fund allocation. When total eligible net
  deposits for a chain exceed the fund available for it, remediation is paid out
  proportionally.

## Stack

- TypeScript (Node.js)
- Vitest for testing
- No external framework — pure functions, easy to test and audit

## Expected structure

```
src/
  types.ts           # domain types (User, Deposit, Borrow, ChainFund, etc)
  eligibility.ts      # eligibility logic (dLP threshold)
  remediation.ts        # remediation calculation (C = MIN((N/U)*G, N))
  proportional.ts        # proportional distribution per chain when the fund doesn't cover 100%
  mocks/                   # simulated on-chain data (stand-in for the real subgraph)
tests/
  eligibility.test.ts
  remediation.test.ts
  proportional.test.ts
```

## Conventions

- Prefer pure functions — no direct I/O in calculation logic, to keep everything easily
  testable.
- Use domain-aligned variable names (netDeposits, dlpPercentage, guardianFundBalance) — avoid
  generic abbreviations.
- Any non-obvious business logic decision should have a short comment explaining the "why".

## Commands

- `npm install`
- `npm test` — run the test suite
- `npm run build` — compile TypeScript

## Runtime requirements (important)

This project must run 100% offline, with no API keys, environment variables, or database — all
data is mocked under `src/mocks/`. This is intentional: whoever evaluates this repository should
be able to clone it and run `npm install && npm test` with zero additional setup.

- Pin the Node version via `engines` in `package.json` and/or a `.nvmrc` file.
- Name tests descriptively (e.g. "user below the 15% dLP threshold is not eligible") so they're
  readable by someone unfamiliar with the implementation.
- Do not make any real network calls (not even mocked fetches) — input data already comes ready
  from the mocks.