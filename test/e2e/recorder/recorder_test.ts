// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {UserFlow, Selector} from '../../../front_end/models/recorder/Steps.js';

import {enableExperiment, getBrowserAndPages, getTestServerPort, goToResource} from '../../shared/helper.js';
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
  const replacedContent =
      textContent.replace(new RegExp(`localhost:${getTestServerPort()}`, 'g'), '<url>').replace(/\u200b/g, '').trim();
  const userFlow = JSON.parse(replacedContent);
  for (const section of userFlow.sections) {
    section.screenshot = '<screenshot>';
  }
  return userFlow;
}

async function changeNetworkConditions(condition: string) {
  const {frontend} = getBrowserAndPages();
  await frontend.waitForSelector('pierce/#tab-network');
  await frontend.click('pierce/#tab-network');
  await frontend.waitForSelector('pierce/[aria-label="Throttling"]');
  await frontend.select('pierce/[aria-label="Throttling"] select', condition);
}

const enableUntrustedEventMode = async () => {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(() => {
    // @ts-ignore
    globalThis.Common.Settings.instance().createSetting('untrustedRecorderEvents', true);
  });
};

async function startRecording(path: string, networkCondition: string = '', untrustedEvents = false) {
  await enableExperiment('recorder');
  await goToResource(path);

  const {frontend} = getBrowserAndPages();
  if (networkCondition) {
    await changeNetworkConditions(networkCondition);
  }


  await openSourcesPanel();
  await openRecorderSubPane();
  if (untrustedEvents) {
    await enableUntrustedEventMode();
  }
  await createNewRecording('New recording');
  //   await enableCDPLogging()
  await frontend.click('aria/Record');
  await frontend.bringToFront();
  await frontend.waitForSelector('aria/Stop');
}

async function stopRecording() {
  const {frontend} = getBrowserAndPages();
  await frontend.bringToFront();
  await frontend.waitForSelector('aria/Stop', {timeout: 0});
  await frontend.click('aria/Stop');
}

async function assertOutput(expected: UserFlow) {
  const textContent = await getCode();
  assert.deepEqual(textContent, expected);
}

const viewportStep = {
  height: 720,
  width: 1280,
  type: 'viewport' as 'viewport',
};

