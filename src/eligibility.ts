import type { User } from './types.js';

/**
 * Minimum share of a user's deposited value that must be staked as dLP for the
 * user to qualify for Guardian Fund remediation. 15% mirrors the protocol's
 * emission-eligibility rule, so users already familiar with it face no new bar.
 */
export const DEFAULT_DLP_THRESHOLD = 0.15;

/** Sum of the user's deposit positions, in USD. */
export function totalDepositsUsd(user: User): number {
  return user.deposits.reduce((sum, deposit) => sum + deposit.amountUsd, 0);
}

/** Sum of the user's borrow positions, in USD. */
export function totalBorrowsUsd(user: User): number {
  return user.borrows.reduce((sum, borrow) => sum + borrow.amountUsd, 0);
}

/**
 * Net deposits (N in the remediation formula): deposits minus borrows, in USD.
 *
 * Floored at zero — a user who borrowed more than they deposited suffered no
 * net loss in a risk event, so there is nothing to remediate (and a negative N
 * would corrupt the pool total U for everyone else).
 */
export function netDepositsUsd(user: User): number {
  return Math.max(totalDepositsUsd(user) - totalBorrowsUsd(user), 0);
}

/**
 * Share of the user's deposited value staked as dLP (0..∞, where 0.15 = 15%).
 * Returns 0 when the user has no deposits, to avoid a 0/0 division.
 */
export function dlpPercentage(user: User): number {
  const deposits = totalDepositsUsd(user);
  if (deposits === 0) {
    return 0;
  }
  return user.dlpStakedValueUsd / deposits;
}

/**
 * A user is eligible for remediation when their dLP stake covers at least
 * `threshold` of their deposited value.
 *
 * The comparison is inclusive: staking exactly the required share qualifies —
 * users target the exact threshold to minimize locked capital, so excluding
 * the boundary would disqualify precisely the users following the rule.
 *
 * Users with zero deposits are never eligible: dLP coverage is undefined for
 * them, and with no deposits there is no loss to remediate.
 */
export function isEligible(
  user: User,
  threshold: number = DEFAULT_DLP_THRESHOLD
): boolean {
  if (totalDepositsUsd(user) === 0) {
    return false;
  }
  return dlpPercentage(user) >= threshold;
}

/** Users from `users` that meet the dLP threshold. */
export function filterEligibleUsers(
  users: User[],
  threshold: number = DEFAULT_DLP_THRESHOLD
): User[] {
  return users.filter((user) => isEligible(user, threshold));
}
