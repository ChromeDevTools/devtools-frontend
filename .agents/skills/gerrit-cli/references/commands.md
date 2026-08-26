# Gerrit CLI Common Commands & Usage (Public)

Run `gerrit_client.py` directly with the `--help` flag:

- `gerrit_client.py --help`
- `gerrit_client.py changes --help`

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
  gerrit_client.py \
    changes \
    --host https://chromium-review.googlesource.com \
    --query "owner:self status:open"
  ```

- **Get published file and line comments across patchsets:**

  ```bash
  gerrit_client.py \
    comments \
    --host https://chromium-review.googlesource.com \
    --change <change_id> \
    --json_file <path>
  ```

  This writes the unchanged structured Gerrit JSON to `--json_file`. Filtering,
  threading, and presentation are the caller's responsibility.

- **View the content of a specific file in a change:**

  **Note:** This command does not work with the `--json_file` flag, instead use
  stdout redirection (`>`).

  ```bash
  gerrit_client.py \
    content \
    --host https://chromium-review.googlesource.com \
    --project <project> \
    --change <change_id> \
    --revision <revision> \
    --path <file_path> \
    > output_file
  ```

- **Get a formatted patch for a change:**

  `--revision <revision>` is optional and defaults to `current`. Use the
  optional `--path <file_path>`, `--parent <parent_number>`, and
  `--context <lines>` flags to customize the patch.

  **Note:** Decoded formatted patch bytes are written to stdout, so redirect
  them to a file (`>`). The `--json_file` flag is not used for patch bytes.

  ```bash
  gerrit_client.py \
    patch \
    --host https://chromium-review.googlesource.com \
    --change <change_id> \
    > output.patch
  ```

- **Get related changes:**

  ```bash
  gerrit_client.py \
    relatedchanges \
    --host https://chromium-review.googlesource.com \
    --change <change_id> --revision <revision>
  ```

### 2. Reviewing and Voting

- **Add a patchset-level comment:**
  ```bash
  gerrit_client.py \
    addpatchsetcomment \
    --host https://chromium-review.googlesource.com \
    --change <change_id> --revision <revision> \
    --message "Review findings: <message>"
  ```
- **Vote on a review label (e.g., Code-Review +1):**
  ```bash
  gerrit_client.py \
    setlabel \
    --host https://chromium-review.googlesource.com \
    --change <change_id> \
    --label Code-Review 1
  ```

### 3. Actions and Shepherding

- **Submit/Merge a change:**
  ```bash
  gerrit_client.py \
    submitchange \
    --host https://chromium-review.googlesource.com \
    --change <change_id>
  ```
- **Abandon a change:**
  ```bash
  gerrit_client.py \
    abandon \
    --host https://chromium-review.googlesource.com \
    --change <change_id> \
    --message "<reason>"
  ```
- **Restore an abandoned change:**
  ```bash
  gerrit_client.py \
    restore \
    --host https://chromium-review.googlesource.com \
    --change <change_id> \
    --message "<reason>"
  ```

______________________________________________________________________

## Just-in-Time Help

Explore the built-in CLI help for additional subcommands or advanced syntax:

- Display all top-level commands:
  `gerrit_client.py --help`
- Display help for a specific subcommand:
  ```bash
  gerrit_client.py \
    help <command>
  ```

## Advanced / Escape Hatch: Arbitrary REST API Calls (`rawapi`)

If the built-in subcommands do not cover a specific action or metadata query,
you can use the `rawapi` subcommand to execute arbitrary HTTP requests against
the Gerrit REST API.

- **Endpoint Reference**:
  [Gerrit REST API - Changes](https://gerrit-review.googlesource.com/Documentation/rest-api-changes.html)

### Usage

```bash
gerrit_client.py \
  rawapi \
  --host https://chromium-review.googlesource.com \
  --path "/changes/<change_id>/detail?o=SUBMITTABLE" \
  --json_file output.json
```

- **Options**:
  - `--path`: HTTP path of the API endpoint (e.g.
    `/changes/<change_id>/revisions/current/mergeable`).
  - `--method`: HTTP method (GET, POST, PUT, DELETE). Defaults to GET.
  - `--body`: JSON string body for write requests (e.g., POST/PUT).
  - `--accept_status`: Comma-separated list of successful HTTP status codes.
