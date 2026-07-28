// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execSync} from 'node:child_process';
import {parseArgs} from 'node:util';

export function getLuciToken(): string {
  try {
    return execSync('luci-auth token', {encoding: 'utf-8'}).trim();
  } catch {
    console.error('Error: Could not get LUCI auth token. Did you run \'luci-auth login\'?');
    process.exit(1);
  }
}

interface ClusterMetric {
  value: string;
}

interface ClusterMetrics {
  'critical-failures-exonerated'?: ClusterMetric;
  failures?: ClusterMetric;
  'human-cls-failed-presubmit'?: ClusterMetric;
}

interface ClusterId {
  id: string;
  algorithm: string;
}

export interface Cluster {
  title?: string;
  clusterId?: ClusterId;
  metrics?: ClusterMetrics;
  bug?: {url?: string};
}

export async function getFlakyClusters(days = 1): Promise<Cluster[]> {
  const url = 'https://analysis.api.luci.app/prpc/luci.analysis.v1.Clusters/QueryClusterSummaries';
  const projectName = 'devtools-frontend';

  const headers = {
    Authorization: `Bearer ${getLuciToken()}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const now = new Date();
  const earliest = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

  const payload = {
    project: projectName,
    failureFilter: 'realm = "devtools-frontend:ci"',
    orderBy: 'metrics.`failures`.value desc',
    metrics: [
      `projects/${projectName}/metrics/critical-failures-exonerated`,
      `projects/${projectName}/metrics/failures`,
      `projects/${projectName}/metrics/human-cls-failed-presubmit`,
    ],
    timeRange: {
      earliest: earliest.toISOString(),
      latest: now.toISOString(),
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`HTTP Error ${response.status}: ${response.statusText}`);
    console.error(text);
    throw new Error(`Network error querying LUCI Analysis: ${response.statusText}`);
  }

  let rawData = await response.text();
  if (rawData.startsWith(')]}\'\n')) {
    rawData = rawData.substring(5);
  }

  const data = JSON.parse(rawData);
  let clusters: Cluster[] = data.clusterSummaries || [];

  const isChromiumTest = (title: string) =>
      title.includes('ninja://') || title.includes('Unexpected Diff') || title.includes('.cc(');
  clusters = clusters.filter(c => !isChromiumTest(c.title || ''));
  clusters = clusters.filter(c => Number(c.metrics?.failures?.value || 0) > 0);

  return clusters;
}

async function main(): Promise<void> {
  const {values} = parseArgs({
    options: {
      format: {
        type: 'string',
      },
    },
  });
  const isJson = values.format === 'json';

  if (!isJson) {
    console.log('Fetching flaky clusters for devtools-frontend over the last 24 hours...');
  }

  const clusters = await getFlakyClusters(1);

  if (isJson) {
    console.log(JSON.stringify(clusters, null, 2));
  } else {
    console.log('\nFlaky Clusters for devtools-frontend:');
    console.log('='.repeat(60));
    for (const cluster of clusters) {
      const title = cluster.title || 'No Title';
      const clusterId = cluster.clusterId?.id || 'Unknown ID';
      const algorithm = cluster.clusterId?.algorithm || 'Unknown Algorithm';

      const totalFailures = cluster.metrics?.failures?.value || 0;
      const clusterLink = `https://luci-analysis.appspot.com/p/devtools-frontend/clusters/${algorithm}/${clusterId}`;

      console.log(`Cluster: ${title}`);
      console.log(`Link:    ${clusterLink}`);
      console.log(`Impact:  ${totalFailures} total failures`);
      console.log('-'.repeat(60));
    }
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
