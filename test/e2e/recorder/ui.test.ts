// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {StepType} from '../../../front_end/panels/recorder/models/Schema.js';
import {
  selectOption,
} from '../../../test/shared/helper.js';
import {
  clickSelectButtonItem,
  createAndStartRecording,
  enableAndOpenRecorderPanel,
  getCurrentRecording,
  processAndVerifyBaseRecording,
  record,
  stopRecording,
  toggleCodeView,
} from '../helpers/recorder-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function openRecorderAndStartRecording(
    devToolsPage: DevToolsPage,
    inspectedPage: InspectedPage,
) {
  await enableAndOpenRecorderPanel('recorder/recorder.html', devToolsPage, inspectedPage);
  await createAndStartRecording(undefined, undefined, devToolsPage);
}

describe('Recorder', function() {
  if (this.timeout()) {
    // Test are slow on Windows
    this.timeout(20_000);
  }

  async function assertStepList(expectedStepList: string[], devToolsPage: DevToolsPage) {
    await devToolsPage.waitForFunction(async () => {
      const steps = await devToolsPage.page.$$eval(
          'pierce/.step:not(.is-start-of-group) .action .main-title',
          actions => actions.map(e => (e as HTMLElement).innerText),
      );
      return steps.length === expectedStepList.length;
    });

    const actualStepList = await devToolsPage.page.$$eval(
        'pierce/.step:not(.is-start-of-group) .action .main-title',
        actions => actions.map(e => (e as HTMLElement).innerText),
    );
    assert.deepEqual(actualStepList, expectedStepList);
  }

  describe('UI', () => {
    describe('Record', () => {
      it('should record a simple flow', async ({inspectedPage, devToolsPage}) => {
        await openRecorderAndStartRecording(devToolsPage, inspectedPage);

        await inspectedPage.bringToFront();
        await devToolsPage.bringToFront();
        await devToolsPage.page.waitForSelector('pierce/.settings');
        await inspectedPage.bringToFront();
        await inspectedPage.page.click('#test');
        await devToolsPage.bringToFront();

        await stopRecording(devToolsPage);
        await assertStepList(
            [
              'Set viewport',
              'Navigate' as StepType.Navigate,
              'Click' as StepType.Click,
            ],
            devToolsPage);
      });

      it('should replay a simple flow', async ({inspectedPage, devToolsPage}) => {
        await openRecorderAndStartRecording(devToolsPage, inspectedPage);
        await inspectedPage.bringToFront();
        await devToolsPage.bringToFront();
        await devToolsPage.page.waitForSelector('pierce/.settings');
        await inspectedPage.bringToFront();
        const element = await inspectedPage.waitForSelector(
            'a[href="recorder2.html"]',
        );
        await element?.click();
        await devToolsPage.bringToFront();

        await stopRecording(devToolsPage);

        await assertStepList(
            [
              'Set viewport',
              'Navigate' as StepType.Navigate,
              'Click' as StepType.Click,
            ],
            devToolsPage);

        await inspectedPage.page.goto('about:blank');

        // Wait for all steps to complete successfully
        const promise = devToolsPage.waitForFunction(async () => {
          const successfulSteps = await devToolsPage.page.$$eval(
              'pierce/.step:not(.is-start-of-group).is-success .action .main-title',
              actions => actions.map(e => (e as HTMLElement).innerText),
          );
          return successfulSteps.length === 3;
        });
        await clickSelectButtonItem('Normal (Default)', '.select-button', devToolsPage);
        await inspectedPage.bringToFront();
        await promise;
        assert.strictEqual(
            inspectedPage.page.url(),
            `${inspectedPage.getResourcesPath()}/recorder/recorder2.html`,
        );
      });

      it('should rename a recording', async ({inspectedPage, devToolsPage}) => {
        await openRecorderAndStartRecording(devToolsPage, inspectedPage);

        await inspectedPage.bringToFront();
        await devToolsPage.bringToFront();
        await devToolsPage.page.waitForSelector('pierce/.settings');
        await inspectedPage.bringToFront();
        await inspectedPage.page.click('#test');
        await devToolsPage.bringToFront();
        await stopRecording(devToolsPage);

        const button = await devToolsPage.waitForAria('Edit title');
        await button.click();
        const input = await devToolsPage.waitFor<HTMLInputElement>('#title-input');
        await devToolsPage.raf();
        await devToolsPage.pasteText(' with Hello world');
        await input.evaluate(input => {
          input.blur();
        });

        const recording = await getCurrentRecording(devToolsPage);
        assert.strictEqual(recording.title, 'New Recording with Hello world');
      });

      describe('Selector picker', () => {
        async function pickSelectorsForQuery(
            query: string,
            devToolsPage: DevToolsPage,
            inspectedPage: InspectedPage,
        ) {
          await devToolsPage.renderCoordinatorQueueEmpty();

          // Activate selector picker.
          const picker = await devToolsPage.page.waitForSelector(
              'pierce/.selector-picker',
          );
          await picker!.click();

          // Click element and wait for selector picking to stop.
          await inspectedPage.bringToFront();
          const element = await inspectedPage.waitForSelector(query);
          await element!.click();
        }

        async function expandStep(devToolsPage: DevToolsPage, index: number) {
          await devToolsPage.bringToFront();
          // TODO(crbug.com/1411283): figure out why misclicks happen here.
          await devToolsPage.raf();
          await devToolsPage.click(`.step[data-step-index="${index}"] .action`);
          await devToolsPage.waitFor('.expanded');
        }

        it('should select through the selector picker', async ({inspectedPage, devToolsPage}) => {
          await openRecorderAndStartRecording(devToolsPage, inspectedPage);

          await devToolsPage.bringToFront();
          await devToolsPage.page.waitForSelector('pierce/.settings');

          await inspectedPage.bringToFront();
          const element = await inspectedPage.waitForSelector(
              'a[href="recorder2.html"]',
          );
          await element?.click();

          await stopRecording(devToolsPage);

          await expandStep(devToolsPage, 2);
          await pickSelectorsForQuery('#test-button', devToolsPage, inspectedPage);
          const recording = await getCurrentRecording(devToolsPage);
          assert.deepEqual(processAndVerifyBaseRecording(recording), {
            steps: [{
              type: 'click',
              assertedEvents: [{
                type: 'navigation',
                url: 'https://localhost:<test-port>/test/e2e/resources/recorder/recorder2.html',
                title: ''
              }],
              target: 'main',
              selectors: [
                'aria/Test button',
                '#test-button',
                'xpath///*[@id="test-button"]',
                'pierce/#test-button',
                'text/Test button',
              ]
            }]
          });
        });

        it('should select through the selector picker twice', async ({inspectedPage, devToolsPage}) => {
          await openRecorderAndStartRecording(devToolsPage, inspectedPage);
          await devToolsPage.bringToFront();
          await devToolsPage.page.waitForSelector('pierce/.settings');

          await inspectedPage.bringToFront();
          const element = await inspectedPage.waitForSelector(
              'a[href="recorder2.html"]',
          );
          await element?.click();

          await stopRecording(devToolsPage);

          await expandStep(devToolsPage, 2);
          await pickSelectorsForQuery('#test-button', devToolsPage, inspectedPage);

          let recording = await getCurrentRecording(devToolsPage);
          assert.deepEqual(processAndVerifyBaseRecording(recording), {
            steps: [{
              type: 'click',
              assertedEvents: [{
                type: 'navigation',
                url: 'https://localhost:<test-port>/test/e2e/resources/recorder/recorder2.html',
                title: ''
              }],
              target: 'main',
              selectors: [
                'aria/Test button',
                '#test-button',
                'xpath///*[@id="test-button"]',
                'pierce/#test-button',
                'text/Test button',
              ]
            }]
          });

          await pickSelectorsForQuery(
              'a[href="recorder.html"]',
              devToolsPage,
              inspectedPage,
          );

          recording = await getCurrentRecording(devToolsPage);
          assert.deepEqual(processAndVerifyBaseRecording(recording), {
            steps: [{
              type: 'click',
              assertedEvents: [{
                type: 'navigation',
                url: 'https://localhost:<test-port>/test/e2e/resources/recorder/recorder2.html',
                title: ''
              }],
              target: 'main',
              selectors: [
                'aria/Back to Page 1',
                'a',
                'xpath//html/body/a',
                'pierce/a',
                'text/Back to Page',
              ]
            }]
          });
        });

        it('should select through the selector picker during recording', async ({inspectedPage, devToolsPage}) => {
          await openRecorderAndStartRecording(devToolsPage, inspectedPage);
          await devToolsPage.bringToFront();
          await devToolsPage.page.waitForSelector('pierce/.settings');

          await inspectedPage.bringToFront();
          const element = await inspectedPage.waitForSelector(
              'a[href="recorder2.html"]',
          );
          await element?.click();

          await expandStep(devToolsPage, 2);
          await pickSelectorsForQuery('#test-button', devToolsPage, inspectedPage);

          await stopRecording(devToolsPage);

          const recording = await getCurrentRecording(devToolsPage);
          assert.deepEqual(
              processAndVerifyBaseRecording(recording),
              {
                steps: [{
                  type: 'click',
                  assertedEvents: [{
                    type: 'navigation',
                    url: 'https://localhost:<test-port>/test/e2e/resources/recorder/recorder2.html',
                    title: ''
                  }],
                  target: 'main',
                  selectors: [
                    'aria/Test button',
                    '#test-button',
                    'xpath///*[@id="test-button"]',
                    'pierce/#test-button',
                    'text/Test button',
                  ]
                }]
              },
          );
        });
      });
    });

    describe('Settings', () => {
      it('should change network settings', async ({inspectedPage, devToolsPage}) => {
        await openRecorderAndStartRecording(devToolsPage, inspectedPage);
        await devToolsPage.bringToFront();
        await devToolsPage.page.waitForSelector('pierce/.settings');

        await inspectedPage.bringToFront();
        await inspectedPage.page.click('#test');

        await devToolsPage.bringToFront();
        await stopRecording(devToolsPage);

        await devToolsPage.click('aria/Edit replay settings');
        await devToolsPage.raf();

        const selectMenu = await devToolsPage.waitFor(
            '.editable-setting select',
        );

        void selectOption(await selectMenu.toElement('select'), '3G');

        const recording = await getCurrentRecording(devToolsPage);

        assert.deepEqual(processAndVerifyBaseRecording(recording, {expectCommon: false}), {
          title: 'New Recording',
          steps: [
            {
              type: 'emulateNetworkConditions',
              download: 50000,
              upload: 50000,
              latency: 2000,
            },
            {
              type: 'setViewport',
              width: 1280,
              height: 720,
              deviceScaleFactor: 1,
              isMobile: false,
              hasTouch: false,
              isLandscape: false
            },
            {
              type: 'navigate',
              url: 'https://localhost:<test-port>/test/e2e/resources/recorder/recorder.html',
              assertedEvents: [{
                type: 'navigation',
                url: 'https://localhost:<test-port>/test/e2e/resources/recorder/recorder.html',
                title: ''
              }]
            },
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['aria/Test Button'],
                ['#test'],
                ['xpath///*[@id="test"]'],
                ['pierce/#test'],
                ['text/Test Button'],
              ]
            }
          ]
        });
      });

      it('should change the user flow timeout', async ({inspectedPage, devToolsPage}) => {
        await openRecorderAndStartRecording(devToolsPage, inspectedPage);
        await record(devToolsPage, inspectedPage);
        await stopRecording(devToolsPage);
        await assertStepList(
            [
              'Set viewport',
              'Navigate' as StepType.Navigate,
              'Click' as StepType.Click,
            ],
            devToolsPage);

        const button = await devToolsPage.waitForAria('Edit replay settings');
        await button.click();
        const input = await devToolsPage.waitForAria('Timeout');
        // Clear the default value.
        await input.evaluate(el => {
          (el as HTMLInputElement).value = '';
        });
        await input.type('2000');
        await button.click();

        const recording = await getCurrentRecording(devToolsPage);
        if (typeof recording !== 'object' || recording === null) {
          throw new Error('Recording is corrupted');
        }
        assert.strictEqual(recording.timeout, 2000);
      });
    });

    describe('Shortcuts', () => {
      it('should toggle code view with shortcut', async ({inspectedPage, devToolsPage}) => {
        await openRecorderAndStartRecording(devToolsPage, inspectedPage);
        async function getSplitWidgetVisibility() {
          const splitView = await devToolsPage.waitFor('devtools-split-view');
          return await splitView.evaluate(el => {
            return el.getAttribute('sidebar-visibility');
          });
        }
        assert.strictEqual(await getSplitWidgetVisibility(), 'hidden');

        await toggleCodeView(devToolsPage);

        assert.notStrictEqual(await getSplitWidgetVisibility(), 'hidden');

        await toggleCodeView(devToolsPage);
        assert.strictEqual(await getSplitWidgetVisibility(), 'hidden');
      });
    });
  });

  describe('Header', () => {
    describe('Shortcut Dialog', () => {
      it('should open the shortcut dialog', async ({devToolsPage, inspectedPage}) => {
        await enableAndOpenRecorderPanel('recorder/recorder.html', devToolsPage, inspectedPage);
        await devToolsPage.bringToFront();
        const shortcutDialog = await devToolsPage.waitFor('devtools-shortcut-dialog');
        const buttonDialog = await devToolsPage.waitFor('devtools-button-dialog', shortcutDialog);

        await devToolsPage.click('devtools-button', {root: buttonDialog});

        const dialog = await devToolsPage.waitFor('devtools-dialog', buttonDialog);
        assert.isOk(dialog);
        const shortcuts = await devToolsPage.$$('.keybinds-list-item', buttonDialog);
        assert.lengthOf(shortcuts, 4);
      });
    });
  });

  describe('Recording list', () => {
    it('can delete a recording from the list', async ({devToolsPage, inspectedPage}) => {
      await openRecorderAndStartRecording(devToolsPage, inspectedPage);
      await devToolsPage.bringToFront();
      await stopRecording(devToolsPage);

      await devToolsPage.page.select('pierce/select', 'AllRecordingsPage');
      await devToolsPage.click('pierce/.delete-recording-button');

      await devToolsPage.page.waitForSelector('pierce/.empty-state');
    });
  });
});
