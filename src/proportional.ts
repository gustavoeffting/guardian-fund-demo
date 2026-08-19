import { netDepositsUsd } from './eligibility.js';
import { calculateRemediations } from './remediation.js';
import type { RemediationResult } from './remediation.js';
import type { ChainFund, ChainId, User } from './types.js';

/** Remediation outcome for one chain's Guardian Fund allocation. */
export interface ChainRemediation {
  chainId: ChainId;
  /** G: the fund available for this chain, in USD. */
  guardianFundBalanceUsd: number;
  /** U: sum of net deposits of this chain's eligible users, in USD. */
  totalEligibleNetDepositsUsd: number;
  /**
   * Share of each user's net loss actually paid: MIN(G / U, 1).
   * 1 when the fund fully covers the losses (or there are no losses at all),
   * below 1 when payouts are scaled down proportionally.
   */
  coverageRatio: number;
  results: RemediationResult[];
}

/**
 * Distributes each chain's Guardian Fund allocation among that chain's
 * eligible users.
 *
 * Allocations are strictly per chain — a surplus on one chain never tops up a
 * shortfall on another, mirroring how the funds were held on-chain. For the
 * same reason, users on a chain without a fund entry receive nothing.
 *
 * Callers must pass already-eligible users (see `filterEligibleUsers`); the
 * proportional math inherits that requirement from `calculateRemediations`.
 */
export function distributeAcrossChains(
  eligibleUsers: User[],
  chainFunds: ChainFund[]
): ChainRemediation[] {
  return chainFunds.map((fund) => {
    const chainUsers = eligibleUsers.filter(
      (user) => user.chainId === fund.chainId
    );
    const totalEligibleNetDepositsUsd = chainUsers.reduce(
      (sum, user) => sum + netDepositsUsd(user),
      0
    );

    return {
      chainId: fund.chainId,
      guardianFundBalanceUsd: fund.guardianFundBalanceUsd,
      totalEligibleNetDepositsUsd,
      // No losses on the chain → vacuously fully covered.
      coverageRatio:
        totalEligibleNetDepositsUsd > 0
          ? Math.min(
              fund.guardianFundBalanceUsd / totalEligibleNetDepositsUsd,
              1
            )
          : 1,
      results: calculateRemediations(chainUsers, fund.guardianFundBalanceUsd),
    };
  });
}
