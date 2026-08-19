/**
 * End-to-end demo of the Guardian Fund pipeline over the mocked snapshot:
 *
 *   mock users -> filterEligibleUsers -> distributeAcrossChains -> summary
 *
 * This is the only module with I/O (console output); all calculation logic
 * lives in pure functions. Run it with `npm start`.
 */
import { DEFAULT_DLP_THRESHOLD, filterEligibleUsers } from './eligibility.js';
import { mockChainFunds } from './mocks/chainFunds.js';
import { mockUsers } from './mocks/users.js';
import { distributeAcrossChains } from './proportional.js';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const eligibleUsers = filterEligibleUsers(mockUsers);
const distributions = distributeAcrossChains(eligibleUsers, mockChainFunds);

console.log('Guardian Fund remediation — demo run over mocked snapshot data');
console.log(
  `Eligibility: dLP stake >= ${percent.format(DEFAULT_DLP_THRESHOLD)} of deposited value`
);
console.log(
  `Users in snapshot: ${mockUsers.length} | eligible: ${eligibleUsers.length}`
);

const ineligibleIds = mockUsers
  .filter((user) => !eligibleUsers.includes(user))
  .map((user) => user.id);
if (ineligibleIds.length > 0) {
  console.log(`Not eligible: ${ineligibleIds.join(', ')}`);
}

for (const chain of distributions) {
  console.log(`\n[${chain.chainId}]`);
  console.log(
    `  Guardian Fund: ${usd.format(chain.guardianFundBalanceUsd)} | ` +
      `eligible net deposits: ${usd.format(chain.totalEligibleNetDepositsUsd)} | ` +
      `coverage: ${percent.format(chain.coverageRatio)}`
  );

  if (chain.results.length === 0) {
    console.log('  (no eligible users on this chain)');
    continue;
  }

  for (const result of chain.results) {
    console.log(
      `  ${result.userId.padEnd(8)} net deposits ${usd.format(result.netDepositsUsd).padStart(12)}` +
        ` -> remediation ${usd.format(result.remediationUsd).padStart(12)}`
    );
  }

  const totalPaidUsd = chain.results.reduce(
    (sum, result) => sum + result.remediationUsd,
    0
  );
  console.log(`  total paid: ${usd.format(totalPaidUsd)}`);
}
