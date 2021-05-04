// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, enableExperiment, getBrowserAndPages, getTestServerPort, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {createNewRecording, openRecorderSubPane, openSourcesPanel} from '../helpers/sources-helpers.js';

function retrieveCodeMirrorEditorContent() {
  // @ts-ignore
  return document.querySelector('.CodeMirror').CodeMirror.getValue();
}

async function getCode() {
  const {frontend} = getBrowserAndPages();
  const textContent = await frontend.evaluate(retrieveCodeMirrorEditorContent);
  // TODO: Change to replaceAll once it's supported in Node.js.
  return textContent.replace(new RegExp(`localhost:${getTestServerPort()}`, 'g'), '<url>')
      .replace(/\u200b/g, '')
      .trim();
}

function getWaitForScriptToChangeFunction() {
  let previousScript = '';
  return async function waitForScriptToChange() {
    const newScript = await waitForFunction(async () => {
      const currentScript = await getCode();
      return previousScript !== currentScript ? currentScript : undefined;
    });
    previousScript = newScript;
    return newScript;
  };
}

async function changeNetworkConditions(condition: string) {
  const {frontend} = getBrowserAndPages();
  await frontend.waitForSelector('pierce/#tab-network');
  await frontend.click('pierce/#tab-network');
  await frontend.waitForSelector('pierce/[aria-label="Throttling"]');
  await frontend.select('pierce/[aria-label="Throttling"] select', condition);
}

