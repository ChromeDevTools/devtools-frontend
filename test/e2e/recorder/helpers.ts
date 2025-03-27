// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle, Page} from 'puppeteer-core';

import type {UserFlow} from '../../../front_end/panels/recorder/models/Schema.js';
import type * as Recorder from '../../../front_end/panels/recorder/recorder.js';
import {openPanelViaMoreTools} from '../../../test/e2e/helpers/settings-helpers.js';
import {
  $,
  click,
  getBrowserAndPages,
  getTestServerPort,
  goToResource,
  platform,
  selectOption,
  waitFor,
  waitForAria,
} from '../../../test/shared/helper.js';

const RECORDER_CONTROLLER_TAG_NAME = 'devtools-recorder-controller' as const;
const TEST_RECORDING_NAME = 'New Recording';
const ControlOrMeta = platform === 'mac' ? 'Meta' : 'Control';

export async function getRecordingController() {
  return (await waitFor(
             RECORDER_CONTROLLER_TAG_NAME,
             )) as unknown as ElementHandle<Recorder.RecorderController.RecorderController>;
}

export async function onRecordingStateChanged(): Promise<unknown> {
  const view = await getRecordingController();
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

export async function onRecorderAttachedToTarget(): Promise<unknown> {
  const {frontend} = getBrowserAndPages();
  return await frontend.evaluate(() => {
    return new Promise(resolve => {
      window.addEventListener('recorderAttachedToTarget', resolve, {
        once: true,
      });
    });
  });
}

export async function onReplayFinished(): Promise<unknown> {
  const view = await getRecordingController();
  return await view.evaluate(el => {
    return new Promise(resolve => {
      el.addEventListener('replayfinished', resolve, {once: true});
    });
  });
}

export async function enableUntrustedEventMode() {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(`(async () => {
    // TODO: have an explicit UI setting or perhaps a special event to configure this
    // instead of having a global setting.
    const Common = await import('./core/common/common.js');
    Common.Settings.Settings.instance().createSetting('untrusted-recorder-events', true);
  })()`);
}

export async function enableAndOpenRecorderPanel(path: string) {
  await goToResource(path);
  await openPanelViaMoreTools('Recorder');
  await waitFor(RECORDER_CONTROLLER_TAG_NAME);
}

async function createRecording(name: string, selectorAttribute?: string) {
  const newRecordingButton = await waitForAria('Create recording');
  await newRecordingButton.click();
  const input = await waitForAria('RECORDING NAME');
  await input.type(name);
  if (selectorAttribute) {
    const input = await waitForAria(
        'SELECTOR ATTRIBUTE Learn more',
    );
    await input.type(selectorAttribute);
  }
}

export async function createAndStartRecording(
    name?: string,
    selectorAttribute?: string,
) {
  await createRecording(name ?? TEST_RECORDING_NAME, selectorAttribute);
  const onRecordingStarted = onRecordingStateChanged();
  await click('devtools-control-button');
  await waitFor('devtools-recording-view');
  await onRecordingStarted;
}

export async function changeNetworkConditions(condition: string) {
  const {frontend} = getBrowserAndPages();
  await frontend.waitForSelector('pierce/#tab-network');
  await frontend.click('pierce/#tab-network');
  await frontend.waitForSelector('pierce/[aria-label="Throttling"]');
  await frontend.select('pierce/[aria-label="Throttling"] select', condition);
}

export async function openRecorderPanel() {
  await click('[aria-label="Recorder"]');
  await waitFor('devtools-recording-view');
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
) {
  const {frontend} = getBrowserAndPages();
  await frontend.bringToFront();
  if (options.networkCondition) {
    await changeNetworkConditions(options.networkCondition);
  }
  await enableAndOpenRecorderPanel(path);
  if (options.untrustedEvents) {
    await enableUntrustedEventMode();
  }
  await createAndStartRecording(TEST_RECORDING_NAME, options.selectorAttribute);
}

export async function stopRecording(): Promise<unknown> {
  const {frontend} = getBrowserAndPages();
  await frontend.bringToFront();
  await raf(frontend);
  const onRecordingStopped = onRecordingStateChanged();
  await click('aria/End recording');
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

  let value = JSON.stringify(recording).replaceAll(
      `:${getTestServerPort()}`,
      ':<test-port>',
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

async function setCode(flow: string) {
  const view = await getRecordingController();
  await view.evaluate((el, flow) => {
    el.dispatchEvent(new CustomEvent('setrecording', {detail: flow}));
  }, flow);
}

export async function clickSelectButtonItem(itemLabel: string, root: string) {
  const selectMenu = await waitFor(root);
  const selectMenuButton = await waitFor(
      'select',
      selectMenu,
  );

  void selectOption(await selectMenuButton.toElement('select'), itemLabel);

  await click('devtools-button', {root: selectMenu});
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

export async function getCurrentRecording() {
  const {frontend} = getBrowserAndPages();
  await frontend.bringToFront();
  const controller = await $(RECORDER_CONTROLLER_TAG_NAME);
  const recording = (await controller?.evaluate(
                        el => JSON.stringify((el as unknown as {getUserFlow(): unknown}).getUserFlow()),
                        )) as string;
  return JSON.parse(recording);
}

export async function startOrStopRecordingShortcut(
    execute: 'page'|'frontend' = 'frontend',
) {
  const {target, frontend} = getBrowserAndPages();
  const executeOn = execute === 'frontend' ? frontend : target;
  const onRecordingStarted = onRecordingStateChanged();
  await executeOn.bringToFront();
  await executeOn.keyboard.down(ControlOrMeta);
  await executeOn.keyboard.down('e');
  await executeOn.keyboard.up(ControlOrMeta);
  await executeOn.keyboard.up('e');

  await waitFor('devtools-recording-view');
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

export async function replayShortcut() {
  const {frontend} = getBrowserAndPages();
  await frontend.bringToFront();
  await frontend.keyboard.down(ControlOrMeta);
  await frontend.keyboard.down('Enter');
  await frontend.keyboard.up(ControlOrMeta);
  await frontend.keyboard.up('Enter');
}

export async function toggleCodeView() {
  const {frontend} = getBrowserAndPages();
  await frontend.bringToFront();
  await frontend.keyboard.down(ControlOrMeta);
  await frontend.keyboard.down('b');
  await frontend.keyboard.up(ControlOrMeta);
  await frontend.keyboard.up('b');
}

export async function raf(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise(resolve => window.requestAnimationFrame(resolve));
  });
}
