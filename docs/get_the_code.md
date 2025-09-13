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
npm run build
```

The resulting build artifacts can be found in `out/Default/gen/front_end`.

The build tools generally assume `Default` as the target (and `out/Default` as the
build directory). You can pass `-t <name>` (or `--target=<name>`) to use a different
target. For example

```bash
npm run build -- -t Debug
```

will build in `out/Debug` instead of `out/Default`. If the directory doesn't exist,
it'll automatically create and initialize it.

You can disable type checking (via TypeScript) by using the `devtools_skip_typecheck`
argument in your GN configuration. This uses [esbuild](https://esbuild.github.io/)
instead of `tsc` to compile the TypeScript files and generally results in much
shorter build times.

Additionally, we now bundle files together by default in all builds, which has
a build time cost. If you want an even fast fast build, you might want to opt
out of bundling by setting `devtools_bundle` to `false`

```bash
gn gen out/fast-build --args="devtools_skip_typecheck=true devtools_bundle=false"
```

and use `npm run build -- -t fast-build` to build this target (you can of course
also just change the `Default` target to skip bundling and type checking).


### Rebuilding automatically

You can use

```bash
npm run build -- --watch
```

to have the build script watch for changes in source files and automatically trigger
rebuilds as necessary.

#### Linux system limits

The watch mode uses `inotify` by default on Linux to monitor directories for changes.
It's fairly common to encounter a system limit on the number of files you can monitor.
For example, Ubuntu Lucid's (64bit) inotify limit is set to 8192.

You can get your current inotify file watch limit by executing:

```bash
cat /proc/sys/fs/inotify/max_user_watches
```

When this limit is not enough to monitor all files inside a directory, the limit must
be increased for the watch mode to work properly. You can set a new limit temporary with:

```bash
sudo sysctl fs.inotify.max_user_watches=524288
sudo sysctl -p
```

If you like to make your limit permanent, use:

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

You may also need to pay attention to the values of `max_queued_events` and `max_user_instances`
if you encounter any errors.

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

You can run a [build](#Build) of DevTools frontend in a pre-built Chrome or Chromium in order to avoid the expensive build. Options:

- Use the downloaded Chrome for Testing binary in `third_party/chrome`.
- Use the latest Chrome Canary. This includes any DevTools features that are only available in regular Chrome builds (`is_official_build` + `is_chrome_branded`), such as GenAI-related features.

#### Using `npm start` script (recommended)

With Chromium 136, we added (back) a `start` script that can be used to easily launch DevTools with pre-built [Chrome
for Testing](https://developer.chrome.com/blog/chrome-for-testing) or [Chrome Canary](https://www.google.com/chrome/canary/).
It'll also take care of automatically enabling/disabling experimental features that are actively being worked on. Use

```bash
npm start
```

to build DevTools front-end in `out/Default` (you can change this to `out/foo` by passing `--target=foo` if needed),
and open Chrome for Testing (in `third_party/chrome`) with the custom DevTools front-end. This will also monitor the
source files for changes while Chrome is running and automatically trigger a rebuild whenever source files change.

By default, `npm start` will automatically open DevTools for every new tab, you can use

```bash
npm start -- --no-open
```

to disable this behavior. You can also use

```bash
npm start -- --browser=canary
```

to run in Chrome Canary instead of Chrome for Testing; this requires you to install Chrome Canary manually first
(Googlers can install `google-chrome-canary` on gLinux). And finally use

```bash
npm start -- http://www.example.com
```

to automatically open `http://www.example.com` in the newly spawned Chrome tab. Use

```bash
npm start -- --verbose
```

to enable verbose logging, which among other things, also prints all output from Chrome to the terminal, which is
otherwise suppressed.


##### Controlling the feature set

By default `npm start` will enable a bunch of experimental features (related to DevTools) that are considered ready for teamfood.
To also enable experimental features that aren't yet considered sufficiently stable to enable them by default for the team, run:

```bash
# Long version
npm start -- --unstable-features

# Short version
npm start -- -u
```

Just like with Chrome itself, you can also control the set of enabled and disabled features using

```bash
npm start -- --enable-features=DevToolsWellKnown
npm start -- --disable-features=DevToolsWellKnown --enable-features=DevToolsFreestyler:multimodal/true
```

which you can use to override the default feature set.

##### Remote debugging

The `npm start` command also supports launching Chrome for remote debugging via

```bash
npm start -- --remote-debugging-port=9222
```

or

```bash
npm start -- --browser=canary --remote-debugging-port=9222 --user-data-dir=\`mktemp -d`
```

Note that you have to also pass the `--user-data-dir` and point it to a non-standard profile directory (a freshly created
temporary directory in this example) for security reason when using any Chrome version except for Chrome for Testing.
[This article](https://developer.chrome.com/blog/remote-debugging-port) explains the reasons behind it.

#### Running from file system

This works with Chromium 79 or later.
**(Requires `brew install coreutils` on Mac.)**

To run on **Mac**:

```bash
<path-to-devtools-frontend>./third_party/chrome/chrome-mac/Google\ Chrome\ for\ Testing.app/Contents/MacOS/Google\ Chrome\ for\ Testing --disable-infobars --disable-features=MediaRouter --custom-devtools-frontend=file://$(realpath out/Default/gen/front_end) --use-mock-keychain
```

To run on **Linux**:

```bash
<path-to-devtools-frontend>./third_party/chrome/chrome-linux/chrome --disable-infobars --custom-devtools-frontend=file://$(realpath out/Default/gen/front_end)
```

To run on **Windows**:

```bash
<path-to-devtools-frontend>\third_party\chrome\chrome-win\chrome.exe --disable-infobars --custom-devtools-frontend="<path-to-devtools-frontend>\out\Default\gen\front_end"
```

Note that `$(realpath out/Default/gen/front_end)` expands to the absolute path to build artifacts for DevTools frontend.

Open DevTools via F12 or Ctrl+Shift+J on Windows/Linux or Cmd+Option+I on Mac.

If you get errors along the line of `Uncaught TypeError: Cannot read property 'setInspectedTabId'` you probably specified an incorrect path - the path has to be absolute. On Mac and Linux, the file url will start with **three** slashes: `file:///Users/...`.

