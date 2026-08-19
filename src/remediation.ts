import { netDepositsUsd } from './eligibility.js';
import type { User } from './types.js';

/** Remediation outcome for a single eligible user. */
export interface RemediationResult {
  userId: string;
  /** N: the user's net deposits (deposits - borrows), in USD. */
  netDepositsUsd: number;
  /** C: the amount the user receives from the Guardian Fund, in USD. */
  remediationUsd: number;
}

/**
 * Remediation formula for one user: C = MIN((N / U) * G, N).
 *
 * - `N`: the user's net deposits, in USD
 * - `U`: sum of net deposits of all eligible users, in USD
 * - `G`: total funds available in the Guardian Fund, in USD
 *
 * The MIN cap means nobody is paid more than they lost: when the fund exceeds
 * total eligible net deposits (G > U), each user receives exactly N and the
 * surplus stays in the fund. When U = 0 there are no losses to remediate, so
 * the payout is 0 (this also guards the division by zero).
 */
export function remediationAmountUsd(
  userNetDepositsUsd: number,
  totalEligibleNetDepositsUsd: number,
  guardianFundBalanceUsd: number
): number {
  if (totalEligibleNetDepositsUsd === 0) {
    return 0;
  }
  const proportionalShareUsd =
    (userNetDepositsUsd / totalEligibleNetDepositsUsd) * guardianFundBalanceUsd;
  return Math.min(proportionalShareUsd, userNetDepositsUsd);
}

/**
 * Applies the remediation formula to a set of already-eligible users sharing
 * one Guardian Fund allocation (per-chain grouping happens in a later step).
 *
 * `U` is computed from the users passed in, so callers must filter for
 * eligibility first (see `filterEligibleUsers`) — including ineligible users
 * here would dilute everyone's share.
 */
export function calculateRemediations(
  eligibleUsers: User[],
  guardianFundBalanceUsd: number
): RemediationResult[] {
  const totalEligibleNetDepositsUsd = eligibleUsers.reduce(
    (sum, user) => sum + netDepositsUsd(user),
    0
  );

  return eligibleUsers.map((user) => {
    const userNetDepositsUsd = netDepositsUsd(user);
    return {
      userId: user.id,
      netDepositsUsd: userNetDepositsUsd,
      remediationUsd: remediationAmountUsd(
        userNetDepositsUsd,
        totalEligibleNetDepositsUsd,
        guardianFundBalanceUsd
      ),
    };
  });
}
