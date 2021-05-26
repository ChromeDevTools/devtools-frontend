// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Recorder from '../../../../../front_end/models/recorder/recorder.js';

describe('Recorder', () => {
  describe('RecordingScriptWriter', () => {
    it('should respect the given indentation', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      const script = writer.getScript({
        title: 'Test Recording',
        sections: [{
          title: 'First Section',
          url: 'https://localhost/',
          screenshot: '',
          steps: [],
        }],
      });
      assert.deepEqual(script, `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();


  await browser.close();
})();
`);
    });

    it('should print the correct script for a click step', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      writer.appendClickStep({
        type: 'click',
        context: {
          target: 'main',
          path: [],
        },
        selector: 'aria/Test' as Recorder.Steps.Selector,
      });
      assert.deepEqual(writer.getCurrentScript(), `const element = await frame.waitForSelector("aria/Test");
await element.click();
`);
    });

    it('should print the correct script for a change step', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      writer.appendChangeStep({
        type: 'change',
        context: {
          target: 'main',
          path: [],
        },
        selector: 'aria/Test' as Recorder.Steps.Selector,
        value: 'Hello World',
      });
      assert.deepEqual(writer.getCurrentScript(), `const element = await frame.waitForSelector("aria/Test");
await element.type("Hello World");
`);
    });

    it('should print the correct script for a submit step', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      const script = writer.getScript({
        title: 'Test Recording',
        sections: [{
          title: 'First Section',
          url: 'https://localhost/',
          screenshot: '',
          steps: [{
            type: 'submit',
            context: {
              target: 'main',
              path: [],
            },
            selector: 'aria/Test' as Recorder.Steps.Selector,
          }],
        }],
      });
      assert.deepEqual(script, `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  {
    const targetPage = page;
    let frame = targetPage.mainFrame();
    const element = await frame.waitForSelector("aria/Test");
    await element.evaluate(form => form.submit());
  }

  await browser.close();
})();
`);
    });

    it('should print the correct script for a emulateNetworkCondition step', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      const script = writer.getScript({
        title: 'Test Recording',
        sections: [{
          title: 'First Section',
          url: 'https://localhost/',
          screenshot: '',
          steps: [{
            type: 'emulateNetworkConditions',
            conditions: {
              download: 100,
              upload: 100,
              latency: 999,
            },
          }],
        }],
      });
      assert.deepEqual(script, `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  {
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 100,
      uploadThroughput: 100,
      latency: 999,
    });
  }

  await browser.close();
})();
`);
    });

    it('should print the correct script if the target is not the main page', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      const script = writer.getScript({
        title: 'Test Recording',
        sections: [{
          title: 'First Section',
          url: 'https://localhost/',
          screenshot: '',
          steps: [{
            type: 'click',
            context: {
              target: 'https://localhost/test',
              path: [],
            },
            selector: 'aria/Test' as Recorder.Steps.Selector,
          }],
        }],
      });
      assert.deepEqual(script, `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  {
    const target = await browser.waitForTarget(t => t.url === "https://localhost/test");
    const targetPage = await target.page();
    let frame = targetPage.mainFrame();
    const element = await frame.waitForSelector("aria/Test");
    await element.click();
  }

  await browser.close();
})();
`);
    });

    it('should print the correct script if the step is within an iframe', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      const script = writer.getScript({
        title: 'Test Recording',
        sections: [{
          title: 'First Section',
          url: 'https://localhost/',
          screenshot: '',
          steps: [{
            type: 'click',
            context: {
              target: 'main',
              path: [1, 1],
            },
            selector: 'aria/Test' as Recorder.Steps.Selector,
          }],
        }],
      });
      assert.deepEqual(script, `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  {
    const targetPage = page;
    let frame = targetPage.mainFrame();
    frame = frame.childFrames()[1];
    frame = frame.childFrames()[1];
    const element = await frame.waitForSelector("aria/Test");
    await element.click();
  }

  await browser.close();
})();
`);
    });

    it('should fail when given an invalid step type', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');

      const cb = () => writer.getScript({
        title: 'Test Recording',
        sections: [{
          title: 'First Section',
          url: 'https://localhost/',
          screenshot: '',
          steps: [{
            // @ts-ignore
            type: 'invalid',
            context: {
              target: 'main',
              path: [1, 1],
            },
            selector: 'aria/Test' as Recorder.Steps.Selector,
          }],
        }],
      });
      assert.throws(cb, Error, /^Unknown step type: invalid$/);
    });

    it('should print the correct script for a keydown step', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      const script = writer.getScript({
        title: 'Test Recording',
        sections: [{
          title: 'First Section',
          url: 'https://localhost/',
          screenshot: '',
          steps: [{
            type: 'keydown',
            context: {
              target: 'main',
              path: [],
            },
            key: 'E',
          }],
        }],
      });
      assert.deepEqual(script, `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  {
    const targetPage = page;
    let frame = targetPage.mainFrame();
    await targetPage.keyboard.down("E");
  }

  await browser.close();
})();
`);
    });

    it('should print the correct script for a keyup step', () => {
      const writer = new Recorder.RecordingScriptWriter.RecordingScriptWriter('  ');
      const script = writer.getScript({
        title: 'Test Recording',
        sections: [{
          title: 'First Section',
          url: 'https://localhost/',
          screenshot: '',
          steps: [{
            type: 'keyup',
            context: {
              target: 'main',
              path: [],
            },
            key: 'E',
          }],
        }],
      });
      assert.deepEqual(script, `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  {
    const targetPage = page;
    let frame = targetPage.mainFrame();
    await targetPage.keyboard.up("E");
  }

  await browser.close();
})();
`);
    });
  });
});
