# Workflows

## Checkouts

In order to make changes to DevTools frontend, build, run, test, and submit changes, several workflows exist. Having [depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up) set up is a common prerequisite.

### Standalone checkout

As a standalone project, Chrome DevTools frontend can be checked out and built independently from Chromium. The main advantage is not having to check out and build Chromium.

However, to run layout tests, you need to use the [chromium checkout](#Chromium-checkout) or [integrated checkout](#Integrated-checkout).

#### Checking out source

To check out the source for DevTools frontend only, follow these steps:

```bash
mkdir devtools
cd devtools
fetch devtools-frontend
```

#### Build

To build, follow these steps:

```bash
cd devtools-frontend
gclient sync
gn gen out/Default
autoninja -C out/Default
```

The resulting build artifacts can be found in `out/Default/gen/front_end`.

If you want to have faster build by disabling typecheck, consider to use
`devtools_skip_typecheck=true` build args like:

```bash
gn gen out/fast-build --args='devtools_skip_typecheck=true'
```

#### Update to latest

To update to latest tip of tree version:

```bash
git fetch origin; git checkout origin/main  # or, alternatively: git rebase-update
gclient sync
```

#### Out of sync dependencies and cross-repo changes

The revisions of git dependencies must always be in sync between the entry in DEPS and the git submodule. PRESUBMIT will
reject CLs that try to submit changes to one but not the other.
It can happen that dependencies go out of sync for three main reasons:
1. The developer attempted a manual roll by only updating the DEPS file (which was the process before migrating to git
   submodules, see [below](#Managing-dependencies)),
1. after switching branches or checking out new commit the developer didn't run `gclient sync`, or
1. they are working across repositories including changes in both.

In the first case, follow the [manual roll process](#Managing-dependencies). In the second case,
running `gclient sync` is necessary. If the changes to the submodule versions were already added to any commits (this
happens when commits were created using `git add -A`, for example), it's necessary to unstage them (for example using
`git checkout -p origin/main`). The latter also applies in the third case: Create a CL excluding the dependency changes
and a separate CL with a proper roll.

#### Run in a pre-built Chromium

You can run a [build](#Build) of DevTools frontend in a pre-built Chromium in order to avoid the expensive Chromium build. For example, you can use the latest version of Chrome Canary, or the downloaded binary in `third_party/chrome`.

##### Running from file system

This works with Chromium 79 or later.
**(Requires `brew install coreutils` on Mac.)**

To run on **Mac**:

```bash
<path-to-devtools-frontend>./third_party/chrome/chrome-mac/Google\ Chrome\ for\ Testing.app/Contents/Mac OS/Google\ Chrome\ for\ Testing --custom-devtools-frontend=file://$(realpath out/Default/gen/front_end) --use-mock-keychain
```

To run on **Linux**:

```bash
<path-to-devtools-frontend>./third_party/chrome/chrome-linux/chrome --custom-devtools-frontend=file://$(realpath out/Default/gen/front_end)
```

To run on **Windows**:

```bash
<path-to-devtools-frontend>./third_party/chrome/chrome-win/chrome.exe --custom-devtools-frontend=file://$(realpath out/Default/gen/front_end)
```

Note that `$(realpath out/Default/gen/front_end)` expands to the absolute path to build artifacts for DevTools frontend.

Open DevTools via F12 or Ctrl+Shift+J on Windows/Linux or Cmd+Option+I on Mac.

If you get errors along the line of `Uncaught TypeError: Cannot read property 'setInspectedTabId'` you probably specified an incorrect path - the path has to be absolute. On Mac and Linux, the file url will start with __three__ slashes: `file:///Users/...`.

**Tip**: You can inspect DevTools with DevTools by undocking DevTools and then opening a second instance of DevTools (see keyboard shortcut above).

##### Running from remote URL

This works with Chromium 85 or later.

Serve the content of `out/Default/gen/front_end` on a web server, e.g. via `python -m http.server`.

Then point to that web server when starting Chromium, for example:

```bash
<path-to-devtools-frontend>/third_party/chromium/chrome-<platform>/chrome --custom-devtools-frontend=http://localhost:8000/
```

Open DevTools via F12 or Ctrl+Shift+J on Windows/Linux or Cmd+Option+I on Mac.

##### Running in hosted mode

Serve the content of `out/Default/gen/front_end` on a web server, e.g. via `python3 -m http.server 8000`.

Then start Chromium, allowing for accesses from the web server:

```bash
<path-to-devtools-frontend>/third_party/chrome/chrome-<platform>/chrome --remote-debugging-port=9222 --remote-allow-origins=http://localhost:8000 about:blank
```

Get the list of pages together with their DevTools frontend URLs:
```bash
$ curl http://localhost:9222/json -s | grep '\(url\|devtoolsFrontend\)'
   "devtoolsFrontendUrl": "/devtools/inspector.html?ws=localhost:9222/devtools/page/BADADD4E55BADADD4E55BADADD4E5511",
   "url": "about:blank",
```

In a regular Chrome tab, go to the URL `http://localhost:8000/inspector.html?ws=<web-socket-url>`, where `<web-socket-url>` should be replaced by
your desired DevTools web socket URL (from `devtoolsFrontendUrl`). For example, for
`"devtoolsFrontendUrl": "/devtools/inspector.html?ws=localhost:9222/devtools/page/BADADD4E55BADADD4E55BADADD4E5511"`,
you could run the hosted DevTools with the following command:

```
$ google-chrome http://localhost:8000/inspector.html?ws=localhost:9222/devtools/page/BADADD4E55BADADD4E55BADADD4E5511
```

### Integrated checkout

**This solution is experimental, please report any trouble that you run into!**

The integrated workflow offers the best of both worlds, and allows for working on both Chromium and DevTools frontend
side-by-side. This is strongly recommended for folks working primarily on DevTools.

This workflow will ensure that your local setup is equivalent to how Chromium infrastructure tests your change.

A full [Chromium checkout](#Chromium-checkout) is a pre-requisite for the following steps.

#### Untrack the existing devtools-frontend submodule

First, you need to untrack the existing devtools-frontend submodule in the chromium checkout. This ensures that devtools
isn't dragged along whenever you update your chromium dependencies.

In `chromium/src`, run `gclient sync` to make sure you have installed all required submodules.

```bash
gclient sync
```

Then, disable `gclient sync` for DevTools frontend inside of Chromium by editing `.gclient` config. From
`chromium/src/`, run

```bash
vim "$(gclient root)/.gclient"
```

In the `custom_deps` section, insert this line:

```python
"src/third_party/devtools-frontend/src": None,
```

Following this step, there are two approaches to manage your standalone checkout

#### Single gclient project

**Note: it's not possible anymore to manage the two projects in separate gclient projects.**

For the integrated checkout, create a single gclient project that automatically gclient sync's all dependencies for both
repositories. After checking out chromium, modify the .gclient file for `chromium/src` to add the DevTools project:

```python
solutions = [
  {
    # Chromium src project
    "name": "src",
    "url": "https://chromium.googlesource.com/chromium/src.git",
    "custom_deps": {
      "src/third_party/devtools-frontend/src": None,
    },
  },
  {
    # devtools-frontend project
    "name": "devtools-frontend",
    "managed": False,
    "url": "https://chromium.googlesource.com/devtools/devtools-frontend.git",
  }
]
```

Do not run `gclient sync` now, first create the symlink. In the same directory as the .gclient file, run:

```bash
ln -s src/third_party/devtools-frontend/src devtools-frontend
```

If you did run `gclient sync` first, remove the devtools-frontend directory and start over.

Run `gclient sync` after creating the link to fetch the dependencies for the standalone checkout.

### Chromium checkout

DevTools frontend can also be developed as part of the full Chromium checkout.
This workflow can be used to make small patches to DevTools as a Chromium engineer.
However, it is different to our infrastructure setup and how to execute general maintenance work, and therefore discouraged.

#### Checking out source

Follow [instructions](https://www.chromium.org/developers/how-tos/get-the-code) to check out Chromium. DevTools frontend can be found under `third_party/devtools-frontend/src/`.

#### Build

Refer to [instructions](https://www.chromium.org/developers/how-tos/get-the-code) to build Chromium.
To only build DevTools frontend, use `devtools_frontend_resources` as build target.
The resulting build artifacts for DevTools frontend can be found in `out/Default/gen/third_party/devtools-frontend/src/front_end`.

#### Run

Run Chrome with bundled DevTools frontend:

```bash
out/Default/chrome
```

## Test

### DevTools frontend

Test are available by running scripts in `scripts/test/`. Please refer to the [overview document](https://docs.google.com/document/d/1c2KLKoFMqLB2A9sNAHIhYb70XFyfBUBs5BZSYfQAT-Y/edit). The current test status can be seen at the [test waterfall](https://ci.chromium.org/p/devtools-frontend/g/main/console).

### Layout tests

After building content shell as part of Chromium, we can also run layout tests that are relevant for DevTools frontend:

```bash
autoninja -C out/Default content_shell
third_party/blink/tools/run_web_tests.py -t Default http/tests/devtools
```

To debug a failing layout test we can run
```bash
npm run debug-test -- http/tests/devtools/<path>/<to>/<test>.js
```

The script supports either default DevTools checkout inside the chromium tree or side-by-side checkouts of chromium and DevTools. Passing --custom-devtools-frontend is not supported currently, meaning in the side-by-side scenario the DevTools checkout inside the chromium tree will be used (if not symlinked).
## Creating a change

Usual [steps](https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md#creating-a-change) for creating a change work out of the box, when executed in the DevTools frontend repository.

Tips to create meaningful CL descriptions:
- Provide information on what was changed and why
- Provide before/after screenshots (if applicable)
- Provide relevant link to demo or example (if applicable)
- Provide link to design doc (if applicable)

Example CL, adapted from [Chromium guidelines](https://chromium.googlesource.com/chromium/src/+/main/docs/contributing.md#uploading-a-change-for-review):

```
Summary of change (one line)

Longer description of change addressing as appropriate:
what change was made, why the change is made, context if
it is part of many changes, description of previous behavior
and newly introduced differences, etc.

Long lines should be wrapped to 72 columns for easier log message
viewing in terminals.

How to test:
  1. ..
  2. ..

Before:  https://page-to-before-screenshot.com/before
After:  https://page-to-after-screenshot.com/after
Bug: 123456

```
## Managing dependencies

If you need to manually roll a git dependency, it's not sufficient to update the revision in the DEPS file. Instead, use
the gclient tool:
```bash
gclient setdep -r DEP@REV # for example build@afe0125ef9e10b400d9ec145aa18fca932369346
```
This will simultaneously update both the DEPS entry as well as the gitlink entry for the corresponding git submodule.

To sync dependencies from Chromium to DevTools frontend, use `scripts/deps/roll_deps.py && npm run generate-protocol-resources`.
Note that this may:
- Introduce unneeded whitespace/formatting changes. Presubmit scripts (e.g. invoked via `git cl upload`) will automatically fix these locally, so just apply the changes directly to your change (e.g. with `git commit --amend`) afterwards.
- Introduce breaking changes to the devtools protocol, causing compilation failures. Unfortunately these need to be handled manually as there are some changes (e.g. removing an enum value) that cannot fail gracefully.


The following scripts run as AutoRollers, but can be manually invoked if desired:

- To roll the HEAD commit of DevTools frontend into Chromium, use `scripts/deps/roll_to_chromium.py`.
- To update DevTools frontend's DEPS, use `roll-dep`.

## Merges and cherry-picks

_Merge request/approval is handled by Chromium Release Managers. DevTools follows [Chromium's merge criteria](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/docs/process/merge_request.md#merge-criteria-phases). In exceptional cases please get in touch with hablich@chromium.org._

Step-by-step guide on how to merge:

1. Request approval to merge by adding the `Merge-Request-XX` label to the relevant crbug. A bot will come by and either ask for more info ([example](https://bugs.chromium.org/p/chromium/issues/detail?id=1123307#c1)) or approve the request.
1. Backmerges are done to the `chromium/xxxx` (e.g. `chromium/3979`) branch on the DevTools frontend repo.
   Use <https://chromiumdash.appspot.com/branches> or [Omahaproxy](https://omahaproxy.appspot.com/)
   to find out what branch a major Chromium version has (column `true_branch`).
1. Open the to-be-merged commit in Gerrit
   ([example](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/1928912)).
1. Click the hamburger menu on the top right and select “Cherry pick”.
1. Select the branch to merge to e.g. `chromium/3968`.
1. The cherry-pick CL is created
   ([example](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/1928913)).
1. Get it reviewed if necessary.
1. Once merge request approval is granted (see step 1), click the hamburger menu on the cherry-pick CL and select “Submit”. (Setting the Commit-Queue bit (+2) has no effect because these branches don’t have a commit queue.)
1. Done.

### Merge conflicts

If the approach above causes conflicts that need resolving, you can use an alternative git workflow which allows you to resolve conflicts locally before uploading. This is very similar to the [chromium git merge steps](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/docs/process/merge_request.md#using-git) but with different branch names. These steps will **create the cherry-pick CL via git**.

_It is suggested to use the Gerrit UI approach when possible, it is more straightforward and automated. Only use this approach if your cherry-pick causes conflicts._

For the commands below, replace `xxxx` with the Chromium branch number that you are merging into.

To set up your local environment run:

```
gclient sync --with_branch_heads
git fetch
git checkout -b BRANCH_NAME origin/chromium/xxxx
git cl upstream origin/chromium/xxxx
```

You can then cherry-pick your commit from the main branch:

```
git cherry-pick -x YOUR_COMMIT
```

You can then resolve any conflicts, run tests, build DevTools, etc, locally to verify everything is working. Then run `git cl upload` to upload the CL and get a review as normal.

**Make sure you remove the Change-ID: line** from the description to avoid issues when uploading the CL.

## Useful Commands

### `git cl format --js`

Formats all code using clang-format.

### `npm run check`

Runs all static analysis checks on DevTools code.
