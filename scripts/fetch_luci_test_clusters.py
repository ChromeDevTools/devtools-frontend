#!/usr/bin/env python3

# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import json
import subprocess
import urllib.request
import urllib.error
import datetime


def get_luci_token() -> str:
    """Fetches the LUCI auth token using the luci-auth CLI."""
    # This requires `depot_tools` to be in your PATH and `luci-auth login` to have been run
    result = subprocess.run(['luci-auth', 'token'],
                            capture_output=True,
                            text=True,
                            check=True)
    return result.stdout.strip()


def get_flaky_clusters(project_name: str) -> dict:
    """Queries LUCI Analysis for the top flaky test clusters."""
    url = "https://analysis.api.luci.app/prpc/luci.analysis.v1.Clusters/QueryClusterSummaries"

    headers = {
        "Authorization": f"Bearer {get_luci_token()}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    # Calculate the time range (e.g., the last 7 days)
    now = datetime.datetime.utcnow()
    earliest = now - datetime.timedelta(days=7)

    # Request payload based on QueryClusterSummariesRequest proto
    payload = {
        "project":
        project_name,
        # Order by exonerated presubmit-blocking failures (strongest indicator of flakiness)
        "orderBy":
        "metrics.`critical-failures-exonerated`.value desc",
        "metrics": [
            f"projects/{project_name}/metrics/critical-failures-exonerated",
            f"projects/{project_name}/metrics/failures",
            f"projects/{project_name}/metrics/human-cls-failed-presubmit"
        ],
        # LUCI Analysis requires a timeRange for this query
        "timeRange": {
            "earliest": earliest.isoformat() + "Z",
            "latest": now.isoformat() + "Z"
        }
    }

    # Encode payload to bytes for urllib
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url,
                                 data=data,
                                 headers=headers,
                                 method='POST')

    print(
        f"Fetching flaky clusters for {project_name} over the last 7 days...")
    try:
        with urllib.request.urlopen(req) as response:
            raw_data = response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        print(e.read().decode('utf-8'))
        raise

    # pRPC responses are prefixed with )]}'\n to prevent Cross-Site Script Inclusion (XSSI).
    # We must strip this before parsing the JSON.
    if raw_data.startswith(")]}'\n"):
        raw_data = raw_data[5:]

    return json.loads(raw_data)


if __name__ == "__main__":
    project = "devtools-frontend"

    try:
        data = get_flaky_clusters(project)
        clusters = data.get("clusterSummaries", [])

        print(f"\nTop Flaky Clusters for {project}:")
        print("=" * 60)

        # Print the top 10 results
        for cluster in clusters[:10]:
            title = cluster.get("title", "No Title")
            cluster_id = cluster.get("clusterId", {}).get("id", "Unknown ID")
            metrics = cluster.get("metrics", {})

            # Extract metric values (defaults to 0 if not present)
            exonerated = metrics.get("critical-failures-exonerated",
                                     {}).get("value", 0)
            total_failures = metrics.get("failures", {}).get("value", 0)
            human_cls_failed = metrics.get("human-cls-failed-presubmit",
                                           {}).get("value", 0)

            print(f"Cluster: {title}")
            print(f"ID:      {cluster_id}")
            print(f"Impact:  {exonerated} critical failures exonerated")
            print(f"         {total_failures} total failures")
            print(f"         {human_cls_failed} user CLs failed presubmit")
            print("-" * 60)

    except subprocess.CalledProcessError:
        print(
            "Error: Could not get LUCI auth token. Did you run 'luci-auth login'?"
        )
    except urllib.error.URLError as e:
        print(f"Network error querying LUCI Analysis: {e.reason}")
