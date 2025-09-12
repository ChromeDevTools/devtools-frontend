// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {Page} from 'puppeteer-core';

import type {UserFlow} from '../../../front_end/panels/recorder/models/Schema.js';
import type * as Recorder from '../../../front_end/panels/recorder/recorder.js';
import {
  platform,
  selectOption,
} from '../../../test/shared/helper.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';

import {openCommandMenu} from './quick_open-helpers.js';

const RECORDER_CONTROLLER_TAG_NAME = 'devtools-recorder-controller' as const;
const TEST_RECORDING_NAME = 'New Recording';
const ControlOrMeta = platform === 'mac' ? 'Meta' : 'Control';

export async function record(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await inspectedPage.bringToFront();
  await devToolsPage.bringToFront();
  await devToolsPage.page.waitForSelector('pierce/.settings');
  await inspectedPage.bringToFront();
  const element = await inspectedPage.waitForSelector('a[href="recorder2.html"]');
  await element?.click();
  await devToolsPage.bringToFront();
}

export async function getRecordingController(devToolsPage: DevToolsPage) {
  return await devToolsPage.waitFor(
      RECORDER_CONTROLLER_TAG_NAME,
  );
}

export async function onRecordingStateChanged(devToolsPage: DevToolsPage): Promise<UserFlow> {
  const view = await getRecordingController(devToolsPage);
  return await view.evaluate(el => {
    return new Promise<UserFlow>(resolve => {
      el.addEventListener(
          'recordingstatechanged',
          (event: Event) => resolve(
              (event as Recorder.RecorderEvents.RecordingStateChangedEvent).recording,
              ),
          {once: true},
      );
    });
  });
}

export async function onRecorderAttachedToTarget(devToolsPage: DevToolsPage): Promise<unknown> {
  return await devToolsPage.evaluate(() => {
    return new Promise(resolve => {
      window.addEventListener('recorderAttachedToTarget', resolve, {
        once: true,
      });
    });
  });
}

export async function onReplayFinished(devToolsPage: DevToolsPage): Promise<unknown> {
  const view = await getRecordingController(devToolsPage);
  return await view.evaluate(el => {
    return new Promise(resolve => {
      el.addEventListener('replayfinished', resolve, {once: true});
    });
  });
}

export async function enableUntrustedEventMode(devToolsPage: DevToolsPage) {
  await devToolsPage.evaluate(`(async () => {
    // TODO: have an explicit UI setting or perhaps a special event to configure this
    // instead of having a global setting.
    const Common = await import('./core/common/common.js');
    Common.Settings.Settings.instance().createSetting('untrusted-recorder-events', true);
  })()`);
}

export async function enableAndOpenRecorderPanel(
    path: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await inspectedPage.goToResource(path);
  await openRecorderPanel(devToolsPage);
}

async function createRecording(name: string, selectorAttribute?: string, devToolsPage?: DevToolsPage) {
  if (!devToolsPage) {
    throw new Error('DevToolsPage was not provided');
  }
  const newRecordingButton = await devToolsPage.waitForAria('Create recording');
  await newRecordingButton.click();
  const input = await devToolsPage.waitForAria('RECORDING NAME');
  await input.type(name);
  if (selectorAttribute) {
    const input = await devToolsPage.waitForAria(
        'SELECTOR ATTRIBUTE Learn more',
    );
    await input.type(selectorAttribute);
  }
}

export async function createAndStartRecording(name?: string, selectorAttribute?: string, devToolsPage?: DevToolsPage) {
  if (!devToolsPage) {
    throw new Error('DevToolsPage was not provided');
  }
  await createRecording(name ?? TEST_RECORDING_NAME, selectorAttribute, devToolsPage);
  const onRecordingStarted = onRecordingStateChanged(devToolsPage);
  await devToolsPage.click('devtools-control-button');
  await devToolsPage.waitFor('.recording-view');
  await onRecordingStarted;
}

export async function changeNetworkConditions(condition: string, devToolsPage: DevToolsPage) {
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Show Network');
  await devToolsPage.page.keyboard.press('Enter');
  await devToolsPage.page.waitForSelector('pierce/select[aria-label="Throttling"]');
  await devToolsPage.page.select('pierce/select[aria-label="Throttling"]', condition);
}

export async function openRecorderPanel(devToolsPage: DevToolsPage) {
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Show Recorder');
  await devToolsPage.page.keyboard.press('Enter');
  await devToolsPage.waitFor(RECORDER_CONTROLLER_TAG_NAME);
}

interface StartRecordingOptions {
  networkCondition?: string;
  untrustedEvents?: boolean;
  selectorAttribute?: string;
}

export async function startRecording(
    path: string,
    options: StartRecordingOptions = {
      networkCondition: '',
      untrustedEvents: false,
    },
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,

) {
  await devToolsPage.bringToFront();
  if (options.networkCondition) {
    await changeNetworkConditions(options.networkCondition, devToolsPage);
  }
  await enableAndOpenRecorderPanel(path, devToolsPage, inspectedPage);
  if (options.untrustedEvents) {
    await enableUntrustedEventMode(devToolsPage);
  }
  await createAndStartRecording(TEST_RECORDING_NAME, options.selectorAttribute, devToolsPage);
}

export async function stopRecording(devToolsPage: DevToolsPage): Promise<UserFlow> {
  await devToolsPage.bringToFront();
  await raf(devToolsPage.page);
  const onRecordingStopped = onRecordingStateChanged(devToolsPage);
  await devToolsPage.click('aria/End recording');
  return await onRecordingStopped;
}

