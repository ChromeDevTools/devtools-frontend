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
    --host https://chromium-review.googlesource.com \
    --query "owner:self status:open"
  ```

- **View the content of a specific file in a change:**

  **Note:** This command does not work with the `--json_file` flag, instead use
  stdout redirection (`>`).

  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    content \
    --host https://chromium-review.googlesource.com \
    --project <project> \
    --change <change_id> \
    --revision <revision> \
    --path <file_path> \
    > output_file
  ```

- **Get related changes:**

  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    relatedchanges \
    --host https://chromium-review.googlesource.com \
    --change <change_id> --revision <revision>
  ```

### 2. Reviewing and Voting

- **Add a patchset-level comment:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    addpatchsetcomment \
    --host https://chromium-review.googlesource.com \
    --change <change_id> --revision <revision> \
    --message "Review findings: <message>"
  ```
- **Vote on a review label (e.g., Code-Review +1):**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    setlabel \
    --host https://chromium-review.googlesource.com \
    --change <change_id> \
    --label Code-Review 1
  ```

### 3. Actions and Shepherding

- **Submit/Merge a change:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    submitchange \
    --host https://chromium-review.googlesource.com \
    --change <change_id>
  ```
- **Abandon a change:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    abandon \
    --host https://chromium-review.googlesource.com \
    --change <change_id> \
    --message "<reason>"
  ```
- **Restore an abandoned change:**
  ```bash
  vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
    restore \
    --host https://chromium-review.googlesource.com \
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


## Advanced / Escape Hatch: Arbitrary REST API Calls (`rawapi`)

If the built-in subcommands do not cover a specific action or metadata query, you can use the `rawapi` subcommand to execute arbitrary HTTP requests against the Gerrit REST API.

- **Endpoint Reference**: [Gerrit REST API - Changes](https://gerrit-review.googlesource.com/Documentation/rest-api-changes.html)

### Usage

```bash
vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
  rawapi \
  --host https://chromium-review.googlesource.com \
  --path "/changes/<change_id>/detail?o=SUBMITTABLE" \
  --json_file output.json
```

- **Options**:
  - `--path`: HTTP path of the API endpoint (e.g. `/changes/<change_id>/revisions/current/mergeable`).
  - `--method`: HTTP method (GET, POST, PUT, DELETE). Defaults to GET.
  - `--body`: JSON string body for write requests (e.g., POST/PUT).
  - `--accept_status`: Comma-separated list of successful HTTP status codes.
