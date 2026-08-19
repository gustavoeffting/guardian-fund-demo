import type { User } from '../types.js';

/**
 * Simulated snapshot data, standing in for the real subgraph query results.
 * The set deliberately covers every eligibility edge case so both tests and
 * future remediation slices can reuse it:
 *
 * - alice:  well above the 15% dLP threshold
 * - bob:    below the threshold
 * - carol:  exactly at the threshold (boundary case)
 * - dave:   zero deposits but dLP staked
 * - erin:   borrows exceed deposits (negative net, floored to 0)
 * - frank:  eligible user on a second chain (ethereum)
 */
export const mockUsers: User[] = [
  {
    id: 'alice',
    chainId: 'arbitrum',
    deposits: [
      { userId: 'alice', chainId: 'arbitrum', asset: 'USDC', amountUsd: 8_000 },
      { userId: 'alice', chainId: 'arbitrum', asset: 'WETH', amountUsd: 2_000 },
    ],
    borrows: [
      { userId: 'alice', chainId: 'arbitrum', asset: 'USDC', amountUsd: 1_000 },
    ],
    dlpStakedValueUsd: 2_500, // 25% of 10,000 deposited
  },
  {
    id: 'bob',
    chainId: 'arbitrum',
    deposits: [
      { userId: 'bob', chainId: 'arbitrum', asset: 'WBTC', amountUsd: 20_000 },
    ],
    borrows: [],
    dlpStakedValueUsd: 1_000, // 5% of 20,000 deposited
  },
  {
    id: 'carol',
    chainId: 'arbitrum',
    deposits: [
      { userId: 'carol', chainId: 'arbitrum', asset: 'USDC', amountUsd: 4_000 },
    ],
    borrows: [
      { userId: 'carol', chainId: 'arbitrum', asset: 'WETH', amountUsd: 500 },
    ],
    dlpStakedValueUsd: 600, // exactly 15% of 4,000 deposited
  },
  {
    id: 'dave',
    chainId: 'arbitrum',
    deposits: [],
    borrows: [],
    dlpStakedValueUsd: 300,
  },
  {
    id: 'erin',
    chainId: 'arbitrum',
    deposits: [
      { userId: 'erin', chainId: 'arbitrum', asset: 'USDC', amountUsd: 1_000 },
    ],
    borrows: [
      { userId: 'erin', chainId: 'arbitrum', asset: 'WETH', amountUsd: 1_500 },
    ],
    dlpStakedValueUsd: 200, // 20% of deposits, but net deposits are negative
  },
  {
    id: 'frank',
    chainId: 'ethereum',
    deposits: [
      { userId: 'frank', chainId: 'ethereum', asset: 'WETH', amountUsd: 50_000 },
    ],
    borrows: [
      { userId: 'frank', chainId: 'ethereum', asset: 'USDC', amountUsd: 10_000 },
    ],
    dlpStakedValueUsd: 9_000, // 18% of 50,000 deposited
  },
];
