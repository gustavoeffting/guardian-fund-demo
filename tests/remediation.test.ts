import { describe, expect, it } from 'vitest';

import { filterEligibleUsers } from '../src/eligibility.js';
import { mockUsers } from '../src/mocks/users.js';
import {
  calculateRemediations,
  remediationAmountUsd,
} from '../src/remediation.js';

describe('remediationAmountUsd — C = MIN((N/U)*G, N)', () => {
  it('pays proportionally when the fund does not cover total losses', () => {
    // N = 9,000 of U = 60,000, G = 30,000 → share = 4,500 (< N)
    expect(remediationAmountUsd(9_000, 60_000, 30_000)).toBe(4_500);
  });

  it('caps the payout at the user net deposits when the fund fully covers', () => {
    // G > U, so the uncapped share (12,000) exceeds the loss → pay N = 9,000
    expect(remediationAmountUsd(9_000, 60_000, 80_000)).toBe(9_000);
  });

  it('pays exactly N when the fund equals total eligible net deposits', () => {
    expect(remediationAmountUsd(9_000, 60_000, 60_000)).toBe(9_000);
  });

  it('pays nothing to a user with zero net deposits', () => {
    expect(remediationAmountUsd(0, 60_000, 30_000)).toBe(0);
  });

  it('pays nothing when total eligible net deposits are zero', () => {
    // guards the division by zero: no losses in the pool, nothing to remediate
    expect(remediationAmountUsd(0, 0, 30_000)).toBe(0);
  });

  it('pays nothing when the Guardian Fund is empty', () => {
    expect(remediationAmountUsd(9_000, 60_000, 0)).toBe(0);
  });
});

describe('calculateRemediations', () => {
  // arbitrum-eligible mocks: alice (N = 9,000), carol (N = 3,500), erin (N = 0)
  const eligibleArbitrumUsers = filterEligibleUsers(
    mockUsers.filter((user) => user.chainId === 'arbitrum')
  );

  it('distributes a partial fund proportionally to net deposits', () => {
    // U = 12,500, G = 5,000 → each user gets 40% of their net deposits.
    // toBeCloseTo because the proportional share is IEEE-754 math, not exact.
    const results = calculateRemediations(eligibleArbitrumUsers, 5_000);

    expect(results.map((result) => result.userId)).toEqual([
      'alice',
      'carol',
      'erin',
    ]);
    expect(results[0]?.remediationUsd).toBeCloseTo(3_600);
    expect(results[1]?.remediationUsd).toBeCloseTo(1_400);
    expect(results[2]?.remediationUsd).toBe(0);
  });

  it('never distributes more than the fund balance', () => {
    const results = calculateRemediations(eligibleArbitrumUsers, 5_000);
    const totalPaidUsd = results.reduce(
      (sum, result) => sum + result.remediationUsd,
      0
    );
    expect(totalPaidUsd).toBeLessThanOrEqual(5_000);
  });

  it('makes every user whole when the fund exceeds total net deposits', () => {
    // G = 100,000 > U = 12,500 → each user receives exactly their N
    const results = calculateRemediations(eligibleArbitrumUsers, 100_000);

    for (const result of results) {
      expect(result.remediationUsd).toBe(result.netDepositsUsd);
    }
  });

  it('returns an empty list when there are no eligible users', () => {
    expect(calculateRemediations([], 50_000)).toEqual([]);
  });

  it('pays nothing when all eligible users have zero net deposits', () => {
    // erin is dLP-eligible but borrowed more than she deposited (N floored to 0)
    const erin = mockUsers.find((user) => user.id === 'erin');
    if (!erin) throw new Error('mock user "erin" not found');

    expect(calculateRemediations([erin], 50_000)).toEqual([
      { userId: 'erin', netDepositsUsd: 0, remediationUsd: 0 },
    ]);
  });
});
