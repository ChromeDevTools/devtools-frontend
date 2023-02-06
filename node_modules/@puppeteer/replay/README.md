# @puppeteer/replay

<!-- [START badges] -->

[![Build status](https://github.com/puppeteer/replay/workflows/run-checks/badge.svg)](https://github.com/puppeteer/replay/actions?query=workflow%3Arun-checks) [![npm puppeteer package](https://img.shields.io/npm/v/@puppeteer/replay.svg)](https://npmjs.org/package/@puppeteer/replay)

<!-- [END badges] -->

###### [API](https://github.com/puppeteer/replay/blob/main/docs/api) | [Contributing](https://github.com/puppeteer/replay/blob/main/docs/contributing.md)

> Puppeteer Replay is a library that provides an API to replay and stringify recordings created using [Chrome DevTools Recorder](https://developer.chrome.com/docs/devtools/recorder/)

## Installation

```
npm install @puppeteer/replay --save
```

If you want to replay recordings using Puppeteer, install Puppeteer as well:

```
npm install puppeteer --save
```

## Getting started with Puppeteer Replay

You can use Puppeteer Replay to:

1. **Replay recording**. Replay recording with CLI or using [the replay lib API](/examples/replay-from-file-using-puppeteer/main.js).
2. **Customize replay**. Customize how a recording is run. For example, capture screenshots after each step or integrate with 3rd party libraries.
3. **Transform recoding**. Customize how a recording is stringified. For example, transform the recording into another format.

Also, you can use third-party integrations that build on top of `@puppeteer/replay`, which includes:

Transform JSON user flows to custom scripts:

- [Cypress Chrome Recorder](https://github.com/cypress-io/cypress-chrome-recorder). You can use it to convert user flow JSON files to Cypress test scripts. Watch this [demo](https://youtu.be/4qYs2bMz4GI) to see it in action.
- [Nightwatch Chrome Recorder](https://github.com/nightwatchjs/nightwatch-chrome-recorder). You can use it to convert user flow JSON files to Nightwatch test scripts.
- [WebdriverIO Chrome Recorder](https://github.com/webdriverio/chrome-recorder). You can use it to convert user flow JSON files to WebdriverIO test scripts.

Replay JSON user flows:

- [Replay with TestCafe](https://testcafe.io/documentation/403998/guides/experimental-capabilities/chrome-replay-support). You can use TestCafe to replay user flow JSON files and generate test reports for these recordings.
- [Replay with Sauce Labs](https://saucelabs.com/blog/how-to-create-test-scripts-using-chrome-devtools). You can replay the JSON files on [Sauce Labs](https://saucelabs.com/) using [saucectl](https://github.com/saucelabs/saucectl-replay-example).

## 1. Replay recording

Download this [example recording](https://storage.googleapis.com/web-dev-uploads/file/dPDCek3EhZgLQPGtEG3y0fTn4v82/vzQbv2rUfTz2DEmx06Gv.json) and save it as `recording.json`.

Using CLI + npx:

```
npx @puppeteer/replay recording.json
```

Using CLI + package.json:

In your `package.json` add a new script to invoke the `replay` command:

```json
{
  "scripts": {
    "replay": "replay recording.json"
  }
}
```

You can also give folder name as a parameter to run all the files in a folder.

Using CLI + npx:

```bash
npx @puppeteer/replay all-recordings # runs all recordings in the "all-recordings" folder.
```

Using CLI + package.json:

```json
{
  "scripts": {
    "replay": "replay all-recordings"
  }
}
```

Set the `PUPPETEER_HEADLESS` environment variable or `--headless` CLI flag to control whether the browser is start in a headful or headless mode. For example,

```
PUPPETEER_HEADLESS=true npx @puppeteer/replay recording.json # runs in headless mode, the default mode.
PUPPETEER_HEADLESS=false npx @puppeteer/replay recording.json # runs in headful mode.
PUPPETEER_HEADLESS=chrome npx @puppeteer/replay recording.json # runs in the new experimental headless mode.
```

Use the `--extension` CLI flag to provide a [custom replay extension](https://github.com/puppeteer/replay#2-customize-replay) for running the recording. For [example](https://github.com/puppeteer/replay/blob/main/examples/cli-extension/extension.js),

```sh
npx @puppeteer/replay --extension examples/cli-extension/extension.js recording.json
```

Run `npx @puppeteer/replay --help` to see all CLI options.

Using [the replay lib API](/examples/replay-from-file-using-puppeteer/main.js):

```js
import { createRunner, parse } from '@puppeteer/replay';
import fs from 'fs';

// Read recording for a file.
const recordingText = fs.readFileSync('./recording.json', 'utf8');
// Validate & parse the file.
const recording = parse(JSON.parse(recordingText));
// Create a runner and execute the script.
const runner = await createRunner(recording);
await runner.run();
```

## 2. Customize replay

The library offers a way to customize how a recording is run. You can extend
the `PuppeteerRunnerExtension` class as shown in the example below.

Full example of the `PuppeteerRunnerExtension`: [link](/examples/extend-runner/main.js)

```js
import { createRunner, PuppeteerRunnerExtension } from '@puppeteer/replay';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
});

const page = await browser.newPage();

class Extension extends PuppeteerRunnerExtension {
  async beforeAllSteps(flow) {
    await super.beforeAllSteps(flow);
    console.log('starting');
  }

  async beforeEachStep(step, flow) {
    await super.beforeEachStep(step, flow);
    console.log('before', step);
  }

  async afterEachStep(step, flow) {
    await super.afterEachStep(step, flow);
    console.log('after', step);
  }

  async afterAllSteps(flow) {
    await super.afterAllSteps(flow);
    console.log('done');
  }
}

const runner = await createRunner(
  {
    title: 'Test recording',
    steps: [
      {
        type: 'navigate',
        url: 'https://wikipedia.org',
      },
    ],
  },
  new Extension(browser, page, 7000)
);

await runner.run();

await browser.close();
```

## 3. Transform recording

You can customize how a recording is stringified and use it to transform the recording format.

### Stringify a recording as a Puppeteer script

```js
import { stringify } from '@puppeteer/replay';

console.log(
  await stringify({
    title: 'Test recording',
    steps: [],
  })
);
```

### Customize how a recording is stringified

You can customize how a recording is stringified by extending the `PuppeteerStringifyExtension` class as shown in the example below.

Full example of `PuppeteerStringifyExtension` : [link](/examples/extend-stringify/main.js)

```js
import { stringify, PuppeteerStringifyExtension } from '@puppeteer/replay';

class Extension extends PuppeteerStringifyExtension {
  // beforeAllSteps?(out: LineWriter, flow: UserFlow): Promise<void>;
  async beforeAllSteps(...args) {
    await super.beforeAllSteps(...args);
    args[0].appendLine('console.log("starting");');
  }

  // beforeEachStep?(out: LineWriter, step: Step, flow: UserFlow): Promise<void>;
  async beforeEachStep(...args) {
    await super.beforeEachStep(...args);
    const [out, step] = args;
    out.appendLine(`console.log("about to execute step ${step.type}")`);
  }

  // afterEachStep?(out: LineWriter, step: Step, flow: UserFlow): Promise<void>;
  async afterEachStep(...args) {
    const [out, step] = args;
    out.appendLine(`console.log("finished step ${step.type}")`);
    await super.afterEachStep(...args);
  }

  // afterAllSteps?(out: LineWriter, flow: UserFlow): Promise<void>;
  async afterAllSteps(...args) {
    args[0].appendLine('console.log("finished");');
    await super.afterAllSteps(...args);
  }
}

console.log(
  await stringify(
    {
      title: 'Test recording',
      steps: [
        {
          type: 'navigate',
          url: 'https://wikipedia.org',
        },
      ],
    },
    {
      extension: new Extension(),
      indentation: '	', // use tab to indent lines
    }
  )
);
```

## Others

### Test your extensions using the replay lib

The replay lib offers a canonical recording and a test page that allows to
verify that your extension produces all expected side effects on a page.

The test command supports both stringify and runner extensions. The stringify
extension will be tested by running the stringified script using node. Run the
test using the following command.

```
npx -p @puppeteer/replay replay-extension-test --ext path-to-your-extension-js
```

### Create a Chrome extension for Recorder (Available from Chrome 104 onwards)

You can create a Chrome extension for [Recorder](https://goo.gle/devtools-recorder). Refer to the [Chrome Extensions documentation](https://developer.chrome.com/docs/extensions/mv3/devtools/) for more details on how to extend DevTools.

For example, here are some of the third party extensions:

- [Cypress extension](https://chrome.google.com/webstore/detail/cypress-chrome-recorder/fellcphjglholofndfmmjmheedhomgin) lets you export JSON user flows as [Cypress test script](https://github.com/cypress-io/cypress-recorder-extension). [Cypress](https://cypress.io) is a front end testing tool built for the modern web.
- [WebPageTest extension](https://chrome.google.com/webstore/detail/webpagetest-recorder-exte/eklpnjohdjknellndlnepihjnhpaimok) lets you export user flows from the Recorder directly as [WebPageTest Custom scripts](https://docs.webpagetest.org/scripting/) to measure site's performance. See [Converting user flows to WebPageTest custom scripts](https://blog.webpagetest.org/posts/introducing-the-new-webpagetest-recorder-chrome-extension/) to learn more.
- [Nightwatch extension](https://chrome.google.com/webstore/detail/nightwatch-chrome-recorde/nhbccjfogdgkahamfohokdhcnemjafjk/) lets you export JSON user flows as [Nightwatch test script](https://github.com/nightwatchjs/nightwatch-recorder-extension). [Nightwatch](https://nightwatchjs.org/) is an end-to-end testing solution for web applications and websites.
- [Testing Library extension](https://chrome.google.com/webstore/detail/testing-library-recorder/pnobfbfcnoeealajjgnpeodbkkhgiici) lets you export JSON user flows as [Testing Library script](https://github.com/nickmccurdy/testing-library-recorder-extension). [Testing Library](https://testing-library.com/) has simple and complete testing utilities that encourage good testing practices.
- [WebdriverIO extension](https://chrome.google.com/webstore/detail/webdriverio-chrome-record/pllimkccefnbmghgcikpjkmmcadeddfn?hl=en&authuser=1) lets you export JSON user flows as [WebdriverIO test script](https://github.com/webdriverio/recorder-extension). [WebdriverIO](https://webdriver.io/) is an end-to-end testing solution for web, mobile and IoT applications and websites..

This feature only available from Chrome 104 onwards. Check your current Chrome version with `chrome://version`. Consider installing [Chrome Canary](https://www.google.com/chrome/canary/) to try out cutting-edge features in Chrome.

This repository contains an [example extension](https://github.com/puppeteer/replay/tree/main/examples/chrome-extension). Once installed, the Recorder will have a new export option **Export as a Custom JSON script** in the [export dropdown](https://developer.chrome.com/docs/devtools/recorder/#export-flows).

To load the example into Chrome DevTools. Follow these steps:

1. Download the [chrome-extension](https://github.com/puppeteer/replay/tree/main/examples/chrome-extension) folder.
2. [Load the folder as unpacked extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/#unpacked) in Chrome.
3. [Open a recording](https://developer.chrome.com/docs/devtools/recorder/#record) in the Recorder.
4. Click on [export](https://developer.chrome.com/docs/devtools/recorder/#export-flows). Now you can see a new **Export as a Custom JSON script** option in the export menu.

Click and watch the video demo below:

[![Demo video that shows how to extend export options in Recorder panel by adding a Chrome extension](https://user-images.githubusercontent.com/5917927/172872574-15ad8bea-142a-4972-bf1d-bf1379a955ba.png)](https://youtu.be/TCxIfbxgypQ)
