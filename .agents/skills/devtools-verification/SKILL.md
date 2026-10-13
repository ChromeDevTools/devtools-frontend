---
name: devtools-verification
description: "MANDATORY: Activate this skill ANY TIME you need to build the project, run tests, or verify code health in DevTools. You MUST use this skill before executing commands like ./dt test, ./dt build, autoninja, or linters (never run these through npm or npx), as it contains critical, repository-specific instructions on how to correctly format these commands, filter test runs, and interpret failures."
---

# Instructions on how to verify your changes

## Running scripts

Run the scripts from the root `package.json` (`test`, `lint`, `build`, `start`, and so on) with `./dt <script> [args]` from the repository root (on Windows: `.\dt <script> [args]`). Don't use `npm run`, `npm test`, or `npx` for them. Run `./dt` without arguments to list the available scripts. Arguments after the script name are passed to the script as is, so don't add a `--` separator.

## Testing

- To test a file, you can run `./dt test <FILEPATH>` where `FILEPATH` is a path to a `*.test.ts` file, relative to the working directory.
- Test files are usually defined alongside their implementation. So if you are working on `front_end/panels/timeline/TimelinePanel.ts`, you would expect the test file to be defined in `front_end/panels/timeline/TimelinePanel.test.ts`.
- You can also test an entire directory. For example, `./dt test front_end/models/trace` will run all tests in that directory.

## Building & compiling

- Check for build issues by running `autoninja -C out/Default`.

## Linting

- `./dt lint` will execute ESLint and StyleLint. It will report any violations and automatically fix them where possible.
- To run the linter on a specific file or directory, you can run `./dt lint <PATH>` where `PATH` is a path to a file or directory. This will also automatically fix violations where possible.

## Fetching Tryjob Results, Failure Logs, & Screenshot Goldens

Use `scripts/tools/get_cl_test_results.py` to fetch all tryjob build statuses, per-test failure logs, Blink web test text diffs, and screenshot artifacts (`actual_image`, `expected_image`, `image_diff`) for a CL in one command:

```bash
# Fetch all build statuses, failure logs, and artifacts for a CL into an output directory:
scripts/tools/get_cl_test_results.py --cl <CL_NUMBER> --output-dir <OUTPUT_DIR>

# Filter for specific failing tests (e.g. DOMTreeWidget) or specific builders:
scripts/tools/get_cl_test_results.py --cl <CL_NUMBER> --test-filter "DOMTreeWidget" --output-dir <OUTPUT_DIR>

# Also apply Linux actual_image screenshot artifacts directly to test/goldens/linux/...:
scripts/tools/get_cl_test_results.py --cl <CL_NUMBER> --output-dir <OUTPUT_DIR> --apply-goldens
```

### Screenshot Golden & Inspection Rules
- **Linux-only goldens**: Never generate, update, or commit golden PNGs from macOS. Screenshot tests in DevTools only use Linux goldens (`test/goldens/linux/...`) produced by Linux trybots (`dtf_linux_rel` / `dtf_linux_dbg`). Do not run screenshot tests locally on macOS to verify goldens.
- **Multimodal inspection only**: Always inspect `actual_image.png`, `expected_image.png`, and `image_diff.png` directly using your multimodal file viewer (`view_file`). Never write or run programmatic image comparison scripts.

## Best practices

- Run tests often to verify your changes.
- Prefer using a fast build, if it exists, to keep the feedback loop shorter.
- Periodically build to check for errors.
- Run `git cl presubmit -u` at the end of your code changes.
