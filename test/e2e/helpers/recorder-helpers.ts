// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {UserFlow} from '../../../front_end/panels/recorder/models/Schema.js';
import type * as Recorder from '../../../front_end/panels/recorder/recorder.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

import {openCommandMenu} from './quick_open-helpers.js';

const RECORDER_PANEL_TAG_NAME = 'devtools-recorder-panel' as const;
const TEST_RECORDING_NAME = 'New Recording';

export async function record(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await devToolsPage.bringToFront();
  await devToolsPage.waitFor('.settings');
  await inspectedPage.bringToFront();
  const element = await inspectedPage.waitForSelector('a[href="recorder2.html"]');
  await element?.click();
  await devToolsPage.bringToFront();
}

export async function getRecordingPanel(devToolsPage: DevToolsPage) {
  return await devToolsPage.waitFor(
      RECORDER_PANEL_TAG_NAME,
  );
}

export async function onRecordingStateChanged(devToolsPage: DevToolsPage): Promise<UserFlow> {
  const view = await getRecordingPanel(devToolsPage);
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
  const view = await getRecordingPanel(devToolsPage);
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

export async function enableAndOpenRecorderPanel(devToolsPage: DevToolsPage, inspectedPage: InspectedPage,
                                                 path: string) {
  await inspectedPage.goToResource(path);
  await openRecorderPanel(devToolsPage);
}

async function createRecording(devToolsPage: DevToolsPage, name: string, selectorAttribute?: string) {
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

export async function createAndStartRecording(devToolsPage: DevToolsPage, name?: string, selectorAttribute?: string) {
  await createRecording(devToolsPage, name ?? TEST_RECORDING_NAME, selectorAttribute);
  const onRecordingStarted = onRecordingStateChanged(devToolsPage);
  await devToolsPage.click('.control-button');
  await devToolsPage.waitFor('.recording-view');
  await onRecordingStarted;
}

export async function changeNetworkConditions(devToolsPage: DevToolsPage, condition: string) {
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Show Network');
  await devToolsPage.pressKey('Enter');
  await devToolsPage.waitFor('select[aria-label="Throttling"]');
  await devToolsPage.page.select('pierce/select[aria-label="Throttling"]', condition);
}

export async function openRecorderPanel(devToolsPage: DevToolsPage) {
  await openCommandMenu(devToolsPage);
  await devToolsPage.typeText('Show Recorder');
  await devToolsPage.pressKey('Enter');
  await devToolsPage.waitFor(RECORDER_PANEL_TAG_NAME);
}

interface StartRecordingOptions {
  networkCondition?: string;
  untrustedEvents?: boolean;
  selectorAttribute?: string;
}

export async function startRecording(
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    path: string,
    options: StartRecordingOptions = {
      networkCondition: '',
      untrustedEvents: false,
    },
) {
  await devToolsPage.bringToFront();
  if (options.networkCondition) {
    await changeNetworkConditions(devToolsPage, options.networkCondition);
  }
  await enableAndOpenRecorderPanel(devToolsPage, inspectedPage, path);
  if (options.untrustedEvents) {
    await enableUntrustedEventMode(devToolsPage);
  }
  await createAndStartRecording(devToolsPage, TEST_RECORDING_NAME, options.selectorAttribute);
}

export async function stopRecording(devToolsPage: DevToolsPage): Promise<UserFlow> {
  await devToolsPage.bringToFront();
  await devToolsPage.raf();
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
          isLandscape: false,
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
          }],
        },
    );

    parsed.steps = parsed.steps.slice(2);
  }

  return parsed;
};

async function setCode(devToolsPage: DevToolsPage, flow: string) {
  const view = await getRecordingPanel(devToolsPage);
  await view.evaluate(async (el, flow) => {
    const promise = new Promise(resolve => el.addEventListener('setrecordingfinished', resolve, {once: true}));
    el.dispatchEvent(new CustomEvent('setrecording', {detail: flow}));
    await promise;
  }, flow);
}

export async function clickSelectButtonItem(devToolsPage: DevToolsPage, itemLabel: string, root: string) {
  const selectMenu = await devToolsPage.waitFor(root);
  const selectMenuButton = await devToolsPage.waitFor(
      'select',
      selectMenu,
  );

  void (await selectMenuButton.toElement('select')).select(itemLabel);

  await devToolsPage.click('devtools-button', {root: selectMenu});
}

export async function setupRecorderWithScript(
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    script: UserFlow,
    path = 'recorder/recorder.html',
    ): Promise<void> {
  await enableAndOpenRecorderPanel(devToolsPage, inspectedPage, path);
  await createAndStartRecording(devToolsPage, script.title, undefined);
  await stopRecording(devToolsPage);
  await setCode(devToolsPage, JSON.stringify(script));
}

export async function setupRecorderWithScriptAndReplay(
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    script: UserFlow,
    path = 'recorder/recorder.html',
    ): Promise<void> {
  await setupRecorderWithScript(devToolsPage, inspectedPage, script, path);
  const onceFinished = onReplayFinished(devToolsPage);
  await clickSelectButtonItem(devToolsPage, 'Normal (Default)', '.select-button');
  await onceFinished;
}

export async function getCurrentRecording(
    devToolsPage: DevToolsPage,
    ): Promise<UserFlow> {
  await devToolsPage.bringToFront();
  const panel = await devToolsPage.$(RECORDER_PANEL_TAG_NAME);
  const recording = (await panel?.evaluate(
      async el => {
        const path = './ui/legacy/legacy.js';
        const UI = await import(path);
        const widget = UI.Widget.Widget.get(el);
        if (!widget) {
          throw new Error('Could not find Widget for panel element');
        }
        return JSON.stringify((widget as {getUserFlow(): unknown}).getUserFlow());
      },
      ));
  return JSON.parse(recording ?? '');
}

export async function startOrStopRecordingShortcut(
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    execute: 'inspectedPage'|'devToolsPage' = 'devToolsPage',
) {
  const executeOn = execute === 'devToolsPage' ? devToolsPage : inspectedPage;
  const onRecordingStarted = onRecordingStateChanged(devToolsPage);
  await executeOn.bringToFront();

  await executeOn.pressKey('e', {control: true});

  await devToolsPage.waitFor('.recording-view');
  return await onRecordingStarted;
}

export async function fillCreateRecordingForm(
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    path: string,
) {
  await enableAndOpenRecorderPanel(devToolsPage, inspectedPage, path);
  await createRecording(devToolsPage, TEST_RECORDING_NAME, undefined);
}

export async function startRecordingViaShortcut(
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
    path: string,
) {
  await enableAndOpenRecorderPanel(devToolsPage, inspectedPage, path);
  await startOrStopRecordingShortcut(devToolsPage, inspectedPage, 'devToolsPage');
}

export async function replayShortcut(
    devToolsPage: DevToolsPage,
) {
  await devToolsPage.bringToFront();
  await devToolsPage.pressKey('Enter', {control: true});
}

export async function toggleCodeView(
    devToolsPage: DevToolsPage,
) {
  await devToolsPage.bringToFront();
  await devToolsPage.pressKey('b', {control: true});
  await devToolsPage.drainTaskQueue();
}
