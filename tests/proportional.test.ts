import { describe, expect, it } from 'vitest';

import { filterEligibleUsers } from '../src/eligibility.js';
import { mockChainFunds } from '../src/mocks/chainFunds.js';
import { mockUsers } from '../src/mocks/users.js';
import { distributeAcrossChains } from '../src/proportional.js';
import type { ChainRemediation } from '../src/proportional.js';

const eligibleUsers = filterEligibleUsers(mockUsers);

function findChain(
  distributions: ChainRemediation[],
  chainId: string
): ChainRemediation {
  const chain = distributions.find((entry) => entry.chainId === chainId);
  if (!chain) {
    throw new Error(`no distribution for chain "${chainId}"`);
  }
  return chain;
}

describe('distributeAcrossChains', () => {
  const distributions = distributeAcrossChains(eligibleUsers, mockChainFunds);

  it('fully covers a chain whose fund exceeds its eligible net deposits', () => {
    // ethereum: frank alone, N = 40,000 vs G = 50,000
    const ethereum = findChain(distributions, 'ethereum');

    expect(ethereum.totalEligibleNetDepositsUsd).toBe(40_000);
    expect(ethereum.coverageRatio).toBe(1);
    expect(ethereum.results).toEqual([
      { userId: 'frank', netDepositsUsd: 40_000, remediationUsd: 40_000 },
    ]);
  });

  it('scales payouts proportionally when the fund covers losses only partially', () => {
    // arbitrum: U = 12,500 (alice 9,000 + carol 3,500 + erin 0) vs G = 5,000
    const arbitrum = findChain(distributions, 'arbitrum');

    expect(arbitrum.totalEligibleNetDepositsUsd).toBe(12_500);
    expect(arbitrum.coverageRatio).toBeCloseTo(0.4);
    expect(arbitrum.results.map((result) => result.userId)).toEqual([
      'alice',
      'carol',
      'erin',
    ]);
    expect(arbitrum.results[0]?.remediationUsd).toBeCloseTo(3_600); // 40% of 9,000
    expect(arbitrum.results[1]?.remediationUsd).toBeCloseTo(1_400); // 40% of 3,500
    expect(arbitrum.results[2]?.remediationUsd).toBe(0);
  });

  it('total paid on a partially covered chain never exceeds its fund', () => {
    const arbitrum = findChain(distributions, 'arbitrum');
    const totalPaidUsd = arbitrum.results.reduce(
      (sum, result) => sum + result.remediationUsd,
      0
    );
    expect(totalPaidUsd).toBeLessThanOrEqual(5_000 + 1e-9);
    expect(totalPaidUsd).toBeCloseTo(5_000);
  });

  it('pays nothing on a chain with a zero fund balance', () => {
    const zeroFundDistributions = distributeAcrossChains(eligibleUsers, [
      { chainId: 'arbitrum', guardianFundBalanceUsd: 0 },
    ]);
    const arbitrum = findChain(zeroFundDistributions, 'arbitrum');

    expect(arbitrum.coverageRatio).toBe(0);
    for (const result of arbitrum.results) {
      expect(result.remediationUsd).toBe(0);
    }
  });

  it('a surplus on one chain does not top up a shortfall on another', () => {
    // ethereum's 10,000 surplus must not raise arbitrum's 40% coverage
    const arbitrum = findChain(distributions, 'arbitrum');
    expect(arbitrum.coverageRatio).toBeCloseTo(0.4);
  });

  it('reports full coverage for a chain with a fund but no eligible users', () => {
    const distributionsWithIdleChain = distributeAcrossChains(eligibleUsers, [
      { chainId: 'bsc', guardianFundBalanceUsd: 10_000 },
    ]);
    const bsc = findChain(distributionsWithIdleChain, 'bsc');

    expect(bsc.totalEligibleNetDepositsUsd).toBe(0);
    expect(bsc.coverageRatio).toBe(1);
    expect(bsc.results).toEqual([]);
  });

  it('users on a chain without a fund allocation receive nothing', () => {
    // only arbitrum has an allocation, so frank (ethereum) appears nowhere
    const arbitrumOnly = distributeAcrossChains(eligibleUsers, [
      { chainId: 'arbitrum', guardianFundBalanceUsd: 5_000 },
    ]);

    const paidUserIds = arbitrumOnly.flatMap((chain) =>
      chain.results.map((result) => result.userId)
    );
    expect(paidUserIds).not.toContain('frank');
  });
});
