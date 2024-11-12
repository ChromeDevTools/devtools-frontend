// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {Target} from 'puppeteer-core';

import type {AssertedEventType, StepType} from '../../../front_end/panels/recorder/models/Schema.js';
import {
  click,
  getBrowserAndPages,
  getResourcesPath,
  getTestServerPort,
  waitFor,
} from '../../../test/shared/helper.js';
import {expectError} from '../../conductor/events.js';

import {
  clickSelectButtonItem,
  onReplayFinished,
  replayShortcut,
  setupRecorderWithScript,
  setupRecorderWithScriptAndReplay,
} from './helpers.js';

describe('Recorder', function() {
  if (this.timeout() !== 0) {
    this.timeout(40000);
  }

  beforeEach(() => {
    // The error is not an indication of the test failure. We should
    // rely on test result with retries.
    expectError(/Replay error Waiting failed/);
  });

  describe('Replay', () => {
    it('should navigate to the url of the first section', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/recorder2.html`,
          },
        ],
      });
      assert.strictEqual(
          target.url(),
          `${getResourcesPath()}/recorder/recorder2.html`,
      );
    });

    it('should be able to replay click steps', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/recorder.html`,
          },
          {
            type: 'click' as StepType.Click,
            selectors: ['a[href="recorder2.html"]'],
            offsetX: 1,
            offsetY: 1,
            assertedEvents: [
              {
                type: 'navigation' as AssertedEventType.Navigation,
                url: `${getResourcesPath()}/recorder/recorder.html`,
              },
            ],
          },
        ],
      });
      assert.strictEqual(
          target.url(),
          `${getResourcesPath()}/recorder/recorder2.html`,
      );
    });

    it('should be able to replay click steps on checkboxes', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/checkbox.html`,
          },
          {
            type: 'click' as StepType.Click,
            selectors: ['input'],
            offsetX: 1,
            offsetY: 1,
          },
        ],
      });
      assert.strictEqual(
          await target.evaluate(() => document.querySelector('input')?.checked),
          true,
      );
    });

    it('should be able to replay keyboard events', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/input.html`,
          },
          {type: 'keyDown' as StepType.KeyDown, target: 'main', key: 'Tab'},
          {type: 'keyUp' as StepType.KeyUp, target: 'main', key: 'Tab'},
          {type: 'keyDown' as StepType.KeyDown, target: 'main', key: '1'},
          {type: 'keyUp' as StepType.KeyUp, target: 'main', key: '1'},
          {type: 'keyDown' as StepType.KeyDown, target: 'main', key: 'Tab'},
          {type: 'keyUp' as StepType.KeyUp, target: 'main', key: 'Tab'},
          {type: 'keyDown' as StepType.KeyDown, target: 'main', key: '2'},
          {type: 'keyUp' as StepType.KeyUp, target: 'main', key: '2'},
        ],
      });
      const value = await target.$eval(
          '#log',
          e => (e as HTMLElement).innerText.trim(),
      );
      assert.strictEqual(value, ['one:1', 'two:2'].join('\n'));
    });

    it('should be able to replay events on select', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/select.html`,
          },
          {
            type: 'change' as StepType.Change,
            target: 'main',
            selectors: ['aria/Select'],
            value: 'O2',
          },
        ],
      });

      const value = await target.$eval(
          '#select',
          e => (e as HTMLSelectElement).value,
      );
      assert.strictEqual(value, 'O2');
    });

    it('should be able to replay events on non text inputs', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/input.html`,
          },
          {
            type: 'change' as StepType.Change,
            target: 'main',
            selectors: ['#color'],
            value: '#333333',
          },
        ],
      });

      const value = await target.$eval(
          '#color',
          e => (e as HTMLSelectElement).value,
      );
      assert.strictEqual(value, '#333333');
    });

    it('should be able to replay events with text selectors', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/iframe1.html`,
          },
          {
            type: 'click' as StepType.Click,
            target: 'main',
            selectors: ['text/To'],
            offsetX: 0,
            offsetY: 0,
          },
        ],
      });

      const frame = target.frames().find(
          frame => frame.url() === `${getResourcesPath()}/recorder/iframe2.html`,
      );
      assert.ok(frame, 'Frame that the target page navigated to is not found');
    });

    it('should be able to replay events with xpath selectors', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/iframe1.html`,
          },
          {
            type: 'click' as StepType.Click,
            target: 'main',
            selectors: ['xpath//html/body/a'],
            offsetX: 0,
            offsetY: 0,
          },
        ],
      });

      const frame = target.frames().find(
          frame => frame.url() === `${getResourcesPath()}/recorder/iframe2.html`,
      );
      assert.ok(frame, 'Frame that the target page navigated to is not found');
    });

    it('should be able to override the value in text inputs that have a value already', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/input.html`,
          },
          {
            type: 'change' as StepType.Change,
            target: 'main',
            selectors: ['#prefilled'],
            value: 'cba',
          },
        ],
      });

      const value = await target.$eval(
          '#prefilled',
          e => (e as HTMLSelectElement).value,
      );
      assert.strictEqual(value, 'cba');
    });

    it('should be able to override the value in text inputs that are partially prefilled', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/input.html`,
          },
          {
            type: 'change' as StepType.Change,
            target: 'main',
            selectors: ['#partially-prefilled'],
            value: 'abcdef',
          },
        ],
      });

      const value = await target.$eval(
          '#partially-prefilled',
          e => (e as HTMLSelectElement).value,
      );
      assert.strictEqual(value, 'abcdef');
    });

    it('should be able to replay viewport change', async () => {
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/select.html`,
          },
          {
            type: 'setViewport' as StepType.SetViewport,
            width: 800,
            height: 600,
            isLandscape: false,
            isMobile: false,
            deviceScaleFactor: 1,
            hasTouch: false,
          },
          {
            type: 'waitForExpression' as StepType.WaitForExpression,
            expression: 'window.visualViewport?.width === 800 && window.visualViewport?.height === 600',
          },
        ],
      });
    });

    it('should be able to replay scroll events', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/scroll.html`,
          },
          {
            type: 'setViewport' as StepType.SetViewport,
            width: 800,
            height: 600,
            isLandscape: false,
            isMobile: false,
            deviceScaleFactor: 1,
            hasTouch: false,
          },
          {
            type: 'scroll' as StepType.Scroll,
            target: 'main',
            selectors: ['body > div:nth-child(1)'],
            x: 0,
            y: 40,
          },
          {type: 'scroll' as StepType.Scroll, target: 'main', x: 40, y: 40},
        ],
      });

      assert.strictEqual(await target.evaluate(() => window.pageXOffset), 40);
      assert.strictEqual(await target.evaluate(() => window.pageYOffset), 40);
      assert.strictEqual(
          await target.evaluate(
              () => document.querySelector('#overflow')?.scrollTop,
              ),
          40,
      );
      assert.strictEqual(
          await target.evaluate(
              () => document.querySelector('#overflow')?.scrollLeft,
              ),
          0,
      );
    });

    it('should be able to scroll into view when needed', async () => {
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/scroll-into-view.html`,
          },
          {
            type: 'click' as StepType.Click,
            selectors: [['button']],
            offsetX: 1,
            offsetY: 1,
          },
        ],
      });
      const {target} = getBrowserAndPages();
      assert.strictEqual(
          await target.evaluate(
              () => document.querySelector('button')?.innerText,
              ),
          'clicked',
      );
    });

    it('should be able to replay ARIA selectors on inputs', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/form.html`,
          },
          {
            type: 'setViewport' as StepType.SetViewport,
            width: 800,
            height: 600,
            isLandscape: false,
            isMobile: false,
            deviceScaleFactor: 1,
            hasTouch: false,
          },
          {
            type: 'click' as StepType.Click,
            target: 'main',
            selectors: ['aria/Name:'],
            offsetX: 1,
            offsetY: 1,
          },
        ],
      });

      assert.strictEqual(
          await target.evaluate(() => document.activeElement?.id),
          'name',
      );
    });

    it('should be able to waitForElement', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/shadow-dynamic.html`,
          },
          {
            type: 'waitForElement' as StepType.WaitForElement,
            selectors: [['custom-element', 'button']],
          },
          {
            type: 'click' as StepType.Click,
            target: 'main',
            selectors: [['custom-element', 'button']],
            offsetX: 1,
            offsetY: 1,
          },
          {
            type: 'waitForElement' as StepType.WaitForElement,
            selectors: [['custom-element', 'button']],
            operator: '>=',
            count: 2,
          },
        ],
      });
      assert.strictEqual(
          await target.evaluate(
              () => document.querySelectorAll('custom-element').length,
              ),
          2,
      );
    });

    it('should be able to waitForExpression', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/shadow-dynamic.html`,
          },
          {
            type: 'click' as StepType.Click,
            target: 'main',
            selectors: [['custom-element', 'button']],
            offsetX: 1,
            offsetY: 1,
          },
          {
            type: 'waitForExpression' as StepType.WaitForExpression,
            target: 'main',
            expression: 'document.querySelectorAll("custom-element").length === 2',
          },
        ],
      });
      assert.strictEqual(
          await target.evaluate(
              () => document.querySelectorAll('custom-element').length,
              ),
          2,
      );
    });

    it('should show PerformancePanel if the MeasurePerformance SelectMenu is clicked for replay', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScript({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/recorder2.html`,
          },
        ],
      });
      const onceFinished = onReplayFinished();
      await click('aria/Performance panel');
      await onceFinished;
      assert.strictEqual(
          target.url(),
          `${getResourcesPath()}/recorder/recorder2.html`,
      );
      await waitFor('[aria-label="Performance panel"]');
    });

    it('should be able to replay actions with popups', async () => {
      const {browser} = getBrowserAndPages();
      const events: Array<{type: string, url: string}> = [];
      // We can't import 'puppeteer' here because its not listed in the tsconfig.json of
      // the test target.
      const targetLifecycleHandler = (target: Target, type: string) => {
        if (!target.url().endsWith('popup.html')) {
          return;
        }
        events.push({type, url: target.url()});
      };
      const targetCreatedHandler = (target: Target) => targetLifecycleHandler(target, 'targetCreated');
      const targetDestroyedHandler = (target: Target) => targetLifecycleHandler(target, 'targetDestroyed');

      browser.on('targetcreated', targetCreatedHandler);
      browser.on('targetdestroyed', targetDestroyedHandler);

      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/recorder.html`,
            assertedEvents: [
              {
                title: '',
                type: 'navigation' as AssertedEventType.Navigation,
                url: 'https://<url>/test/e2e/resources/recorder/recorder.html',
              },
            ],
          },
          {
            type: 'click' as StepType.Click,
            selectors: [['aria/Open Popup'], ['#popup']],
            target: 'main',
            offsetX: 1,
            offsetY: 1,
          },
          {
            type: 'click' as StepType.Click,
            selectors: [['aria/Button in Popup'], ['body > button']],
            target: `${getResourcesPath()}/recorder/popup.html`,
            offsetX: 1,
            offsetY: 1,
          },
          {
            type: 'close' as StepType.Close,
            target: `${getResourcesPath()}/recorder/popup.html`,
          },
        ],
      });
      assert.deepEqual(events, [
        {
          type: 'targetCreated',
          url: `${getResourcesPath()}/recorder/popup.html`,
        },
        {
          type: 'targetDestroyed',
          url: `${getResourcesPath()}/recorder/popup.html`,
        },
      ]);

      browser.off('targetcreated', targetCreatedHandler);
      browser.off('targetdestroyed', targetDestroyedHandler);
    });

    it('should record interactions with OOPIFs', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScriptAndReplay({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `https://localhost:${getTestServerPort()}/test/e2e/resources/recorder/oopif.html`,
            assertedEvents: [
              {
                title: '',
                type: 'navigation' as AssertedEventType.Navigation,
                url: `https://localhost:${getTestServerPort()}/test/e2e/resources/recorder/oopif.html`,
              },
            ],
          },
          {
            type: 'click' as StepType.Click,
            target: `https://devtools.oopif.test:${getTestServerPort()}/test/e2e/resources/recorder/iframe1.html`,
            selectors: [['aria/To iframe 2'], ['body > a']],
            offsetX: 1,
            offsetY: 1,
            assertedEvents: [
              {
                type: 'navigation' as AssertedEventType.Navigation,
                title: '',
                url: `https://devtools.oopif.test:${getTestServerPort()}/test/e2e/resources/recorder/iframe2.html`,
              },
            ],
          },
        ],
      });
      const frame = target.frames().find(
          frame => frame.url() ===
              `https://devtools.oopif.test:${getTestServerPort()}/test/e2e/resources/recorder/iframe2.html`,
      );
      assert.ok(frame, 'Frame that the target page navigated to is not found');
    });

    it('should replay when clicked on slow replay', async () => {
      const {target} = getBrowserAndPages();
      await setupRecorderWithScript({
        title: 'Test Recording',
        steps: [
          {
            type: 'navigate' as StepType.Navigate,
            url: `${getResourcesPath()}/recorder/recorder.html`,
          },
          {
            type: 'click' as StepType.Click,
            selectors: ['a[href="recorder2.html"]'],
            offsetX: 1,
            offsetY: 1,
            assertedEvents: [
              {
                type: 'navigation' as AssertedEventType.Navigation,
                url: `${getResourcesPath()}/recorder/recorder.html`,
              },
            ],
          },
        ],
      });

      const onceFinished = onReplayFinished();
      await clickSelectButtonItem('Slow', 'devtools-replay-section');
      await onceFinished;

      assert.strictEqual(
          target.url(),
          `${getResourcesPath()}/recorder/recorder2.html`,
      );
    });
  });

  it('should be able to start a replay with shortcut', async () => {
    const {target} = getBrowserAndPages();
    await setupRecorderWithScript({
      title: 'Test Recording',
      steps: [
        {
          type: 'navigate' as StepType.Navigate,
          url: `${getResourcesPath()}/recorder/recorder2.html`,
        },
      ],
    });
    const onceFinished = onReplayFinished();
    await replayShortcut();
    await onceFinished;

    assert.strictEqual(
        target.url(),
        `${getResourcesPath()}/recorder/recorder2.html`,
    );
  });

  it('should be able to  navigate to a prerendered page', async () => {
    await setupRecorderWithScriptAndReplay({
      title: 'Test Recording',
      steps: [
        {
          type: 'navigate' as StepType.Navigate,
          url: `${getResourcesPath()}/recorder/prerender.html`,
        },
        {
          type: 'click' as StepType.Click,
          selectors: ['a'],
          offsetX: 1,
          offsetY: 1,
          assertedEvents: [
            {
              type: 'navigation' as AssertedEventType.Navigation,
              url: `${getResourcesPath()}/recorder/prerendered.html`,
            },
          ],
        },
        {
          type: 'waitForExpression' as StepType.WaitForExpression,
          expression: 'document.querySelector("div").innerText === "true"',
        },
      ],
    });
  });
});