describe('Recorder', function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  it('should capture the initial page as a navigation step', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await waitForScriptToChange();

    await frontend.bringToFront();
    await frontend.waitForSelector('aria/Stop');
    await frontend.click('aria/Stop');
    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    await browser.close();
})();`);
  });

  it('should capture clicks on buttons', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend, target} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await waitForScriptToChange();
    await target.bringToFront();
    await target.click('#test');
    await waitForScriptToChange();

    await frontend.bringToFront();
    await frontend.waitForSelector('aria/Stop');
    await frontend.click('aria/Stop');
    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Test Button");
        await element.click();
    }
    await browser.close();
})();`);
  });

  it('should capture clicks on submit buttons inside of forms as click steps', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend, target} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await waitForScriptToChange();
    await target.bringToFront();
    await target.click('#form-button');
    await waitForScriptToChange();

    await frontend.bringToFront();
    await frontend.waitForSelector('aria/Stop');
    await frontend.click('aria/Stop');
    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Form Button");
        await element.click();
    }
    await browser.close();
})();`);
  });

  it('should build an aria selector for the parent element that is interactive', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend, target} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await waitForScriptToChange();
    await target.bringToFront();
    await target.click('#span');
    await waitForScriptToChange();

    await frontend.bringToFront();
    await frontend.waitForSelector('aria/Stop');
    await frontend.click('aria/Stop');
    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Hello World");
        await element.click();
    }
    await browser.close();
})();`);
  });

  it('should fall back to a css selector if an element does not have an accessible and interactive parent',
     async () => {
       const waitForScriptToChange = getWaitForScriptToChangeFunction();
       await enableExperiment('recorder');
       await goToResource('recorder/recorder.html');

       const {frontend, target} = getBrowserAndPages();

       await openSourcesPanel();
       await openRecorderSubPane();
       await createNewRecording('New recording');
       await frontend.click('aria/Record');
       await frontend.waitForSelector('aria/Stop');
       await waitForScriptToChange();
       await target.bringToFront();
       await target.click('#span2');
       await waitForScriptToChange();

       await frontend.bringToFront();
       await frontend.waitForSelector('aria/Stop');
       await frontend.click('aria/Stop');
       const textContent = await getCode();

       assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("span#span2");
        await element.click();
    }
    await browser.close();
})();`);
     });

  it('should create an aria selector even if the element is within a shadow root', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend, target} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await waitForScriptToChange();
    await target.bringToFront();
    await target.click('pierce/#inner-span');
    await waitForScriptToChange();

    await frontend.bringToFront();
    await frontend.waitForSelector('aria/Stop');
    await frontend.click('aria/Stop');
    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Hello World");
        await element.click();
    }
    await browser.close();
})();`);
  });

  it('should record interactions with elements within iframes', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend, target} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await waitForScriptToChange();
    await target.bringToFront();
    await target.mainFrame().childFrames()[0].click('#in-iframe');
    await waitForScriptToChange();
    await target.mainFrame().childFrames()[0].childFrames()[0].click('aria/Inner iframe button');
    await waitForScriptToChange();

    await frontend.bringToFront();
    await frontend.waitForSelector('aria/Stop');
    await frontend.click('aria/Stop');
    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame().childFrames()[0];
        const element = await frame.waitForSelector("aria/iframe button");
        await element.click();
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame().childFrames()[0].childFrames()[0];
        const element = await frame.waitForSelector("aria/Inner iframe button");
        await element.click();
    }
    await browser.close();
})();`);
  });

  it('should record interactions with popups', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {browser, frontend, target} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await waitForScriptToChange();
    await target.bringToFront();
    const newTargetPromise = browser.waitForTarget(t => t.url().endsWith('popup.html'));
    await target.click('aria/Open Popup');
    await waitForScriptToChange();
    const newTarget = await newTargetPromise;
    const newPage = await newTarget.page() as typeof target;
    await newPage.waitForSelector('aria/Button in Popup');
    // TODO: fix race condition by auto attach functionality via the browser target.
    await newPage.waitForTimeout(500);
    await newPage.click('aria/Button in Popup');
    await waitForScriptToChange();
    await newPage.close();
    await waitForScriptToChange();
    await frontend.bringToFront();
    await frontend.waitForSelector('aria/Stop');
    await frontend.click('aria/Stop');
    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Open Popup");
        await element.click();
    }
    {
        const target = await browser.waitForTarget(p => p.url() === "https://<url>/test/e2e/resources/recorder/popup.html");
        const targetPage = await target.page();
        const frame = targetPage.mainFrame();
        const promise = targetPage.waitForNavigation();
        const element = await frame.waitForSelector("aria/Button in Popup");
        await element.click();
        await promise;
    }
    {
        const target = await browser.waitForTarget(p => p.url() === "https://<url>/test/e2e/resources/recorder/popup.html");
        const targetPage = await target.page();
        await targetPage.close();
    }
    await browser.close();
})();`);
  });

  it('should wait for navigations in the generated scripts', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend, target} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await waitForScriptToChange();
    await target.bringToFront();
    await target.click('aria/Page 2');
    await waitForScriptToChange();
    await target.waitForSelector('aria/Back to Page 1');
    const promise = target.waitForNavigation();
    await target.click('aria/Back to Page 1');
    await promise;
    await waitForScriptToChange();

    await frontend.bringToFront();
    await frontend.waitForSelector('aria/Stop');
    await frontend.click('aria/Stop');
    const textContent = await getCode();
    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const promise = targetPage.waitForNavigation();
        const element = await frame.waitForSelector("aria/Page 2");
        await element.click();
        await promise;
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const promise = targetPage.waitForNavigation();
        const element = await frame.waitForSelector("aria/Back to Page 1");
        await element.click();
        await promise;
    }
    await browser.close();
})();`);
  });

  it('should record the interactions with the browser as a script', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend, target, browser} = getBrowserAndPages();

    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');

    // Record
    await frontend.click('aria/Record');
    await frontend.waitForSelector('aria/Stop');
    await waitForScriptToChange();
    await target.bringToFront();
    await target.click('#test');
    await waitForScriptToChange();
    await target.click('#form-button');
    await waitForScriptToChange();
    await target.click('#span');
    await waitForScriptToChange();
    await target.click('#span2');
    await waitForScriptToChange();
    // TODO(crbug.com/1157828): Enable again once this is fixed
    // await target.type('#input', 'test');
    // await target.keyboard.press('Enter');
    // await waitForScriptToChange();
    await target.click('pierce/#inner-span');
    await waitForScriptToChange();

    const iframe = await target.$('#iframe').then(x => x ? x.contentFrame() : null);
    // @ts-ignore This will not be null
    await iframe.click('#in-iframe');
    await waitForScriptToChange();
    await target.mainFrame().childFrames()[0].childFrames()[0].click('aria/Inner iframe button');
    await waitForScriptToChange();

    const newTargetPromise = browser.waitForTarget(t => t.url().endsWith('popup.html'));
    await target.click('aria/Open Popup');
    const newTarget = await newTargetPromise;
    const newPage = await newTarget.page() as typeof target;
    await newPage.waitForTimeout(500);
    await newPage.waitForSelector('aria/Button in Popup');
    await newPage.click('aria/Button in Popup');
    await waitForScriptToChange();
    await newPage.close();
    await waitForScriptToChange();

    await target.click('aria/Page 2');
    await waitForScriptToChange();
    await target.waitForSelector('aria/Back to Page 1');
    const promise = target.waitForNavigation();
    await target.click('aria/Back to Page 1');
    await waitForScriptToChange();
    await promise;


    await frontend.bringToFront();
    await frontend.waitForSelector('aria/Stop');
    await frontend.click('aria/Stop');
    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Test Button");
        await element.click();
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Form Button");
        await element.click();
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Hello World");
        await element.click();
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("span#span2");
        await element.click();
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Hello World");
        await element.click();
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame().childFrames()[0];
        const element = await frame.waitForSelector("aria/iframe button");
        await element.click();
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame().childFrames()[0].childFrames()[0];
        const element = await frame.waitForSelector("aria/Inner iframe button");
        await element.click();
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Open Popup");
        await element.click();
    }
    {
        const target = await browser.waitForTarget(p => p.url() === "https://<url>/test/e2e/resources/recorder/popup.html");
        const targetPage = await target.page();
        const frame = targetPage.mainFrame();
        const promise = targetPage.waitForNavigation();
        const element = await frame.waitForSelector("aria/Button in Popup");
        await element.click();
        await promise;
    }
    {
        const target = await browser.waitForTarget(p => p.url() === "https://<url>/test/e2e/resources/recorder/popup.html");
        const targetPage = await target.page();
        await targetPage.close();
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const promise = targetPage.waitForNavigation();
        const element = await frame.waitForSelector("aria/Page 2");
        await element.click();
        await promise;
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const promise = targetPage.waitForNavigation();
        const element = await frame.waitForSelector("aria/Back to Page 1");
        await element.click();
        await promise;
    }
    await browser.close();
})();`);
  });

  it('should also record network conditions', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await enableExperiment('recorder');
    await goToResource('recorder/recorder.html');

    const {frontend, target} = getBrowserAndPages();

    await changeNetworkConditions('Fast 3G');
    await openSourcesPanel();
    await openRecorderSubPane();
    await createNewRecording('New recording');
    // Record
    await click('[aria-label="Record"]');
    await waitFor('[aria-label="Stop"]');
    await waitForScriptToChange();
    await target.bringToFront();
    await target.click('#test');
    await waitForScriptToChange();
    await frontend.bringToFront();
    await changeNetworkConditions('Slow 3G');
    await openSourcesPanel();
    await waitForScriptToChange();
    await target.bringToFront();
    await target.click('#test');
    await waitForScriptToChange();
    await frontend.bringToFront();
    await waitFor('[aria-label="Stop"]');
    await click('[aria-label="Stop"]');
    const textContent = await getCode();

    assert.strictEqual(textContent, `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    {
        // Simulated network throttling (Fast 3G)
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        await client.send('Network.emulateNetworkConditions', {
        // Network connectivity is absent
        offline: false,
        // Download speed (bytes/s)
        downloadThroughput: 180000,
        // Upload speed (bytes/s)
        uploadThroughput: 84375,
        // Latency (ms)
        latency: 562.5,
        });
    }
    await page.goto("https://<url>/test/e2e/resources/recorder/recorder.html");
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Test Button");
        await element.click();
    }
    {
        // Simulated network throttling (Slow 3G)
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        await client.send('Network.emulateNetworkConditions', {
        // Network connectivity is absent
        offline: false,
        // Download speed (bytes/s)
        downloadThroughput: 50000,
        // Upload speed (bytes/s)
        uploadThroughput: 50000,
        // Latency (ms)
        latency: 2000,
        });
    }
    {
        const targetPage = page;
        const frame = targetPage.mainFrame();
        const element = await frame.waitForSelector("aria/Test Button");
        await element.click();
    }
    await browser.close();
})();`);
  });
});