describe('Recorder', function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(0);

  it('should capture the initial page as the url of the first section', async () => {
    await startRecording('recorder/recorder.html');
    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
        ],
      }],
    });
  });

  it('should capture clicks on buttons', async () => {
    await startRecording('recorder/recorder.html');

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('#test');

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
          {
            type: 'click',
            selector: 'aria/Test Button' as Selector,
            context: {
              target: 'main',
              path: [],
            },
          },
        ],
      }],
    });
  });

  it('should not capture synthetic events', async () => {
    await startRecording('recorder/recorder.html');

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('#synthetic');

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
          {
            type: 'click',
            selector: 'aria/Trigger Synthetic Event' as Selector,
            context: {
              target: 'main',
              path: [],
            },
          },
        ],
      }],
    });
  });

  it('should capture clicks on submit buttons inside of forms as click steps', async () => {
    await startRecording('recorder/recorder.html');

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('#form-button');

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
          {
            type: 'click',
            selector: 'aria/Form Button' as Selector,
            context: {
              target: 'main',
              path: [],
            },
          },
        ],
      }],
    });
  });

  it('should build an aria selector for the parent element that is interactive', async () => {
    await startRecording('recorder/recorder.html');

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('#span');

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
          {
            type: 'click',
            selector: 'aria/Hello World' as Selector,
            context: {
              target: 'main',
              path: [],
            },
          },
        ],
      }],
    });
  });

  it('should fall back to a css selector if an element does not have an accessible and interactive parent',
     async () => {
       await startRecording('recorder/recorder.html');

       const {target} = getBrowserAndPages();
       await target.bringToFront();
       await target.click('#span2');

       await stopRecording();
       await assertOutput({
         title: 'New Recording',
         sections: [{
           url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
           screenshot: '<screenshot>',
           title: '',
           steps: [
             viewportStep,
             {
               type: 'click',
               selector: 'span#span2' as Selector,
               context: {
                 target: 'main',
                 path: [],
               },
             },
           ],
         }],
       });
     });

  it('should create an aria selector even if the element is within a shadow root', async () => {
    await startRecording('recorder/recorder.html');

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('pierce/#inner-span');

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
          {
            type: 'click',
            selector: 'aria/Hello World' as Selector,
            context: {
              target: 'main',
              path: [],
            },
          },
        ],
      }],
    });
  });

  it('should record interactions with elements within iframes', async () => {
    await startRecording('recorder/recorder.html');

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.mainFrame().childFrames()[0].click('#in-iframe');
    await target.mainFrame().childFrames()[0].childFrames()[0].click('aria/Inner iframe button');

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
          {
            type: 'click',
            selector: 'aria/iframe button' as Selector,
            context: {
              target: 'main',
              path: [
                0,
              ],
            },
          },
          {
            type: 'click',
            selector: 'aria/Inner iframe button' as Selector,
            context: {
              target: 'main',
              path: [
                0,
                0,
              ],
            },
          },
        ],
      }],
    });
  });

  it('should wait for navigations in the generated scripts', async () => {
    await startRecording('recorder/recorder.html');

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    const promise1 = target.waitForNavigation();
    await target.click('aria/Page 2');
    await promise1;
    await target.waitForSelector('aria/Back to Page 1');
    const promise2 = target.waitForNavigation();
    await target.click('aria/Back to Page 1');
    await promise2;

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
          {
            type: 'click',
            selector: 'aria/Page 2' as Selector,
            context: {
              target: 'main',
              path: [],
            },
            condition: {
              expectedUrl: 'https://<url>/test/e2e/resources/recorder/recorder2.html',
              type: 'waitForNavigation',
            },
          },
          {
            type: 'click',
            selector: 'aria/Back to Page 1' as Selector,
            context: {
              target: 'main',
              path: [],
            },
            condition: {
              expectedUrl: 'https://<url>/test/e2e/resources/recorder/recorder.html',
              type: 'waitForNavigation',
            },
          },
        ],
      }],
    });
  });

  it('should also record network conditions', async () => {
    await startRecording('recorder/recorder.html', 'Fast 3G');

    const {frontend, target} = getBrowserAndPages();
    await target.bringToFront();
    await target.click('#test');
    await frontend.bringToFront();
    await changeNetworkConditions('Slow 3G');
    await openSourcesPanel();
    await target.bringToFront();
    await target.click('#test');

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
        screenshot: '<screenshot>',
        title: '',
        networkConditions: {
          download: 180000,
          latency: 562.5,
          upload: 84375,
        },
        steps: [
          viewportStep,
          {
            type: 'click',
            selector: 'aria/Test Button' as Selector,
            context: {
              target: 'main',
              path: [],
            },
          },
          {
            type: 'emulateNetworkConditions',
            conditions: {
              download: 50000,
              latency: 2000,
              upload: 50000,
            },
          },
          {
            type: 'click',
            selector: 'aria/Test Button' as Selector,
            context: {
              target: 'main',
              path: [],
            },
          },
        ],
      }],
    });
  });

  it('should capture keyboard events on inputs', async () => {
    await startRecording('recorder/input.html');

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.keyboard.press('Tab');
    await target.keyboard.type('1');
    await target.keyboard.press('Tab');
    await target.keyboard.type('2');

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/input.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
          {
            altKey: false,
            context: {
              path: [],
              target: 'main',
            },
            ctrlKey: false,
            key: 'Tab',
            metaKey: false,
            shiftKey: false,
            type: 'keydown',
          },
          {
            altKey: false,
            context: {
              path: [],
              target: 'main',
            },
            ctrlKey: false,
            key: 'Tab',
            metaKey: false,
            shiftKey: false,
            type: 'keyup',
          },
          {
            altKey: false,
            context: {
              path: [],
              target: 'main',
            },
            ctrlKey: false,
            key: '1',
            metaKey: false,
            shiftKey: false,
            type: 'keydown',
          },
          {
            altKey: false,
            context: {
              path: [],
              target: 'main',
            },
            ctrlKey: false,
            key: '1',
            metaKey: false,
            shiftKey: false,
            type: 'keyup',
          },
          {
            altKey: false,
            context: {
              path: [],
              target: 'main',
            },
            ctrlKey: false,
            key: 'Tab',
            metaKey: false,
            shiftKey: false,
            type: 'keydown',
          },
          {
            altKey: false,
            context: {
              path: [],
              target: 'main',
            },
            ctrlKey: false,
            key: 'Tab',
            metaKey: false,
            shiftKey: false,
            type: 'keyup',
          },
          {
            altKey: false,
            context: {
              path: [],
              target: 'main',
            },
            ctrlKey: false,
            key: '2',
            metaKey: false,
            shiftKey: false,
            type: 'keydown',
          },
          {
            altKey: false,
            context: {
              path: [],
              target: 'main',
            },
            ctrlKey: false,
            key: '2',
            metaKey: false,
            shiftKey: false,
            type: 'keyup',
          },
        ],
      }],
    });
  });

  it('should work for select elements', async () => {
    const untrustedEvents = true;
    const networkCondition = '';
    await startRecording('recorder/select.html', networkCondition, untrustedEvents);

    const {target} = getBrowserAndPages();
    await target.bringToFront();
    await target.select('#select', 'O2');

    await stopRecording();
    await assertOutput({
      title: 'New Recording',
      sections: [{
        url: 'https://<url>/test/e2e/resources/recorder/select.html',
        screenshot: '<screenshot>',
        title: '',
        steps: [
          viewportStep,
          {
            'type': 'change',
            'context': {
              'path': [],
              'target': 'main',
            },
            'selector': 'aria/Select' as Selector,
            'value': 'O2',
          },
        ],
      }],
    });
  });
});
