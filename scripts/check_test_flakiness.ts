// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {parseArgs} from 'node:util';

import {getFlakyClusters} from './fetch_luci_test_clusters.ts';

async function main(): Promise<void> {
  const {values} = parseArgs({
    options: {
      test: {
        type: 'string',
      },
    },
  });

  if (!values.test) {
    console.error('Usage: ts-node check_test_flakiness.ts --test <test_name>');
    process.exit(1);
  }
  const testName = values.test;

  console.log(`Checking flakiness for ${testName} over the last 3 days...`);
  const clusters = await getFlakyClusters(3);

  const found = clusters.find(c => (c.title || '').includes(testName));
  if (found) {
    console.log(`Test '${testName}' IS flaky in the last 3 days.`);
    console.log(`Cluster Link: https://luci-analysis.appspot.com/p/devtools-frontend/clusters/${
        found.clusterId?.algorithm}/${found.clusterId?.id}`);
    console.log(`Total failures: ${found.metrics?.failures?.value || 0}`);
  } else {
    console.log(`Test '${testName}' is NOT flaky in the last 3 days.`);
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
