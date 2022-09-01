# Chrome DevTools frontend

<!-- [START badges] -->

[![npm package](https://img.shields.io/npm/v/chrome-devtools-frontend.svg)](https://npmjs.org/package/chrome-devtools-frontend)

<!-- [END badges] -->

The client-side of the Chrome DevTools, including all JS & CSS to run the DevTools webapp.

### Source code

The frontend is available on [chromium.googlesource.com](https://chromium.googlesource.com/devtools/devtools-frontend).

### Project documentation

Check out the [project documentation](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/README.md)
for instructions to set up, use, and maintain a DevTools front-end checkout, as well as design guidelines, and architectural
documentation.

### Additional references

- DevTools documentation: [devtools.chrome.com](https://devtools.chrome.com/)
- [Debugging protocol docs](https://developer.chrome.com/devtools/docs/debugger-protocol) and [Chrome Debugging Protocol Viewer](https://chromedevtools.github.io/debugger-protocol-viewer/)
- [awesome-chrome-devtools](https://github.com/paulirish/awesome-chrome-devtools): recommended tools and resources
- Contributing to DevTools: [bit.ly/devtools-contribution-guide](https://goo.gle/devtools-contribution-guide)
- Contributing To Chrome DevTools Protocol: [docs.google.com](https://goo.gle/devtools-contribution-guide-cdp)
- DevTools Design Review Guidelines: [design_guidelines.md](docs/design_guidelines.md)

### Source mirrors

DevTools frontend repository is mirrored on [GitHub](https://github.com/ChromeDevTools/devtools-frontend).

DevTools frontend is also available on NPM as the [chrome-devtools-frontend](https://www.npmjs.com/package/chrome-devtools-frontend) package. It's not currently available via CJS or ES modules, so consuming this package in other tools may require [some effort](https://github.com/paulirish/devtools-timeline-model/blob/master/index.js).

The version number of the npm package (e.g. `1.0.373466`) refers to the Chromium commit position of latest frontend git commit. It's incremented with every Chromium commit, however the package is updated roughly daily.

### Getting in touch

- All DevTools commits: [View the log] or follow [@DevToolsCommits] on Twitter
- [All open DevTools tickets] on crbug.com
- File a new DevTools ticket: [new.crbug.com](https://bugs.chromium.org/p/chromium/issues/entry?labels=OS-All,Type-Bug,Pri-2&components=Platform%3EDevTools)
- Code reviews mailing list: [devtools-reviews@chromium.org]
- [@ChromeDevTools] on Twitter
- Chrome DevTools mailing list: [groups.google.com/forum/google-chrome-developer-tools](https://groups.google.com/forum/#!forum/google-chrome-developer-tools)

  [devtools-reviews@chromium.org]: https://groups.google.com/a/chromium.org/forum/#!forum/devtools-reviews
  [View the log]: https://chromium.googlesource.com/devtools/devtools-frontend/+log/main
  [@ChromeDevTools]: http://twitter.com/ChromeDevTools
  [@DevToolsCommits]: http://twitter.com/DevToolsCommits
  [All open DevTools tickets]: https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3APlatform%3EDevTools&sort=&groupby=&colspec=ID+Stars+Owner+Summary+Modified+Opened
  [test waterfall]: https://ci.chromium.org/p/devtools-frontend/g/main/console