interface RecordingSnapshotOptions {
  /**
   * Whether to keep the offsets for recording or not.
   *
   * @default false
   */
  offsets?: boolean;
  /**
   * @default true
   */
  expectCommon?: boolean;
  resource?: string;
}

export const processAndVerifyBaseRecording = (
    recording: unknown,
    options: RecordingSnapshotOptions = {},
    ) => {
  const {
    offsets = false,
    expectCommon = true,
    resource = 'recorder/recorder.html',
  } = options;

  let value = JSON.stringify(recording)
                  .replaceAll(
                      /https:\/\/localhost:\d+/g,
                      'https://localhost:<test-port>',
                      )
                  .replaceAll(
                      /https:\/\/devtools.oopif.test:\d+/g,
                      'https://devtools.oopif.test:<test-port>',
                  );
  value = value.replaceAll('\u200b', '');
  if (!offsets) {
    value = value.replaceAll(
        /,?"(?:offsetY|offsetX)":[0-9]+(?:\.[0-9]+)?/g,
        '',
    );
  }

  const parsed = JSON.parse(value.trim());
  if (expectCommon) {
    assert.strictEqual(
        parsed.title,
        'New Recording',
    );
    delete parsed.title;
    assert.deepEqual(
        parsed.steps[0],
        {
          type: 'setViewport',
          width: 1280,
          height: 720,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          isLandscape: false
        },
    );
    assert.deepEqual(
        parsed.steps[1],
        {
          type: 'navigate',
          url: `https://localhost:<test-port>/test/e2e/resources/${resource}`,
          assertedEvents: [{
            type: 'navigation',
            url: `https://localhost:<test-port>/test/e2e/resources/${resource}`,
            title: '',
          }]
        },
    );

    parsed.steps = parsed.steps.slice(2);
  }

  return parsed;
};

async function setCode(flow: string, devToolsPage: DevToolsPage) {
  const view = await getRecordingController(devToolsPage);
  await view.evaluate((el, flow) => {
    el.dispatchEvent(new CustomEvent('setrecording', {detail: flow}));
  }, flow);
}

export async function clickSelectButtonItem(itemLabel: string, root: string, devToolsPage: DevToolsPage) {
  const selectMenu = await devToolsPage.waitFor(root);
  const selectMenuButton = await devToolsPage.waitFor(
      'select',
      selectMenu,
  );

  void selectOption(await selectMenuButton.toElement('select'), itemLabel);

  await devToolsPage.click('devtools-button', {root: selectMenu});
}

export async function setupRecorderWithScript(
    script: UserFlow,
    path = 'recorder/recorder.html',
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    ): Promise<void> {
  await enableAndOpenRecorderPanel(path, devToolsPage, inspectedPage);
  await createAndStartRecording(script.title, undefined, devToolsPage);
  await stopRecording(devToolsPage);
  await setCode(JSON.stringify(script), devToolsPage);
}

export async function setupRecorderWithScriptAndReplay(
    script: UserFlow,
    path = 'recorder/recorder.html',
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    ): Promise<void> {
  await setupRecorderWithScript(script, path, devToolsPage, inspectedPage);
  const onceFinished = onReplayFinished(devToolsPage);
  await clickSelectButtonItem('Normal (Default)', 'devtools-replay-section', devToolsPage);
  await onceFinished;
}

export async function getCurrentRecording(
    devToolsPage: DevToolsPage,
    ): Promise<UserFlow> {
  await devToolsPage.bringToFront();
  const controller = await devToolsPage.$(RECORDER_CONTROLLER_TAG_NAME);
  const recording = (await controller?.evaluate(
      el => JSON.stringify(el.getUserFlow()),
      ));
  return JSON.parse(recording);
}

export async function startOrStopRecordingShortcut(
    execute: 'inspectedPage'|'devToolsPage' = 'devToolsPage',
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
) {
  const executeOn = execute === 'devToolsPage' ? devToolsPage.page : inspectedPage.page;
  const onRecordingStarted = onRecordingStateChanged(devToolsPage);
  await executeOn.bringToFront();
  await executeOn.keyboard.down(ControlOrMeta);
  await executeOn.keyboard.down('e');
  await executeOn.keyboard.up(ControlOrMeta);
  await executeOn.keyboard.up('e');

  await devToolsPage.waitFor('.recording-view');
  return await onRecordingStarted;
}

export async function fillCreateRecordingForm(
    path: string,
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
) {
  await enableAndOpenRecorderPanel(path, devToolsPage, inspectedPage);
  await createRecording(TEST_RECORDING_NAME, undefined, devToolsPage);
}

export async function startRecordingViaShortcut(
    path: string,
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
) {
  await enableAndOpenRecorderPanel(path, devToolsPage, inspectedPage);
  await startOrStopRecordingShortcut('devToolsPage', devToolsPage, inspectedPage);
}

export async function replayShortcut(
    devToolsPage: DevToolsPage,
) {
  await devToolsPage.bringToFront();
  await devToolsPage.page.keyboard.down(ControlOrMeta);
  await devToolsPage.page.keyboard.down('Enter');
  await devToolsPage.page.keyboard.up(ControlOrMeta);
  await devToolsPage.page.keyboard.up('Enter');
}

export async function toggleCodeView(
    devToolsPage: DevToolsPage,
) {
  await devToolsPage.bringToFront();
  await devToolsPage.page.keyboard.down(ControlOrMeta);
  await devToolsPage.page.keyboard.down('b');
  await devToolsPage.page.keyboard.up(ControlOrMeta);
  await devToolsPage.page.keyboard.up('b');
  await devToolsPage.drainTaskQueue();
}

export async function raf(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise(resolve => window.requestAnimationFrame(resolve));
  });
}
