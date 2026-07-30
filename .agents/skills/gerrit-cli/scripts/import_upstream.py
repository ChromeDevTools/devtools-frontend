#!/usr/bin/env python3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Imports the Gerrit CLI skill from upstream and applies DevTools revisions.

No external checkouts (like chromium/src) are required. The script downloads
the skill directly from the public Git repository.
"""

import io
import re
import sys
import tarfile
import urllib.request
from pathlib import Path

UPSTREAM_URL = "https://chromium.googlesource.com/chromium/agents/+archive/refs/heads/main/skills/gerrit-cli.tar.gz"

def fetch_upstream_skill(target_dir: Path):
    print(f"Downloading upstream skill from {UPSTREAM_URL}...")
    try:
        req = urllib.request.Request(UPSTREAM_URL,
                                     headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            tar_data = response.read()
    except Exception as e:
        print(f"Failed to download upstream skill: {e}")
        sys.exit(1)

    print(f"Extracting to {target_dir}...")
    target_dir.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(tar_data), mode='r:gz') as tar:
        tar.extractall(path=target_dir)


def apply_devtools_revisions(target_dir: Path):
    print("Applying DevTools-specific adaptations...")

    # 2. Update SKILL.md
    skill_md_path = target_dir / "SKILL.md"
    if skill_md_path.exists():
        content = skill_md_path.read_text()

        # Re-route wrapper script path
        content = re.sub(
            r'(?:v)?python3\s+agents/shared/skills/gerrit-cli/scripts/gerrit_client_wrapper.py',
            'vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py',
            content)

        # Add attribution note at the bottom
        attribution = """
> [!NOTE]
> This skill was adapted from the [Chromium Gerrit CLI skill](https://chromium.googlesource.com/chromium/agents/+/main/skills/gerrit-cli/)
> (automatically rolled in from upstream).
"""
        if "> [!NOTE]" not in content:
            content += "\n" + attribution

        skill_md_path.write_text(content)
        print("  - Adapted SKILL.md")

    # 3. Update references/commands.md and references/workflows.md
    for filename in ["commands.md", "workflows.md"]:
        ref_path = target_dir / "references" / filename
        if ref_path.exists():
            c = ref_path.read_text()

            # Path & executable transformations
            c = re.sub(r'(?:v)?python3\s+agents/shared/skills/gerrit-cli/',
                       'vpython3 .agents/skills/gerrit-cli/', c)

            ref_path.write_text(c)
            print(f"  - Adapted references/{filename}")


def validate_gerrit_client_wrapper(skill_dir: Path):
    print("Validating gerrit_client_wrapper.py...")
    import json, subprocess, tempfile
    wrapper = skill_dir / "scripts" / "gerrit_client_wrapper.py"
    with tempfile.TemporaryDirectory() as tmp:
        json_file = Path(tmp) / "out.json"
        try:
            subprocess.run([
                "vpython3",
                str(wrapper), "changes", "--query", "change:8147179", "--host",
                "https://chromium-review.googlesource.com", "--json_file",
                str(json_file)
            ],
                           check=True,
                           capture_output=True)
            data = json.loads(json_file.read_text())
            if not data or data[0].get("_number") != 8147179:
                raise ValueError(f"Invalid response: {data}")
            print("  - Validation passed successfully!")
        except Exception as e:
            stderr = getattr(e, "stderr", b"").decode(errors="replace")
            print(f"Validation FAILED: {e}\n{stderr}")
            sys.exit(1)



def main():
    skill_dir = Path(__file__).parent.parent.resolve()
    fetch_upstream_skill(skill_dir)
    apply_devtools_revisions(skill_dir)
    validate_gerrit_client_wrapper(skill_dir)
    print("Upstream sync completed successfully!")


if __name__ == "__main__":
    main()
