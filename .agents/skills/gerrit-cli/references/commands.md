# Gerrit CLI Common Commands & Usage (Public)

Run the tool directly using the wrapper script path with the `--help` flag:
- `vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py --help`
- `vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py changes --help`

## Global Flags

Use the following global flags for all commands:

- `--host <url>` (e.g., `--host https://chromium-review.googlesource.com`).
- `--project <project_name>` (e.g., `--project chromium/src`).
- `--json_file <path>` (saves the structured response as a JSON file).

______________________________________________________________________

## Common Invocations

### 1. Inspecting and Searching Changes

- **Query active changes:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    changes \
    --query "owner:self status:open"
  ```
- **View the content of a specific file in a change:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    content \
    --json_file output.json \
    --change <change_id> --revision <revision> --path <file_path>
  ```
- **Get related changes:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    relatedchanges \
    --change <change_id> --revision <revision>
  ```

### 2. Reviewing and Voting

- **Add a patchset-level comment:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    addpatchsetcomment \
    --change <change_id> --revision <revision> \
    --message "Review findings: <message>"
  ```
- **Vote on a review label (e.g., Code-Review +1):**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    setlabel \
    --change <change_id> \
    --label Code-Review 1
  ```

### 3. Actions and Shepherding

- **Submit/Merge a change:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    submitchange \
    --change <change_id>
  ```
- **Abandon a change:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    abandon \
    --change <change_id> \
    --message "<reason>"
  ```
- **Restore an abandoned change:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    restore \
    --change <change_id> \
    --message "<reason>"
  ```

______________________________________________________________________

## Just-in-Time Help

Explore the built-in CLI help for additional subcommands or advanced syntax:

- Display all top-level commands:
  `vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py --help`
- Display help for a specific subcommand:
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    help <command>
  ```
