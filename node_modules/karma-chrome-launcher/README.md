# karma-chrome-launcher

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/karma-runner/karma-chrome-launcher)
 [![npm version](https://img.shields.io/npm/v/karma-chrome-launcher.svg?style=flat-square)](https://www.npmjs.com/package/karma-chrome-launcher) [![npm downloads](https://img.shields.io/npm/dm/karma-chrome-launcher.svg?style=flat-square)](https://www.npmjs.com/package/karma-chrome-launcher)

[![Build Status](https://img.shields.io/travis/karma-runner/karma-chrome-launcher/master.svg?style=flat-square)](https://travis-ci.org/karma-runner/karma-chrome-launcher) [![Dependency Status](https://img.shields.io/david/karma-runner/karma-chrome-launcher.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-chrome-launcher) [![devDependency Status](https://img.shields.io/david/dev/karma-runner/karma-chrome-launcher.svg?style=flat-square)](https://david-dm.org/karma-runner/karma-chrome-launcher#info=devDependencies)

> Launcher for Google Chrome, Google Chrome Canary and Google Chromium.

## Installation

The easiest way is to keep `karma-chrome-launcher` as a devDependency in your `package.json`,
by running

```bash
$ npm i -D karma-chrome-launcher
```

## Configuration

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    browsers: ['Chrome', 'Chrome_without_security'], // You may use 'ChromeCanary', 'Chromium' or any other supported browser

    // you can define custom flags
    customLaunchers: {
      Chrome_without_security: {
        base: 'Chrome',
        flags: ['--disable-web-security', '--disable-site-isolation-trials']
      }
    }
  })
}
```

The `--user-data-dir` is set to a temporary directory but can be overridden on a custom launcher as shown below.
One reason to do this is to have a permanent Chrome user data directory inside the project directory to be able to
install plugins there (e.g. JetBrains IDE Support plugin).

```js
customLaunchers: {
  Chrome_with_debugging: {
    base: 'Chrome',
    chromeDataDir: path.resolve(__dirname, '.chrome')
  }
}
```

You can pass list of browsers as a CLI argument too:

```bash
$ karma start --browsers Chrome,Chrome_without_security
```

## Headless Chromium with Puppeteer

The Chrome DevTools team created [Puppeteer](https://github.com/GoogleChrome/puppeteer) - it will automatically install Chromium for all
platforms and contains everything you need to run it from within your CI.

### Available Browsers
*Note: Headless mode requires a browser version >= 59*

- Chrome (CHROME_BIN)
- ChromeHeadless (CHROME_BIN)
- Chromium (CHROMIUM_BIN)
- ChromiumHeadless (CHROMIUM_BIN)
- ChromeCanary (CHROME_CANARY_BIN)
- ChromeCanaryHeadless (CHROME_CANARY_BIN)
- Dartium (DARTIUM_BIN)

#### Usage
```bash
$ npm i -D puppeteer karma-chrome-launcher
```

```js
// karma.conf.js
process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = function(config) {
  config.set({
    browsers: ['ChromeHeadless']
  })
}
```

----

For more information on Karma see the [homepage].

[homepage]: http://karma-runner.github.com
