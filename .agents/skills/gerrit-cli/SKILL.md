---
name: gerrit-cli
description: >-
  Interacts with the public Gerrit Code Review platform using depot_tools'
  gerrit_client.py. Use this skill when asked to query public CLs, retrieve
  file revisions, add patchset comments, vote on review labels, submit changes,
  or abandon/restore public CLs. Do not use this skill for Google-internal
  attention set updates or internal AI-assisted code reviews (CRUAS) which are
  unsupported by the public API.
---

# Gerrit CLI Skill

Execute public Gerrit Code Review commands using `gerrit_client.py` from
depot_tools.

## Prerequisites

- Ensure `gerrit_client.py` is available in the system `PATH` (typically part of
  `depot_tools`). If `gerrit_client.py` is not available in your environment,
  stop execution immediately.
- Use the wrapper script directly instead of an environment variable.
  Substitute:
  `vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py`
  as the executable command in all examples and invocations.

## Just-in-Time (JiT) Loading Guidance

- Before running any Gerrit CLI command, read `references/commands.md`
  to locate the required parameters and specific subcommand syntax.
- Before querying public CLs, adding comments, voting, or submitting changes,
  read `references/workflows.md` for step-by-step procedures.

## Gotchas & Environment Constraints

- **Specify Host**: Always supply the `--host` flag explicitly (e.g.
  `--host https://chromium-review.googlesource.com`).
- **Use JSON Output**: Always use the `--json_file=<path>` flag when querying
  changes or fetching metadata to obtain structured, machine-readable output.

> [!CAUTION]
> **NEVER** use this to add patchset comments to an existing comment thread that
> contains human reviewers in it. Using an agent to reply to a human is a
> violation of Chromium's code of conduct.
>
> If the user requests this or you encounter this scenario as part of your work,
> inform the user about which comment threads cannot be updated but otherwise
> continue work.


> [!NOTE]
> This skill was adapted from the [Chromium Gerrit CLI skill](https://chromium.googlesource.com/chromium/agents/+/main/skills/gerrit-cli/)
> (automatically rolled in from upstream).
