// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {exec} from 'node:child_process';
import {promisify} from 'node:util';

const execAsync = promisify(exec);

async function main() {
  // Start both commands in parallel
  const flakyPromise = execAsync('python3 scripts/fetch_luci_test_clusters.py --format=json', {encoding: 'utf-8'});
  const disabledPromise =
      execAsync('node scripts/extract_bugs.ts --format=json --sources devtools', {encoding: 'utf-8'});

  let flakyOutput = '';
  let disabledOutput = '';
  let flakyError: Error|null = null;
  let disabledError: Error|null = null;

  try {
    const flakyResult = await flakyPromise;
    flakyOutput = flakyResult.stdout;
  } catch (e) {
    flakyError = e instanceof Error ? e : new Error(String(e));
  }

  try {
    const disabledResult = await disabledPromise;
    disabledOutput = disabledResult.stdout;
  } catch (e) {
    disabledError = e instanceof Error ? e : new Error(String(e));
  }

  console.log('='.repeat(80));
  console.log('TEST HEALTH OVERVIEW');
  console.log('='.repeat(80));
  console.log();

  let clusters = [];
  let bugs = [];

  if (!flakyError) {
    try {
      clusters = JSON.parse(flakyOutput);
    } catch (error) {
      flakyError = new Error('Failed to parse flaky tests JSON', {cause: error});
    }
  }

  if (!disabledError) {
    try {
      bugs = JSON.parse(disabledOutput);
    } catch (error) {
      disabledError = new Error('Failed to parse disabled bugs JSON', {cause: error});
    }
  }

  // --- SUMMARY ---
  console.log('SUMMARY');
  console.log('-'.repeat(80));
  if (flakyError) {
    console.log(`- Flaky Tests: Error - ${flakyError.message}`);
  } else {
    console.log(`- Flaky Tests: ${clusters.length} clusters found in the last 7 days.`);
  }

  if (disabledError) {
    console.log(`- Disabled Tests: Error - ${disabledError.message}`);
  } else {
    console.log(`- Disabled Tests: ${bugs.length} disabled tests found in devtools.`);
  }
  console.log();

  // --- DETAILS ---
  console.log('DETAILS');
  console.log('='.repeat(80));
  console.log();

  console.log('1. FLAKY TESTS (LUCI Analysis - Last 7 Days)');
  console.log('-'.repeat(80));

  if (flakyError) {
    console.error('Failed to fetch flaky tests:', flakyError.message);
  } else if (clusters.length === 0) {
    console.log('No flaky clusters found.');
  } else {
    for (const cluster of clusters) {
      const title = cluster.title || 'No Title';
      const clusterId = cluster.clusterId?.id || 'Unknown ID';
      const algorithm = cluster.clusterId?.algorithm || 'Unknown Algorithm';

      const exonerated = cluster.metrics?.['critical-failures-exonerated']?.value || 0;
      const totalFailures = cluster.metrics?.failures?.value || 0;
      const humanClsFailed = cluster.metrics?.['human-cls-failed-presubmit']?.value || 0;
      const link = `https://luci-analysis.appspot.com/p/devtools-frontend/clusters/${algorithm}/${clusterId}`;
      const bugUrl = cluster.bug?.url;

      console.log(`Cluster: ${title}`);
      if (bugUrl) {
        console.log(`Bug:     ${bugUrl}`);
      }
      console.log(`Link:    ${link}`);
      console.log(`Impact:  ${exonerated} critical failures exonerated`);
      console.log(`         ${totalFailures} total failures`);
      console.log(`         ${humanClsFailed} user CLs failed presubmit`);
      console.log('-'.repeat(60));
    }
  }

  console.log();
  console.log('2. DISABLED TESTS');
  console.log('-'.repeat(80));

  if (disabledError) {
    console.error('Failed to extract disabled bugs:', disabledError.message);
  } else {
    for (const item of bugs) {
      console.log(`- ${item.bug.padEnd(25)} ${item.file}`);
    }
  }
}

main().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
