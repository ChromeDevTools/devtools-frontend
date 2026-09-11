---
name: fix-tests
description: Use this skill to reproduce and fix flaky and disabled tests.
---

# Workflow

This skill outlines the workflow for reproducing and fixing a flaky test in the DevTools codebase. The work should be divided into sub-agents that should only be started when certain criteria are met.

- You will be given as input, either a Chromium bug link (e.g. `crbug.com/1234567`), or a name of a test file and (optionally) the test name.
- For example: e2e/extensions/debugger-language-plugins.test.ts and "The Debugger Language Plugins/shows sensible error messages".
- If nothing is provided, ask the user which test you should run.
- Before starting the sub-agents, explain the workflow. For example:

```
I will attempt to reproduce the flakiness (simultaneously) locally and using the 'stressor bots'. Once issues are discovered, I will attempt to fix them.
```

## Reproduction agents

First, create and start two sub-agents simultaneously. One called 'local-repro' (that should attempt to reproduce the problem locally) and one called 'bot-repro' (that attempts to use the stressor bots to reproduce).

### Local reproduction (local-repro)

- Use command: `npm run test -- --repeat=<count> path/to/foo.test.ts:exact_test_id` to locally run the tests repeatedly. Both E2E and unit tests support this. Use the exact test ID printed in the test runner output (usually the suite and test names with spaces replaced by underscores). Do not use `--grep` or a `bash` script with a `for` loop.
- First run the test three times to note how long the test runs (on average).
- Then run the test continuously for 4 minutes, while noting any failures and failure rates. If the failure rate is still 0% after that, assume the problem does not reproduce locally.
- After the local test run completes, then show the results in a table. For example:

```
Test:                                                 Runs  Sec   Failures
"Recorder/should be able to start a replay..."         30   180   0 (0.00%)
"The Debugger Language Plugins/shows sensible..."      60   180   1 (1.67%)
```

If problems were detected, list the different problems found and how often they occurred. Ask the user if the errors match the ones they are trying to get rid of.

### Bot reproduction agent (bot-repro)

The second bot should do the following:

- Create a branch with a meaningful name, such as `deflake_<test_name>`.
- Ensure you use the instructions from the `devtools-version-control` skill to create and switch branches appropriately.
- Make a minor, harmless modification directly to the test file being investigated (e.g., adding a comment `// Trigger stressor bot`) to ensure the commit is not empty.
- Add this file (with `git add`) and commit it using a meaningful commit message (e.g., `git commit -m "Deflake <test name>"`). Ask the user which bug number to use for the changelist description.
- Upload this change using `git cl upload -f`. Always use `-f` (`--force`) so the upload runs non-interactively without opening a text editor or prompt. This creates a debugging CL that all agents (like the fix agent) will continue to work on.
- Note the <issue number> created during upload.
- To start the stressor bot, run this command (substituting `<test file>:exact_test_id` with the actual file and exact test ID):
  `git cl try -B devtools-frontend/try -b e2e_stressor_linux -b e2e_stressor_win64 -b e2e_stressor_mac -p runner_args='<test file>:exact_test_id --repeat=100'`
  - **Note on Screenshot Tests:** If the test involves screenshot assertions (`assertScreenshot`), it should ONLY be run on the Linux stressor bot (`-b e2e_stressor_linux`), because screenshot assertions are not supported on Mac or Windows. Furthermore, they cannot be reproduced locally on a Mac.
  - **Auth Issues:** If `git cl try` fails with a login error (e.g., `Login required: run bb auth-login`), inform the user so they can resolve the auth issue and ask you to retry.

- Note that the test file name needs to be relative to the root, so use `test/e2e/foo.test.ts` instead of `e2e/foo.test.ts`.
- Check the results of the stressor tests with `git cl try-results --issue=<issue number> --patchset=<patchset number>`. You can dive into each result by id using `bb get <id>`.
- Once a test run completes, always report to the user how often the tests ran and what the failure rate was.
- Critical: Make sure that at least one test ran to completion on the bot (to catch incorrect syntax for `git cl try` or incorrect test IDs).

## Next steps

- Monitor the results of the two agents. The local reproduction bot will likely finish sooner.
- If it does but doesn't reproduced the failure, ask the user this question:

```
While we wait for the bots to complete their run, would you like to:

1) Continue trying to reproduce locally
2) Start investigating the test
```

If they opt for investigating the test, start a new agent called 'fix-test'.

### Fixing the test (fix-test)

The test fixing sub-agent should do the following:

- Find the test in the codebase and look at its implementation. Look at the relevant production code that is being testing.
- Look at the failures reproduced in the test (if any) by prior sub-agents.
- Suggest a fix for the failure(s).
- IMPORTANT: Ensure any dummy comments added earlier to trigger the stressor bot are removed before finalizing the fix.
- Run the full verification process (TypeScript checks, and linters) as required by the repository best practices.
- Compile and run the test locally, to make sure there are no obvious errors introduced.
- Commit the changes (to the branch created earlier). Make sure to list (in the changelist description) the test name, the fix, reasoning for why the test failed, why the fix fixes the issue and the failure rate (if non-zero). If you were not able to reproduce the error, state that the fix is speculative. Ask the user to provide the bug number to use in the changelist description.
- CRITICAL: Iff the 'local-repro' bot does not reproduce the error, the 'fix-test' agent MUST wait until the stressor bot finishes its run before uploading the fix to the server (so that the stressor try run isn't aborted prematurely). If the error reproduces locally, you can upload immediately.
- Once it is safe to do so, upload the change with `git cl upload -f`.

## Results

- Always verify, by running the tests again that the problem has been fixed.
  - If the problem reproduces locally during your initially attempt, then always prefer a local reproduction run (don't use the bots).
  - But if the problem doesn't reproduce locally, always prefer the bot-repro but run the test locally (once only per fix) to verify the fix compiles and doesn't introduce a regression..
- For things that have (let's say) a 33% failure rate before fixing (for example), a smaller amount of run is needed to verify, than for tests with lower failure rate.
- CRITICAL: If the test fails again with the same error as before (or a new error), it is clear that the fix is not working and a new fix must be implemented (repeat the verification cycle).
- Upon completion, list the tests, state briefly why each test was failing and how the fix addresses the issue along with the failure rate before and after.
