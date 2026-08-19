import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DLP_THRESHOLD,
  dlpPercentage,
  filterEligibleUsers,
  isEligible,
  netDepositsUsd,
  totalBorrowsUsd,
  totalDepositsUsd,
} from '../src/eligibility.js';
import { mockUsers } from '../src/mocks/users.js';
import type { User } from '../src/types.js';

function findUser(id: string): User {
  const user = mockUsers.find((candidate) => candidate.id === id);
  if (!user) {
    throw new Error(`mock user "${id}" not found`);
  }
  return user;
}

describe('deposit and borrow totals', () => {
  it('sums deposits across multiple assets', () => {
    expect(totalDepositsUsd(findUser('alice'))).toBe(10_000);
  });

  it('sums borrows across positions', () => {
    expect(totalBorrowsUsd(findUser('alice'))).toBe(1_000);
  });

  it('net deposits are deposits minus borrows', () => {
    expect(netDepositsUsd(findUser('alice'))).toBe(9_000);
  });

  it('net deposits are floored at zero when borrows exceed deposits', () => {
    expect(netDepositsUsd(findUser('erin'))).toBe(0);
  });
});

describe('dLP percentage', () => {
  it('is the dLP staked value relative to total deposited value', () => {
    expect(dlpPercentage(findUser('alice'))).toBeCloseTo(0.25);
  });

  it('is zero for a user with no deposits', () => {
    expect(dlpPercentage(findUser('dave'))).toBe(0);
  });
});

describe('eligibility at the default 15% dLP threshold', () => {
  it('user above the 15% dLP threshold is eligible', () => {
    expect(isEligible(findUser('alice'))).toBe(true);
  });

  it('user below the 15% dLP threshold is not eligible', () => {
    expect(isEligible(findUser('bob'))).toBe(false);
  });

  it('user exactly at the 15% dLP threshold is eligible', () => {
    expect(isEligible(findUser('carol'))).toBe(true);
  });

  it('user with zero deposits is not eligible even with dLP staked', () => {
    expect(isEligible(findUser('dave'))).toBe(false);
  });

  it('default threshold is 15%', () => {
    expect(DEFAULT_DLP_THRESHOLD).toBe(0.15);
  });
});

describe('eligibility with a custom threshold', () => {
  it('custom threshold overrides the 15% default', () => {
    // bob stakes 5%: ineligible by default, eligible if the bar drops to 5%
    expect(isEligible(findUser('bob'), 0.05)).toBe(true);
    // alice stakes 25%: eligible by default, ineligible if the bar rises to 30%
    expect(isEligible(findUser('alice'), 0.3)).toBe(false);
  });
});

describe('filterEligibleUsers', () => {
  it('keeps only users meeting the default threshold', () => {
    const eligibleIds = filterEligibleUsers(mockUsers).map((user) => user.id);
    expect(eligibleIds).toEqual(['alice', 'carol', 'erin', 'frank']);
  });

  it('applies a custom threshold to the whole set', () => {
    const eligibleIds = filterEligibleUsers(mockUsers, 0.2).map(
      (user) => user.id
    );
    expect(eligibleIds).toEqual(['alice', 'erin']);
  });
});
