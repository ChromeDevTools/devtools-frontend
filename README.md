# Chrome DevTools frontend

<!-- [START badges] -->
[![NPM package](https://img.shields.io/npm/v/chrome-devtools-frontend.svg)](https://npmjs.org/package/chrome-devtools-frontend)
<!-- [END badges] -->

The client-side of the Chrome DevTools, including all JS & CSS to run the DevTools webapp.

### Source code
The frontend is available on [chromium.googlesource.com](https://chromium.googlesource.com/devtools/devtools-frontend).

### Getting Started (Standalone)

As standalone project, Chrome DevTools front-end can be checked out and built independently from Chromium.

#### Checking out source

[Get depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up) first.

```bash
mkdir devtools
cd devtools
git clone https://chromium.googlesource.com/devtools/devtools-frontend
gclient config https://chromium.googlesource.com/devtools/devtools-frontend --unmanaged
```

#### Build
```bash
cd devtools-frontend
gclient sync
gn gen out/Default
autoninja -C out/Default
```

#### Run in Chromium (from M79 onwards)

To run the production build, use

```bash
<path-to-chrome>/chrome --custom-devtools-frontend=file://$(realpath out/Default/resources/inspector)
```

To run the debug build (directly symlinked to the original unminified source files),
build both Chromium and DevTools frontend with the GN flag `debug_devtools=true`, and use

```bash
<path-to-chrome>/chrome --custom-devtools-frontend=file://$(realpath out/Default/resources/inspector/debug)
```

### Getting Started (as part of Chromium)

DevTools frontend can also be developed as part of Chromium.

Follow [instructions](https://www.chromium.org/developers/how-tos/get-the-code) to check out Chromium.
DevTools frontend can be found under `chromium/src/third_party/devtools-frontend/src/`.

#### Build as part of Chromium

Refer to [instructions](https://www.chromium.org/developers/how-tos/get-the-code) to build Chromium.
To only build DevTools frontend, use `devtools_frontend_resources` as build target.

### Hacking
* DevTools documentation: [devtools.chrome.com](https://devtools.chrome.com)
* [Debugging protocol docs](https://developer.chrome.com/devtools/docs/debugger-protocol) and [Chrome Debugging Protocol Viewer](http://chromedevtools.github.io/debugger-protocol-viewer/)
* [awesome-chrome-devtools](https://github.com/paulirish/awesome-chrome-devtools): recommended tools and resources
* Contributing to DevTools: [bit.ly/devtools-contribution-guide](http://bit.ly/devtools-contribution-guide)
* Contributing To Chrome DevTools Protocol: [docs.google.com](https://docs.google.com/document/d/1c-COD2kaK__5iMM5SEx-PzNA7HFmgttcYfOHHX0HaOM/edit?usp=sharing)

### Useful Commands

#### `npm run format-py`
Formats your Python code using [yapf](https://github.com/google/yapf)

> Note: Yapf is a command line tool. You will have to install this manually, either from PyPi through `pip install yapf` or if you want to enable multiprocessing in Python 2.7, `pip install futures`

### Development
* All devtools commits: [View the log], [RSS feed] or [@DevToolsCommits] on Twitter
* [All open DevTools tickets] on crbug.com
* File a new DevTools ticket: [new.crbug.com](https://bugs.chromium.org/p/chromium/issues/entry?labels=OS-All,Type-Bug,Pri-2&components=Platform%3EDevTools)
* Code reviews mailing list: [devtools-reviews@chromium.org]
* [Test waterfall]

### NPM package

DevTools frontend is available on NPM as the [chrome-devtools-frontend](https://www.npmjs.com/package/chrome-devtools-frontend) package. It's not currently available via CJS or ES2015 modules, so consuming this package in other tools may require [some effort](https://github.com/paulirish/devtools-timeline-model/blob/master/index.js).

The version number of the npm package (e.g. `1.0.373466`) refers to the Chromium commit position of latest frontend git commit. It's incremented with every Chromium commit, however the package is updated roughly daily.

### Getting in touch
* [@ChromeDevTools] on Twitter
* Chrome DevTools mailing list: [groups.google.com/forum/google-chrome-developer-tools](https://groups.google.com/forum/#!forum/google-chrome-developer-tools)

  [devtools-reviews@chromium.org]: https://groups.google.com/a/chromium.org/forum/#!forum/devtools-reviews
  [RSS feed]: https://feeds.peter.sh/chrome-devtools/
  [View the log]: https://chromium.googlesource.com/devtools/devtools-frontend/+log/master
  [@ChromeDevTools]: http://twitter.com/ChromeDevTools
  [@DevToolsCommits]: http://twitter.com/DevToolsCommits
  [all open DevTools tickets]: https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3APlatform%3EDevTools&sort=&groupby=&colspec=ID+Stars+Owner+Summary+Modified+Opened
  [Test waterfall]: https://ci.chromium.org/p/devtools-frontend/g/main/console
