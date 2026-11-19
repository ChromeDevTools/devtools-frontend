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
- **Verify non-zero test counts**: Always confirm the literal Karma summary lines `Executed N of M ... SUCCESS` and `TOTAL: N SUCCESS` (or `N passing` for `--node-unit-tests`, API tests, and E2E tests) with `N > 0`. A `0` count means no tests ran (for example, a filter mismatch or a target missing from `front_end/BUILD.gn`).
- **`--skip-ninja` & `esbuild` vs. `tsc` typecheck gap**: `./dt test --skip-ninja` runs stale `out/Default/gen/` outputs without rebuilding, and `devtools_entrypoint("bundle")` bundles production `.ts` sources via `esbuild` while `-dts` emits declarations with `tsc --noCheck`, so misusing an `import type` binding as a runtime value (`TS1361`) can slip past fast local runs and fail CQ compilation. Always build `autoninja -C out/Default front_end/<module>:unittests` (or `:foundation_unittests`, or full `autoninja -C out/Default`) before uploading.
- **E2E bundle & concurrency**: Unit test runs do **not** build the full DevTools frontend bundle required by E2E tests; run `autoninja -C out/Default` (or one E2E test without `--skip-ninja`) before passing `--skip-ninja` to E2E suites. Never run multiple E2E test suites concurrently on the same host, because Headless Chrome CPU contention causes flaky timeouts.

## Building & compiling

- Check for build issues by running `autoninja -C out/Default`.
- For targeted module typechecking, build `autoninja -C out/Default front_end/<module>:unittests` or `front_end/<module>:foundation_unittests` (which run both `:*_checked` and foundation `:*_node_typecheck` validations; when a public signature changes, build `front_end:unittests` and `front_end:api_tests` to check cross-module test callers). Prefix targets with `third_party/devtools-frontend/src/` when `out/Default` is in a Chromium checkout.

## Linting & Diff-Range Formatting

- `./dt lint` will execute ESLint and StyleLint. It will report any violations and automatically fix them where possible.
- To run the linter on a specific file or directory, you can run `./dt lint <PATH>` where `PATH` is a path to a file or directory. This will also automatically fix violations where possible.
  - **`--fix` caveat on partial migrations**: On partially migrated widgets that still mutate `this.contentElement` or call literal `document.createElement('div')`, `@devtools/no-imperative-dom-api` autofix can insert duplicate `DEFAULT_VIEW` stubs or broken `TemplateResult` rewrites. Pass `--no-fix` when inspecting partially migrated files.
  - **Local ESLint cache vs. `.css`-only edits**: `scripts/lint/eslint.mjs` caches TypeScript lint results locally unless `--lint-only` or `--debug` is passed, whereas CQ enables `--lint-only` via `LUCI_CONTEXT`. Re-run `./dt lint --debug <importing-file.ts>` or `./dt lint --lint-only` after `.css`-only changes so TypeScript rules that inspect imported stylesheets (such as `@devtools/no-unscoped-light-dom-styles`) re-evaluate.
  - **`eslint.config.mjs` burndown lists**: `@devtools/no-unscoped-light-dom-styles` uses a self-cleaning `burndown` option list that reports `staleBurndownEntry` once a listed `.ts` file has no unscoped Light DOM styles; remove the entry in the same CL and never add new files. `@devtools/prefer-private-class-members` uses a central `files` ignore block that does not self-clean; remove migrated files from that block and do not combine a config ignore entry with an inline `eslint-disable` comment (`./dt lint` strips the unused inline directive).
- **Format changed line ranges with `git cl format --js`**: Always format with `git cl format --js` (without `--full`, or `git cl format --js --py` when Python files also change), because `PRESUBMIT.py` runs `git cl format --js` on diff line ranges only; around unchanged `// clang-format off` blocks inside `DEFAULT_VIEW`, `--full` uses a 6-space continuation indent vs. diff-range 2-space indent and fails presubmit with uncommitted diffs. Before uploading, verify `git diff` vs `git diff -w` has zero pure-whitespace hunks in non-CSS files.
- **Place `// clang-format off` inside `DEFAULT_VIEW` only**: Wrap only the `render(html\`...\`, target)` call inside the function body, never a long typed `DEFAULT_VIEW` signature; skipping formatting on long signatures fails commit-mode `CheckLongLines` (`> 120` columns).

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
- **Deterministic `ahem` goldens on Linux**: Linux screenshot tests render with the deterministic `ahem` font; never dismiss Linux screenshot failures as font or antialiasing noise. Fix the rendering regression or intentionally update goldens on Linux via `./dt test <file> --on-diff=update` (or `--apply-goldens` from Linux trybots).
- **Screenshot container height `<= 400px`**: Size Karma `assertScreenshot` containers at or below `400px` tall (for example `width: 600, height: 400`) inside Karma's `600px` iframe so Karma's outer scrollbar is not captured along the right edge.

## Best practices

- Run tests often to verify your changes.
- Prefer using a fast build, if it exists, to keep the feedback loop shorter.
- Periodically build to check for errors.
- Before uploading, run `./dt lint`, `git cl format --js` (or `git cl format --js --py`), `git cl presubmit -u --force` (catches ESLint rules such as `@stylistic/no-multiple-empty-lines` that `git cl format --js` ignores), and (after committing) commit-mode `git cl presubmit --force` (`-u` skips commit-only `CheckPanProjectChecksOnCommit` checks such as `CheckLongLines` `> 120` chars).
