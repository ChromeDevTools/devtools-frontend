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

DEVTOOLS_WRAPPER_LOGIC = """    # DevTools specific defaults
    default_args = [
        '--host', 'https://chromium-review.googlesource.com',
        '--project', 'devtools/devtools-frontend',
    ]

    # gerrit_client.py expects: <command> [options] [args]
    # We need to extract the command from sys.argv and put it first.
    user_args = sys.argv[1:]
    command = []
    other_args = []
    for i, arg in enumerate(user_args):
        if not arg.startswith('-'):
            command = [arg]
            other_args = user_args[:i] + user_args[i + 1:]
            break
    else:
        other_args = user_args

    full_args = command + default_args + other_args

    rc = subprocess.call(['vpython3', client] + full_args)"""

CAUTION_TEXT = """> [!CAUTION]
> **NEVER** use this to add patchset comments to an existing comment thread that
> contains human reviewers in it. Using an agent to reply to a human is a
> violation of Chromium's code of conduct.
>
> If the user requests this or you encounter this scenario as part of your work,
> inform the user about which comment threads cannot be updated but otherwise
> continue work.
"""


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

    # 1. Update gerrit_client_wrapper.py
    wrapper_path = target_dir / "scripts" / "gerrit_client_wrapper.py"
    if wrapper_path.exists():
        code = wrapper_path.read_text()
        # Remove ". All rights reserved." from license header to satisfy DevTools presubmit
        code = code.replace(". All rights reserved.", "")
        target_line = "    rc = subprocess.call(['vpython3', client] + sys.argv[1:])"
        if target_line in code:
            code = code.replace(target_line, DEVTOOLS_WRAPPER_LOGIC)
        else:
            # Fallback if upstream changed to python3
            fallback_line = "    rc = subprocess.call(['python3', client] + sys.argv[1:])"
            code = code.replace(fallback_line, DEVTOOLS_WRAPPER_LOGIC)
        wrapper_path.write_text(code)
        print("  - Adapted gerrit_client_wrapper.py")

    # 2. Update SKILL.md
    skill_md_path = target_dir / "SKILL.md"
    if skill_md_path.exists():
        content = skill_md_path.read_text()

        # Re-route wrapper script path & change python3 to vpython3
        content = content.replace(
            "python3 agents/shared/skills/gerrit-cli/scripts/gerrit_client_wrapper.py",
            "vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py"
        )

        # Add vpython3 environment warning under Prerequisites
        if "- **Environment**:" not in content:
            prereq_note = "- **Environment**: Always execute the wrapper script using **`vpython3`** instead of `python3` to ensure all internal dependencies are satisfied.\n"
            content = content.replace("## Prerequisites\n",
                                      f"## Prerequisites\n\n{prereq_note}")

        # Replace Gotchas section with DevTools defaults info
        global_flags_section = """## Global Flags

The wrapper script includes DevTools-specific defaults for `--host` and
`--project`. You do not need to provide them unless you are targeting a
different host or project.

- **Default Host**: `https://chromium-review.googlesource.com`
- **Default Project**: `devtools/devtools-frontend`
- **JSON Output**: Always use the `--json_file=<path>` flag when querying
  changes or fetching metadata to obtain structured, machine-readable output.
"""
        gotchas_pattern = r"## Gotchas & Environment Constraints\n\n(?:[^\n]+\n)+"
        content = re.sub(gotchas_pattern, global_flags_section, content)

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
            c = c.replace("python3 agents/shared/skills/gerrit-cli/",
                          "vpython3 .agents/skills/gerrit-cli/")

            # Remove redundant host/project flags since our wrapper defaults them
            # This matches the flag and any trailing backslash & newline to keep shell syntax valid
            c = re.sub(r'^[ \t]+--(host|project)[ \t]+\S+[ \t]*(?:\\)?\n',
                       '',
                       c,
                       flags=re.M)

            # Re-route positional arguments to flags for various commands.
            # TODO(b/40292850): Simplify/remove these once CL lands upstream:
            # https://chromium-review.googlesource.com/c/chromium/agents/+/8146436

            # content
            c = c.replace(
                "<change_id> <revision> <file_path>",
                "--change <change_id> --revision <revision> --path <file_path>"
            )
            c = c.replace(
                "<change_id> current <file_path>",
                "--change <change_id> --revision current --path <file_path>")

            # changes (query flag is required)
            c = c.replace('changes \\\n    "owner:self status:open"',
                          'changes \\\n    --query "owner:self status:open"')
            c = c.replace('changes \\\n     "change:<id>"',
                          'changes \\\n     --query "change:<id>"')

            # relatedchanges
            c = c.replace(
                "relatedchanges \\\n    <change_id> <revision>",
                "relatedchanges \\\n    --change <change_id> --revision <revision>"
            )
            c = c.replace(
                "relatedchanges \\\n     <change_id> current",
                "relatedchanges \\\n     --change <change_id> --revision current"
            )

            # addpatchsetcomment
            c = c.replace(
                'addpatchsetcomment \\\n    --message "Review findings: <message>" \\\n    <change_id> <revision>',
                'addpatchsetcomment \\\n    --change <change_id> --revision <revision> \\\n    --message "Review findings: <message>"'
            )
            c = c.replace(
                'addpatchsetcomment \\\n     --message "Review findings: ..." \\\n     <change_id> current',
                'addpatchsetcomment \\\n     --change <change_id> --revision current \\\n     --message "Review findings: ..."'
            )

            # setlabel
            c = c.replace(
                'setlabel \\\n    --label "Code-Review" \\\n    --value 1 \\\n    <change_id>',
                'setlabel \\\n    --change <change_id> \\\n    --label Code-Review 1'
            )
            c = c.replace(
                'setlabel \\\n     --label "Code-Review" \\\n     --value 1 \\\n     <change_id>',
                'setlabel \\\n     --change <change_id> \\\n     --label Code-Review 1'
            )

            # submitchange
            c = c.replace("submitchange \\\n    <change_id>",
                          "submitchange \\\n    --change <change_id>")
            c = c.replace("submitchange \\\n     <change_id>",
                          "submitchange \\\n     --change <change_id>")

            # abandon
            c = c.replace(
                'abandon \\\n    --message "<reason>" \\\n    <change_id>',
                'abandon \\\n    --change <change_id> \\\n    --message "<reason>"'
            )

            # restore
            c = c.replace(
                'restore \\\n    --message "<reason>" \\\n    <change_id>',
                'restore \\\n    --change <change_id> \\\n    --message "<reason>"'
            )

            ref_path.write_text(c)
            print(f"  - Adapted references/{filename}")


def main():
    skill_dir = Path(__file__).parent.parent.resolve()
    fetch_upstream_skill(skill_dir)
    apply_devtools_revisions(skill_dir)
    print("Upstream sync completed successfully!")


if __name__ == "__main__":
    main()
