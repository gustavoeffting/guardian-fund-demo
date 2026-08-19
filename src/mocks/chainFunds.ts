import type { ChainFund } from '../types.js';

/**
 * Simulated Guardian Fund allocations per chain.
 *
 * Sized against the mock users' eligible net deposits to exercise both
 * regimes: arbitrum's fund (5,000) covers only 40% of its eligible losses
 * (12,500), while ethereum's fund (50,000) fully covers frank's 40,000.
 */
export const mockChainFunds: ChainFund[] = [
  { chainId: 'arbitrum', guardianFundBalanceUsd: 5_000 },
  { chainId: 'ethereum', guardianFundBalanceUsd: 50_000 },
];
