/**
 * Domain types for the Guardian Fund eligibility & remediation calculation.
 *
 * All monetary values are expressed in USD as plain numbers. In the real system
 * these came from the subgraph already normalized to USD at the snapshot block,
 * so no on-the-fly price conversion happens in this codebase.
 */

/** Chains the protocol is deployed on. Each has its own Guardian Fund allocation. */
export type ChainId = 'arbitrum' | 'ethereum' | 'bsc';

/** A single deposit position (one asset) held by a user on a chain. */
export interface Deposit {
  userId: string;
  chainId: ChainId;
  /** Asset symbol, e.g. "USDC", "WETH". */
  asset: string;
  /** Deposited value in USD at the snapshot. */
  amountUsd: number;
}

/** A single borrow position (one asset) held by a user on a chain. */
export interface Borrow {
  userId: string;
  chainId: ChainId;
  /** Asset symbol, e.g. "USDC", "WETH". */
  asset: string;
  /** Borrowed value in USD at the snapshot. */
  amountUsd: number;
}

/** A protocol user with their positions and dLP stake on a given chain. */
export interface User {
  id: string;
  chainId: ChainId;
  deposits: Deposit[];
  borrows: Borrow[];
  /** USD value of the user's staked dLP (Dynamic Liquidity Pool) position. */
  dlpStakedValueUsd: number;
}

/** Guardian Fund allocation for a single chain. */
export interface ChainFund {
  chainId: ChainId;
  /** Total funds available for remediation on this chain, in USD. */
  guardianFundBalanceUsd: number;
}