**Tip**: You can inspect DevTools with DevTools by undocking DevTools and then opening a second instance of DevTools (see keyboard shortcut above).

**Tip**: On Windows it is possible the browser will re-attach to an existing session without applying command arguments. Make sure that there are no active Chrome sessions running.

#### Running from remote URL

This works with Chromium 85 or later.

Serve the content of `out/Default/gen/front_end` on a web server, e.g. via `python -m http.server`.

Then point to that web server when starting Chromium, for example:

```bash
<path-to-devtools-frontend>/third_party/chrome/chrome-<platform>/chrome --disable-infobars --custom-devtools-frontend=http://localhost:8000/
```

Open DevTools via F12 or Ctrl+Shift+J on Windows/Linux or Cmd+Option+I on Mac.

#### Running in hosted mode

Serve the content of `out/Default/gen/front_end` on a web server, e.g. via `python3 -m http.server 8000`.

Then start Chrome, allowing for accesses from the web server:

```bash
<path-to-devtools-frontend>/third_party/chrome/chrome-<platform>/chrome --disable-infobars --remote-debugging-port=9222 --remote-allow-origins=http://localhost:8000 about:blank
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

## Chromium checkout

You can also work on the DevTools front-end within a full Chromium checkout.
This workflow is particularly useful if you are working on a feature or a bug
that spans back-end (Chromium C++ code) and front-end (DevTools TypeScript
code), but it's also useful for Chromies that need to make small patches to
DevTools front-end and don't want to go through the process of setting up a
dedicated [`devtools-frontend` standalone checkout](#standalone-checkout).

### Checking out source

Follow [instructions](https://www.chromium.org/developers/how-tos/get-the-code)
to check out Chromium. The DevTools front-end code is located inside the
`third_party/devtools-frontend/src/` folder (after running `gclient sync`).

### Build

The [instructions](https://www.chromium.org/developers/how-tos/get-the-code) on
the Chromium page apply as well here. In particular use

```bash
autoninja -C out/Default chrome
```

to build Chromium with the bundled DevTools front-end. You can also use

```bash
autoninja -C out/Default devtools_frontend_resources
```

to only build the DevTools front-end resources, which can afterwards be found in
the `out/Default/gen/third_party/devtools-frontend/src/front_end` folder.

### Run

Launch Chromium with the bundled DevTools front-end using

```bash
out/Default/chrome
```

or if you are only iterating on a small set of changes to the DevTools front-end
and used the `devtools_frontend_resources` build target, you can run Chrome with
the generated DevTools front-end artifacts using

```bash
out/Default/chrome --custom-devtools-frontend=file://$(realpath out/Default/gen/third_party/devtools-frontend/src/front_end)
```

afterwards, which can be quite a bit faster than building and linking the full
Chromium binary.

### Testing

To run the test suite, use `npm test` from within the DevTools front-end folder:

```bash
cd third_party/devtools-frontend/src
npm test
```

### Juggling the git submodules

Working on DevTools within a Chromium checkout means working across two separate
repositories (at the same time), which can be a bit tricky. Especially if you
are working on a change that spans across the boundary of the front-end and the
back-end, you'll need to cook two separate CLs. There are several ways to go
about this, and in here, we'll outline one somewhat well-lit path. You start by
creating a branch in both Chromium and DevTools:

```bash
git new-branch my-change-backend
pushd third_party/devtools-frontend/src
git new-branch my-change-frontend
popd
```

Now you go about developing your patch, and commit individually to Chromium and
DevTools repositories. When you're done, you can upload the changes individually
using `git cl upload`:

```bash
git cl upload
pushd third_party/devtools-frontend/src
git cl upload
popd
```

The tricky part is to get the checkout back into a well-defined state, which can
be accomplished using:

```bash
git checkout main
git -C third_party/devtools-frontend/src checkout \
  `gclient getdep -r src/third_party/devtools-frontend/src`
gclient sync
```

When you need to rebase your changes, also make sure to run the above commands
and afterwards rebase the changes in the repositories separately:

```bash
git checkout my-change-backend
git rebase
pushd third_party/devtools-frontend/src
git checkout my-change-frontend
git rebase
popd
```

## Integrated checkout

**This solution is experimental, please report any trouble that you run into!**

The integrated workflow offers the best of both worlds, and allows for working
on both Chromium and DevTools frontend side-by-side.

A full [Chromium checkout](#Chromium-checkout) is a pre-requisite for the
following steps.

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
