---
name: devtools-ci
description: >-
  Triage and analyze Chromium/DevTools LUCI build results and trybot failures,
  including high-level builder status, compile errors, and detailed test
  failures. Use this to inspect trybot buildbucket (bb) results for a patchset
  overview or to query ResultDB directly for comprehensive, actionable information
  about specific test regressions and infrastructure issues.
---

# LUCI Build Triage & Analysis

This skill provides access to specialized triage tools maintained within the
`depot_tools` repository. These tools are used to inspect Buildbucket results
and ResultDB test failures.

## Environment & Auth Discovery

- **Environment**: Always execute these scripts using **`vpython3`** instead
  of `python3` to ensure all hermetic dependencies (like `httplib2`) are
  satisfied.
- **Authentication**: Use `bb auth-info` to proactively check if you are
  logged into Buildbucket. If not, inform the user they must run `bb auth-login`.

## Locating the Tools

The triage scripts and their detailed documentation are located relative to
the `depot_tools` installation:

1.  **Locate Depot Tools**: Run `which gerrit_client.py` to find your local
    `depot_tools` root.
2.  **Navigation**:
    - **Buildbucket (`bb_wrapper.py`)**: Found in `<DEPOT_TOOLS_ROOT>/agents/skills/buildbucket/`
      - *Strengths*: High-level Build info (is it failing? what steps failed?),
        compile errors, and infra issues.
    - **Test Results (`luci_triage.py`)**: Found in `<DEPOT_TOOLS_ROOT>/agents/skills/luci-test-results/`
      - *Strengths*: Detailed Test info (specific test case failures in
        ResultDB).

## Troubleshooting

- **"No Artifacts Found"**: This usually occurs if:
  1. The build failed so early (e.g., bot setup) that no artifacts were produced.
  2. The build is too old and logs have been purged.
  3. There is an authentication issue.
  - **Fallback**: Try `bb log <build_id> <step_name>` to see the raw output
    for the failed step.

## Available Skills in Depot Tools

Once you have located the `depot_tools` directory, read the following files
to understand how to use each tool:

- **`buildbucket`**: Used for high-level builder status and compile failures.
  - Read: `<DEPOT_TOOLS_ROOT>/agents/skills/buildbucket/SKILL.md`
- **`luci-test-results`**: Used for detailed ResultDB test failure analysis.
  - Read: `<DEPOT_TOOLS_ROOT>/agents/skills/luci-test-results/SKILL.md`

## Usage at Runtime

When you need to triage a build:
1.  Locate `depot_tools` as described above.
2.  Read the relevant `SKILL.md` file from `depot_tools`.
3.  Follow the instructions in that file to execute the Python scripts (e.g.,
    `bb_wrapper.py` or `luci_triage.py`) using their absolute paths.
