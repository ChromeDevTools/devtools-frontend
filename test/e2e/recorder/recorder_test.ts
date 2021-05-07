// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {enableExperiment, getBrowserAndPages, getTestServerPort, goToResource, waitForFunction} from '../../shared/helper.js';
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

async function startRecording(path: string, networkCondition: string = '') {
  await enableExperiment('recorder');
  await goToResource(path);

  const {frontend} = getBrowserAndPages();
  if (networkCondition) {
    await changeNetworkConditions(networkCondition);
  }

  await openSourcesPanel();
  await openRecorderSubPane();
  await createNewRecording('New recording');
  await frontend.click('aria/Record');
  await frontend.waitForSelector('aria/Stop');
}

async function stopRecording() {
  const {frontend} = getBrowserAndPages();
  await frontend.bringToFront();
  await frontend.waitForSelector('aria/Stop');
  await frontend.click('aria/Stop');
}

async function assertOutput(expected: string) {
  const textContent = await getCode();
  assert.strictEqual(textContent, expected);
}

describe('Recorder', function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  it('should capture the initial page as a navigation step', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html');
    await waitForScriptToChange();
    await stopRecording();
    await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    }
]`);
  });

  it('should capture clicks on buttons', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html');
    await waitForScriptToChange();

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('#test');
    await waitForScriptToChange();

    await stopRecording();
    await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Test Button"
    }
]`);
  });

  it('should not capture synthetic events', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html');
    await waitForScriptToChange();

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('#synthetic');
    await waitForScriptToChange();

    await stopRecording();
    await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Trigger Synthetic Event"
    }
]`);
  });

  it('should capture clicks on submit buttons inside of forms as click steps', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html');
    await waitForScriptToChange();

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('#form-button');
    await waitForScriptToChange();

    await stopRecording();
    await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Form Button"
    }
]`);
  });

  it('should build an aria selector for the parent element that is interactive', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html');
    await waitForScriptToChange();

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('#span');
    await waitForScriptToChange();

    await stopRecording();
    await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Hello World"
    }
]`);
  });

  it('should fall back to a css selector if an element does not have an accessible and interactive parent',
     async () => {
       const waitForScriptToChange = getWaitForScriptToChangeFunction();
       await startRecording('recorder/recorder.html');
       await waitForScriptToChange();

       const {target} = getBrowserAndPages();
       await target.bringToFront();
       await target.click('#span2');
       await waitForScriptToChange();

       await stopRecording();
       await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "span#span2"
    }
]`);
     });

  it('should create an aria selector even if the element is within a shadow root', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html');
    await waitForScriptToChange();

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('pierce/#inner-span');
    await waitForScriptToChange();

    await stopRecording();
    await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Hello World"
    }
]`);
  });

  it('should record interactions with elements within iframes', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html');
    await waitForScriptToChange();

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.mainFrame().childFrames()[0].click('#in-iframe');
    await waitForScriptToChange();
    await target.mainFrame().childFrames()[0].childFrames()[0].click('aria/Inner iframe button');
    await waitForScriptToChange();

    await stopRecording();
    await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [
                0
            ],
            "target": "main"
        },
        "selector": "aria/iframe button"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [
                0,
                0
            ],
            "target": "main"
        },
        "selector": "aria/Inner iframe button"
    }
]`);
  });

  it('should record interactions with popups', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html');
    await waitForScriptToChange();

    const {target, browser} = getBrowserAndPages();
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
    await stopRecording();

    await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Open Popup"
    },
    {
        "action": "click",
        "condition": {
            "expectedUrl": "https://<url>/test/e2e/resources/recorder/popup.html"
        },
        "context": {
            "path": [],
            "target": "https://<url>/test/e2e/resources/recorder/popup.html"
        },
        "selector": "aria/Button in Popup"
    },
    {
        "action": "close",
        "condition": null,
        "target": "https://<url>/test/e2e/resources/recorder/popup.html"
    }
]`);
  });

  it('should wait for navigations in the generated scripts', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html');
    await waitForScriptToChange();

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    const promise1 = target.waitForNavigation();
    await target.click('aria/Page 2');
    await promise1;
    await waitForScriptToChange();
    await target.waitForSelector('aria/Back to Page 1');
    const promise2 = target.waitForNavigation();
    await target.click('aria/Back to Page 1');
    await promise2;
    await waitForScriptToChange();

    await stopRecording();
    await assertOutput(`[
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": {
            "expectedUrl": "https://<url>/test/e2e/resources/recorder/recorder2.html"
        },
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Page 2"
    },
    {
        "action": "click",
        "condition": {
            "expectedUrl": "https://<url>/test/e2e/resources/recorder/recorder.html"
        },
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Back to Page 1"
    }
]`);
  });

  it('should also record network conditions', async () => {
    const waitForScriptToChange = getWaitForScriptToChangeFunction();
    await startRecording('recorder/recorder.html', 'Fast 3G');
    await waitForScriptToChange();

    const {frontend, target} = getBrowserAndPages();
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

    await stopRecording();
    await assertOutput(`[
    {
        "action": "emulateNetworkConditions",
        "condition": null,
        "conditions": {
            "download": 180000,
            "upload": 84375,
            "latency": 562.5
        }
    },
    {
        "action": "navigate",
        "condition": null,
        "url": "https://<url>/test/e2e/resources/recorder/recorder.html"
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Test Button"
    },
    {
        "action": "emulateNetworkConditions",
        "condition": null,
        "conditions": {
            "download": 50000,
            "upload": 50000,
            "latency": 2000
        }
    },
    {
        "action": "click",
        "condition": null,
        "context": {
            "path": [],
            "target": "main"
        },
        "selector": "aria/Test Button"
    }
]`);
  });
});
