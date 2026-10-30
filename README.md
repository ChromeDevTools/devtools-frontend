# Chrome DevTools frontend

<!-- [START badges] -->

[![npm package](https://img.shields.io/npm/v/chrome-devtools-frontend.svg)](https://npmjs.org/package/chrome-devtools-frontend)

<!-- [END badges] -->

This repository contains the client side of Chrome DevTools. It contains all
the TypeScript and CSS code that runs the DevTools web app.

### Source code and documentation

The source code is on [chromium.googlesource.com].

The [Chromium DevTools documentation] tells you how to do these tasks:

- [Set up] a DevTools frontend checkout.
- Use a DevTools frontend checkout.
- Maintain a DevTools frontend checkout.

The documentation also contains design guidelines and architecture
documentation.

Other documentation:

- DevTools user documentation: [devtools.chrome.com](https://devtools.chrome.com)
- Chrome DevTools Protocol documentation: [chromedevtools.github.io/devtools-protocol](https://chromedevtools.github.io/devtools-protocol)
- A list of Chrome DevTools resources: [github.com/paulirish/awesome-chrome-devtools](https://github.com/paulirish/awesome-chrome-devtools)
- How to contribute to Chrome DevTools: [goo.gle/devtools-contribution-guide](http://goo.gle/devtools-contribution-guide)
- How to contribute to the Chrome DevTools Protocol: [goo.gle/devtools-contribution-guide-cdp](https://goo.gle/devtools-contribution-guide-cdp)

### Source mirrors

There is a mirror of the DevTools frontend repository on
[GitHub](https://github.com/ChromeDevTools/devtools-frontend).

The DevTools frontend is also available on npm as the
[chrome-devtools-frontend](https://www.npmjs.com/package/chrome-devtools-frontend)
package. The package does not supply CJS modules or ES modules. Thus, it can be
difficult to use this package in other tools. For an example of how to use it,
see [this file](https://github.com/paulirish/devtools-timeline-model/blob/master/index.js).

The version number of the npm package (for example, `1.0.373466`) is the
Chromium commit position of the latest frontend Git commit. The version number
increases with each Chromium commit. But we publish the package only
approximately one time each day.

### Contact us

- Follow [@ChromeDevTools] on X (previously Twitter).
- Send a message to the Chrome DevTools mailing list: [g/google-chrome-developer-tools]
- Report a new DevTools bug: [goo.gle/devtools-bug]

### Get the latest news

To get the latest news about DevTools development, do one or more of these
steps:

- Read [What's new in DevTools].
- Read [Umar's Dev Tips].
- Follow these accounts on X:
  [@umaar](https://x.com/umaar),
  [@malyw](https://x.com/malyw),
  [@kdzwinel](https://x.com/kdzwinel),
  [@addyosmani](https://x.com/addyosmani),
  [@paul_irish](https://x.com/paul_irish),
  [@samccone](https://x.com/samccone),
  [@mathias](https://x.com/mathias),
  [@mattzeunert](https://x.com/mattzeunert),
  [@PrashantPalikhe](https://x.com/PrashantPalikhe),
  [@ziyunfei](https://x.com/ziyunfei), and
  [@bmeurer](https://x.com/bmeurer).
- Join the [g/devtools-reviews@chromium.org] mailing list. This list shows all
  pending code reviews.
- Read the [commit log], or follow [@DevToolsCommits] on X.
- See [all open DevTools bugs] on crbug.com.
- Use Chrome Canary and try the experiments.

  [Chromium DevTools documentation]: http://goo.gle/chromium-devtools
  [set up]: https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/get_the_code.md
  [chromium.googlesource.com]: https://chromium.googlesource.com/devtools/devtools-frontend
  [What's new in DevTools]: https://developer.chrome.com/docs/devtools/news
  [Umar's Dev Tips]: https://umaar.com/dev-tips
  [g/devtools-reviews@chromium.org]: https://groups.google.com/a/chromium.org/forum/#!forum/devtools-reviews
  [commit log]: https://chromium.googlesource.com/devtools/devtools-frontend/+log/main
  [@ChromeDevTools]: http://x.com/ChromeDevTools
  [@DevToolsCommits]: http://x.com/DevToolsCommits
  [all open DevTools bugs]: http://goo.gle/devtools-bugs
  [g/google-chrome-developer-tools]: https://groups.google.com/forum/#!forum/google-chrome-developer-tools
  [goo.gle/devtools-bug]: http://goo.gle/devtools-bug
