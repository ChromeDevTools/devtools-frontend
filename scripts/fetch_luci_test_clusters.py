#!/usr/bin/env python3

# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import json
import subprocess
import urllib.request
import urllib.error
import datetime
import argparse


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
        "failureFilter":
        'realm = "devtools-frontend:ci"',
        # Order by total failures
        "orderBy":
        "metrics.`failures`.value desc",
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--format", choices=["json"], help="Output format")
    args = parser.parse_args()

    project = "devtools-frontend"
    is_json = args.format == "json"

    if not is_json:
        print(f"Fetching flaky clusters for {project} over the last 7 days...")

    try:
        data = get_flaky_clusters(project)
        clusters = data.get("clusterSummaries", [])

        # Filter out chromium tests
        # Chromium tests usually contain "ninja://" or "Unexpected Diff" (inspector-protocol)
        def is_chromium_test(title: str) -> bool:
            return "ninja://" in title or "Unexpected Diff" in title or ".cc(" in title

        clusters = [
            c for c in clusters if not is_chromium_test(c.get("title", ""))
        ]

        clusters = [
            c for c in clusters if int(
                c.get("metrics", {}).get("failures", {}).get("value", 0)) > 25
        ]

        if is_json:
            print(json.dumps(clusters, indent=2))
        else:
            print(f"\nFlaky Clusters for {project}:")
            print("=" * 60)

            for cluster in clusters:
                title = cluster.get("title", "No Title")
                cluster_id = cluster.get("clusterId",
                                         {}).get("id", "Unknown ID")
                algorithm = cluster.get("clusterId",
                                        {}).get("algorithm",
                                                "Unknown Algorithm")
                metrics = cluster.get("metrics", {})

                # Extract metric values (defaults to 0 if not present)
                exonerated = metrics.get("critical-failures-exonerated",
                                         {}).get("value", 0)
                total_failures = metrics.get("failures", {}).get("value", 0)
                human_cls_failed = metrics.get("human-cls-failed-presubmit",
                                               {}).get("value", 0)
                cluster_link = f"https://luci-analysis.appspot.com/p/{project}/clusters/{algorithm}/{cluster_id}"

                print(f"Cluster: {title}")
                print(f"Link:    {cluster_link}")
                print(f"Impact:  {total_failures} total failures")
                print("-" * 60)

    except subprocess.CalledProcessError:
        print(
            "Error: Could not get LUCI auth token. Did you run 'luci-auth login'?"
        )
    except urllib.error.URLError as e:
        print(f"Network error querying LUCI Analysis: {e.reason}")


if __name__ == "__main__":
    main()
