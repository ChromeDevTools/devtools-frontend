# Chrome DevTools frontend

<!-- [START badges] -->

[![npm package](https://img.shields.io/npm/v/chrome-devtools-frontend.svg)](https://npmjs.org/package/chrome-devtools-frontend)

<!-- [END badges] -->

The client-side of the Chrome DevTools, including all TypeScript & CSS to run the DevTools webapp.

### Source code and documentation

The frontend is available on [chromium.googlesource.com]. Check out the [Chromium DevTools
documentation] for instructions to [set up], use, and maintain a DevTools front-end checkout,
as well as design guidelines, and architectural documentation.

- DevTools user documentation: [devtools.chrome.com](https://devtools.chrome.com)
- Debugger protocol documentation: [chromedevtools.github.io/devtools-protocol](https://chromedevtools.github.io/devtools-protocol)
- Awesome Chrome DevTools: [github.com/paulirish/awesome-chrome-devtools](https://github.com/paulirish/awesome-chrome-devtools)
- Contributing to Chrome DevTools: [goo.gle/devtools-contribution-guide](http://goo.gle/devtools-contribution-guide)
- Contributing To Chrome DevTools Protocol: [goo.gle/devtools-contribution-guide-cdp](https://goo.gle/devtools-contribution-guide-cdp)

### Source mirrors

DevTools frontend repository is mirrored on [GitHub](https://github.com/ChromeDevTools/devtools-frontend).

DevTools frontend is also available on NPM as the [chrome-devtools-frontend](https://www.npmjs.com/package/chrome-devtools-frontend) package. It's not currently available via CJS or ES modules, so consuming this package in other tools may require [some effort](https://github.com/paulirish/devtools-timeline-model/blob/master/index.js).

The version number of the npm package (e.g. `1.0.373466`) refers to the Chromium commit position of latest frontend git commit. It's incremented with every Chromium commit, however the package is updated roughly daily.

### Getting in touch

- [@ChromeDevTools] on Twitter
- Chrome DevTools mailing list: [g/google-chrome-developer-tools]
- File a new DevTools ticket: [goo.gle/devtools-bug]

There are a few options to keep an eye on the latest and greatest of DevTools development:

- Follow [What's new in DevTools].
- Follow [Umar's Dev Tips].
- Follow these individual Twitter accounts:
  [@umaar](https://x.com/umaar),
  [@malyw](https://x.com/malyw),
  [@kdzwinel](https://x.com/kdzwinel),
  [@addyosmani](https://x.com/addyosmani),
  [@paul_irish](https://x.com/paul_irish),
  [@samccone](https://x.com/samccone),
  [@mathias](https://x.com/ziyunfei),
  [@mattzeunert](https://x.com/mattzeunert),
  [@PrashantPalikhe](https://x.com/PrashantPalikhe),
  [@ziyunfei](https://x.com/ziyunfei), and
  [@bmeurer](https://x.com/bmeurer).
- Follow to [g/devtools-reviews@chromium.org] mailing list for all reviews of pending code,
  and [view the log], or follow [@DevToolsCommits] on Twitter.
- Checkout [all open DevTools tickets] on crbug.com
- Use Chrome Canary and poke around the experiments.

  [Chromium DevTools documentation]: http://goo.gle/chromium-devtools
  [set up]: https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/get_the_code.md
  [chromium.googlesource.com]: https://chromium.googlesource.com/devtools/devtools-frontend
  [What's new in DevTools]: https://developer.chrome.com/docs/devtools/news
  [Umar's Dev Tips]: https://umaar.com/dev-tips
  [g/devtools-reviews@chromium.org]: https://groups.google.com/a/chromium.org/forum/#!forum/devtools-reviews
  [view the log]: https://chromium.googlesource.com/devtools/devtools-frontend/+log/main
  [@ChromeDevTools]: http://x.com/ChromeDevTools
  [@DevToolsCommits]: http://x.com/DevToolsCommits
  [all open DevTools tickets]: http://goo.gle/devtools-bugs
  [g/google-chrome-developer-tools]: https://groups.google.com/forum/#!forum/google-chrome-developer-tools
  [goo.gle/devtools-bug]: http://goo.gle/devtools-bug
