# Get the Code: Checkout and Build Chromium DevTools front-end

In order to make changes to DevTools frontend, build, run, test, and submit changes, several workflows exist. Having [depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up) set up is a common prerequisite.

[TOC]

## Standalone checkout

As a standalone project, Chrome DevTools frontend can be checked out and built independently from Chromium. The main advantage is not having to check out and build Chromium.

However, to run layout tests, you need to use the [chromium checkout](#Chromium-checkout) or [integrated checkout](#Integrated-checkout).

### Checking out source

To check out the source for DevTools frontend only, follow these steps:

```bash
mkdir devtools
cd devtools
fetch devtools-frontend
```

### Build

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

### Update to latest

To update to latest tip of tree version:

```bash
git fetch origin; git checkout origin/main  # or, alternatively: git rebase-update
gclient sync
```

### Out of sync dependencies and cross-repo changes

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

### Run in a pre-built Chromium

You can run a [build](#Build) of DevTools frontend in a pre-built Chromium in order to avoid the expensive Chromium build. For example, you can use the latest version of Chrome Canary, or the downloaded binary in `third_party/chrome`.

#### Running from file system

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

#### Running from remote URL

This works with Chromium 85 or later.

Serve the content of `out/Default/gen/front_end` on a web server, e.g. via `python -m http.server`.

Then point to that web server when starting Chromium, for example:

```bash
<path-to-devtools-frontend>/third_party/chromium/chrome-<platform>/chrome --custom-devtools-frontend=http://localhost:8000/
```

Open DevTools via F12 or Ctrl+Shift+J on Windows/Linux or Cmd+Option+I on Mac.

#### Running in hosted mode

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

## Integrated checkout

**This solution is experimental, please report any trouble that you run into!**

The integrated workflow offers the best of both worlds, and allows for working on both Chromium and DevTools frontend
side-by-side. This is strongly recommended for folks working primarily on DevTools.

This workflow will ensure that your local setup is equivalent to how Chromium infrastructure tests your change.

A full [Chromium checkout](#Chromium-checkout) is a pre-requisite for the following steps.

### Untrack the existing devtools-frontend submodule

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

### Single gclient project

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

## Chromium checkout

DevTools frontend can also be developed as part of the full Chromium checkout.
This workflow can be used to make small patches to DevTools as a Chromium engineer.
However, it is different to our infrastructure setup and how to execute general maintenance work, and therefore discouraged.

### Checking out source

Follow [instructions](https://www.chromium.org/developers/how-tos/get-the-code) to check out Chromium. DevTools frontend can be found under `third_party/devtools-frontend/src/`.

### Build

Refer to [instructions](https://www.chromium.org/developers/how-tos/get-the-code) to build Chromium.
To only build DevTools frontend, use `devtools_frontend_resources` as build target.
The resulting build artifacts for DevTools frontend can be found in `out/Default/gen/third_party/devtools-frontend/src/front_end`.

### Run

Run Chrome with bundled DevTools frontend:

```bash
out/Default/chrome
```
