// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {Page} from 'puppeteer-core';

import type {UserFlow} from '../../../front_end/panels/recorder/models/Schema.js';
import type * as Recorder from '../../../front_end/panels/recorder/recorder.js';
import {
  platform,
  selectOption,
} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {openCommandMenu} from './quick_open-helpers.js';

const RECORDER_CONTROLLER_TAG_NAME = 'devtools-recorder-controller' as const;
const TEST_RECORDING_NAME = 'New Recording';
const ControlOrMeta = platform === 'mac' ? 'Meta' : 'Control';

export async function getRecordingController(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  return await devToolsPage.waitFor(
      RECORDER_CONTROLLER_TAG_NAME,
  );
}

export async function onRecordingStateChanged(devToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<unknown> {
  const view = await getRecordingController(devToolsPage);
  return await view.evaluate(el => {
    return new Promise(resolve => {
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

export async function onRecorderAttachedToTarget(devToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<unknown> {
  return await devToolsPage.evaluate(() => {
    return new Promise(resolve => {
      window.addEventListener('recorderAttachedToTarget', resolve, {
        once: true,
      });
    });
  });
}

export async function onReplayFinished(devToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<unknown> {
  const view = await getRecordingController(devToolsPage);
  return await view.evaluate(el => {
    return new Promise(resolve => {
      el.addEventListener('replayfinished', resolve, {once: true});
    });
  });
}

export async function enableUntrustedEventMode(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.evaluate(`(async () => {
    // TODO: have an explicit UI setting or perhaps a special event to configure this
    // instead of having a global setting.
    const Common = await import('./core/common/common.js');
    Common.Settings.Settings.instance().createSetting('untrusted-recorder-events', true);
  })()`);
}

export async function enableAndOpenRecorderPanel(
    path: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage

) {
  await inspectedPage.goToResource(path);
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Show Recorder');
  await devToolsPage.page.keyboard.press('Enter');
  await devToolsPage.waitFor(RECORDER_CONTROLLER_TAG_NAME);
}

async function createRecording(
    name: string, selectorAttribute?: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
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

export async function createAndStartRecording(
    name?: string, selectorAttribute?: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await createRecording(name ?? TEST_RECORDING_NAME, selectorAttribute, devToolsPage);
  const onRecordingStarted = onRecordingStateChanged(devToolsPage);
  await devToolsPage.click('devtools-control-button');
  await devToolsPage.waitFor('devtools-recording-view');
  await onRecordingStarted;
}

export async function changeNetworkConditions(
    condition: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.page.waitForSelector('pierce/#tab-network');
  await devToolsPage.click('pierce/#tab-network');
  await devToolsPage.page.waitForSelector('pierce/select[aria-label="Throttling"]');
  await devToolsPage.page.select('pierce/select[aria-label="Throttling"]', condition);
}

export async function openRecorderPanel(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click('[aria-label="Recorder"]');
  await devToolsPage.waitFor('devtools-recording-view');
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
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
) {
  await devToolsPage.bringToFront();
  if (options.networkCondition) {
    await changeNetworkConditions(options.networkCondition);
  }
  await enableAndOpenRecorderPanel(path);
  if (options.untrustedEvents) {
    await enableUntrustedEventMode();
  }
  await createAndStartRecording(TEST_RECORDING_NAME, options.selectorAttribute);
}

export async function stopRecording(devToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<unknown> {
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
   * @defaultValue `false`
   */
  offsets?: boolean;
  /**
   * @defaultValue `true`
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

async function setCode(flow: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const view = await getRecordingController(devToolsPage);
  await view.evaluate((el, flow) => {
    el.dispatchEvent(new CustomEvent('setrecording', {detail: flow}));
  }, flow);
}

export async function clickSelectButtonItem(
    itemLabel: string, root: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
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
    ): Promise<void> {
  await enableAndOpenRecorderPanel(path);
  await createAndStartRecording(script.title);
  await stopRecording();
  await setCode(JSON.stringify(script));
}

export async function setupRecorderWithScriptAndReplay(
    script: UserFlow,
    path = 'recorder/recorder.html',
    ): Promise<void> {
  await setupRecorderWithScript(script, path);
  const onceFinished = onReplayFinished();
  await clickSelectButtonItem('Normal (Default)', 'devtools-replay-section');
  await onceFinished;
}

export async function getCurrentRecording(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
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
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage,
) {
  const executeOn = execute === 'devToolsPage' ? devToolsPage.page : inspectedPage.page;
  const onRecordingStarted = onRecordingStateChanged();
  await executeOn.bringToFront();
  await executeOn.keyboard.down(ControlOrMeta);
  await executeOn.keyboard.down('e');
  await executeOn.keyboard.up(ControlOrMeta);
  await executeOn.keyboard.up('e');

  await devToolsPage.waitFor('devtools-recording-view');
  return await onRecordingStarted;
}

export async function fillCreateRecordingForm(path: string) {
  await enableAndOpenRecorderPanel(path);
  await createRecording(TEST_RECORDING_NAME);
}

export async function startRecordingViaShortcut(path: string) {
  await enableAndOpenRecorderPanel(path);
  await startOrStopRecordingShortcut();
}

export async function replayShortcut(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
) {
  await devToolsPage.bringToFront();
  await devToolsPage.page.keyboard.down(ControlOrMeta);
  await devToolsPage.page.keyboard.down('Enter');
  await devToolsPage.page.keyboard.up(ControlOrMeta);
  await devToolsPage.page.keyboard.up('Enter');
}

export async function toggleCodeView(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
) {
  await devToolsPage.bringToFront();
  await devToolsPage.page.keyboard.down(ControlOrMeta);
  await devToolsPage.page.keyboard.down('b');
  await devToolsPage.page.keyboard.up(ControlOrMeta);
  await devToolsPage.page.keyboard.up('b');
}

export async function raf(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise(resolve => window.requestAnimationFrame(resolve));
  });
}
