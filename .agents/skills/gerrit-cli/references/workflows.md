# Gerrit CLI Workflows (Public)

## 1. Change List Review Workflow

Execute these steps in chronological order to review a Change List (CL) when
provided with a link or ID:

1. **Query CL Metadata**: Retrieve CL details and verify its current status:
   ```bash
   gerrit_client.py \
     changes \
     --host https://chromium-review.googlesource.com \
     --query "change:<id>"
   ```
2. **Fetch File Contents**: Retrieve the content of specific files modified in
   the CL:
   ```bash
   gerrit_client.py \
     content \
     --host https://chromium-review.googlesource.com \
     --project <project> \
     --change <change_id> --revision current --path <file_path>
   ```
3. **Analyze Local Modifications**: Inspect the fetched contents and local diffs
   for any logic or formatting issues.
4. **Add Review Comment**: Post a patchset-level comment containing the review
   findings:
   ```bash
   gerrit_client.py \
     addpatchsetcomment \
     --host https://chromium-review.googlesource.com \
     --change <change_id> --revision current \
     --message "Review findings: ..."
   ```

## 2. Shepherding & Submission Workflow

Execute these steps in chronological order to approve and merge a Change List:

1. **Check Related Changes**: Retrieve the status of all related changes to
   ensure there are no unresolved blockers:
   ```bash
   gerrit_client.py \
     relatedchanges \
     --host https://chromium-review.googlesource.com \
     --change <change_id> --revision current
   ```
2. **Vote on Review Labels**: Apply the required Code-Review approval vote:
   ```bash
   gerrit_client.py \
     setlabel \
     --host https://chromium-review.googlesource.com \
     --change <change_id> \
     --label Code-Review 1
   ```
3. **Submit Change**: Merge the change once all CQ presubmits pass and all
   approval requirements are satisfied:
   ```bash
   gerrit_client.py \
     submitchange \
     --host https://chromium-review.googlesource.com \
     --change <change_id>
   ```
