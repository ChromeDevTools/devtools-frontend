# Gerrit CLI Workflows (Public)

## 1. Change List Review Workflow

Execute these steps in chronological order to review a Change List (CL) when
provided with a link or ID:

1. **Query CL Metadata**: Retrieve CL details and verify its current status:
   ```bash
   vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
     changes \
     --query "change:<id>"
   ```
2. **Fetch File Contents**: Retrieve the content of specific files modified in
   the CL:
   ```bash
   vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
     content \
     --change <change_id> --revision current --path <file_path>
   ```
3. **Analyze Local Modifications**: Inspect the fetched contents and local diffs
   for any logic or formatting issues.
4. **Add Review Comment**: Post a patchset-level comment containing the review
   findings:
   ```bash
   vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
     addpatchsetcomment \
     --change <change_id> --revision current \
     --message "Review findings: ..."
   ```

## 2. Shepherding & Submission Workflow

Execute these steps in chronological order to approve and merge a Change List:

1. **Check Related Changes**: Retrieve the status of all related changes to
   ensure there are no unresolved blockers:
   ```bash
   vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
     relatedchanges \
     --change <change_id> --revision current
   ```
2. **Vote on Review Labels**: Apply the required Code-Review approval vote:
   ```bash
   vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
     setlabel \
     --change <change_id> \
     --label Code-Review 1
   ```
3. **Submit Change**: Merge the change once all CQ presubmits pass and all
   approval requirements are satisfied:
   ```bash
   vpython3 .agents/skills/gerrit-cli/scripts/gerrit_client_wrapper.py \
     submitchange \
     --change <change_id>
   ```
