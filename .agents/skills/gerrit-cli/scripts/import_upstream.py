#!/usr/bin/env python3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Imports the Gerrit CLI skill from upstream and adapts it for DevTools."""

import io
import re
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path

UPSTREAM_URL = "https://chromium.googlesource.com/chromium/agents/+archive/refs/heads/main/skills/gerrit-cli.tar.gz"


def fetch_upstream_skill(target_dir: Path):
    print(f"Downloading upstream skill from {UPSTREAM_URL}...")
    req = urllib.request.Request(UPSTREAM_URL,
                                 headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        tar_data = resp.read()

    print(f"Extracting docs to {target_dir}...")
    with tarfile.open(fileobj=io.BytesIO(tar_data), mode='r:gz') as tar:
        # Only extract docs (SKILL.md & references), skip unused upstream wrapper scripts
        docs = [
            m for m in tar.getmembers() if not m.name.startswith("scripts/")
        ]
        tar.extractall(path=target_dir, members=docs)


def apply_devtools_revisions(target_dir: Path):
    print("Adapting skill for DevTools...")
    for md_path in target_dir.rglob("*.md"):
        content = md_path.read_text()

        # Direct gerrit_client.py execution instead of wrapper script
        content = re.sub(
            r'-\s+Use the wrapper script directly[^\n]*\n\s+Substitute:\s*\n\s+`[^`]+`\s*\n\s+as the executable command[^\n]*',
            '- Execute `gerrit_client.py` directly for all commands and invocations.',
            content)
        content = re.sub(
            r'Run the tool directly using the wrapper script path with the `--help` flag:',
            'Run `gerrit_client.py` directly with the `--help` flag:', content)
        content = re.sub(
            r'(?:v)?python3\s+(?:\.agents/skills|agents/shared/skills)/gerrit-cli/(?:scripts/gerrit_client_wrapper\.py)?',
            'gerrit_client.py', content)

        if md_path.name == "SKILL.md" and "> [!NOTE]" not in content:
            content += """
> [!NOTE]
> This skill was adapted from the [Chromium Gerrit CLI skill](https://chromium.googlesource.com/chromium/agents/+/main/skills/gerrit-cli/)
> (automatically rolled in from upstream).
"""
        md_path.write_text(content)


def validate_gerrit_client():
    print("Validating gerrit_client.py...")
    with tempfile.NamedTemporaryFile(suffix=".json") as tmp:
        subprocess.run([
            "gerrit_client.py", "changes", "--query", "change:8147179",
            "--host", "https://chromium-review.googlesource.com",
            "--json_file", tmp.name
        ],
                       check=True,
                       capture_output=True)
        if b"8147179" not in Path(tmp.name).read_bytes():
            sys.exit("Validation failed: query response invalid")
    print("  - Validation passed successfully!")


def main():
    skill_dir = Path(__file__).parent.parent.resolve()
    fetch_upstream_skill(skill_dir)
    apply_devtools_revisions(skill_dir)
    validate_gerrit_client()
    print("Upstream sync completed successfully!")


if __name__ == "__main__":
    main()
