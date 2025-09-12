// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {Target} from 'puppeteer-core';

import type {AssertedEventType, StepType} from '../../../front_end/panels/recorder/models/Schema.js';
import {expectError} from '../../conductor/events.js';
import {
  clickSelectButtonItem,
  onReplayFinished,
  replayShortcut,
  setupRecorderWithScript,
  setupRecorderWithScriptAndReplay,
} from '../../e2e/helpers/recorder-helpers.js';

describe('Recorder', function() {
  if (this.timeout() !== 0) {
    this.timeout(40000);
  }

  setup(() => {
    // The error is not an indication of the test failure. We should
    // rely on test result with retries.
    expectError(/Replay error Waiting failed/);
  });

  describe('Replay', () => {
    it('should navigate to the url of the first section', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/recorder2.html`,
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
      assert.strictEqual(
          inspectedPage.page.url(),
          `${inspectedPage.getResourcesPath()}/recorder/recorder2.html`,
      );
    });

    it('should be able to replay click steps', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/recorder.html`,
              },
              {
                type: 'click' as StepType.Click,
                selectors: ['a[href="recorder2.html"]'],
                offsetX: 1,
                offsetY: 1,
                assertedEvents: [
                  {
                    type: 'navigation' as AssertedEventType.Navigation,
                    url: `${inspectedPage.getResourcesPath()}/recorder/recorder.html`,
                  },
                ],
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
      assert.strictEqual(
          inspectedPage.page.url(),
          `${inspectedPage.getResourcesPath()}/recorder/recorder2.html`,
      );
    });

    it('should be able to replay click steps on checkboxes', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/checkbox.html`,
              },
              {
                type: 'click' as StepType.Click,
                selectors: ['input'],
                offsetX: 1,
                offsetY: 1,
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
      assert.isTrue(await inspectedPage.evaluate(() => document.querySelector('input')?.checked));
    });

    it('should not be able to navigate to chrome URLs', async ({devToolsPage, inspectedPage}) => {
      expectError('Replay error Not allowed to replay on chrome:// URLs');
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: 'chrome://version',
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
    });

    it('should be able to replay keyboard events', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/input.html`,
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
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
      const value = await inspectedPage.page.$eval(
          '#log',
          e => (e as HTMLElement).innerText.trim(),
      );
      assert.strictEqual(value, ['one:1', 'two:2'].join('\n'));
    });

    it('should be able to replay events on select', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/select.html`,
              },
              {
                type: 'change' as StepType.Change,
                target: 'main',
                selectors: ['aria/Select'],
                value: 'O2',
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );

      const value = await inspectedPage.page.$eval(
          '#select',
          e => (e as HTMLSelectElement).value,
      );
      assert.strictEqual(value, 'O2');
    });

    it('should be able to replay events on non text inputs', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/input.html`,
              },
              {
                type: 'change' as StepType.Change,
                target: 'main',
                selectors: ['#color'],
                value: '#333333',
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );

      const value = await inspectedPage.page.$eval(
          '#color',
          e => (e as HTMLSelectElement).value,
      );
      assert.strictEqual(value, '#333333');
    });

    it('should be able to replay events with text selectors', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/iframe1.html`,
              },
              {
                type: 'click' as StepType.Click,
                target: 'main',
                selectors: ['text/To'],
                offsetX: 0,
                offsetY: 0,
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );

      const frame = inspectedPage.page.frames().find(
          frame => frame.url() === `${inspectedPage.getResourcesPath()}/recorder/iframe2.html`,
      );
      assert.isOk(frame, 'Frame that the target page navigated to is not found');
    });

    it('should be able to replay events with xpath selectors', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/iframe1.html`,
              },
              {
                type: 'click' as StepType.Click,
                target: 'main',
                selectors: ['xpath//html/body/a'],
                offsetX: 0,
                offsetY: 0,
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );

      const frame = inspectedPage.page.frames().find(
          frame => frame.url() === `${inspectedPage.getResourcesPath()}/recorder/iframe2.html`,
      );
      assert.isOk(frame, 'Frame that the target page navigated to is not found');
    });

    it('should be able to override the value in text inputs that have a value already',
       async ({inspectedPage, devToolsPage}) => {
         await setupRecorderWithScriptAndReplay(
             {
               title: 'Test Recording',
               steps: [
                 {
                   type: 'navigate' as StepType.Navigate,
                   url: `${inspectedPage.getResourcesPath()}/recorder/input.html`,
                 },
                 {
                   type: 'change' as StepType.Change,
                   target: 'main',
                   selectors: ['#prefilled'],
                   value: 'cba',
                 },
               ],
             },
             undefined,
             devToolsPage,
             inspectedPage,
         );

         const value = await inspectedPage.page.$eval(
             '#prefilled',
             e => (e as HTMLSelectElement).value,
         );
         assert.strictEqual(value, 'cba');
       });

    it('should be able to override the value in text inputs that are partially prefilled',
       async ({inspectedPage, devToolsPage}) => {
         await setupRecorderWithScriptAndReplay(
             {
               title: 'Test Recording',
               steps: [
                 {
                   type: 'navigate' as StepType.Navigate,
                   url: `${inspectedPage.getResourcesPath()}/recorder/input.html`,
                 },
                 {
                   type: 'change' as StepType.Change,
                   target: 'main',
                   selectors: ['#partially-prefilled'],
                   value: 'abcdef',
                 },
               ],
             },
             undefined,
             devToolsPage,
             inspectedPage,
         );

         const value = await inspectedPage.page.$eval(
             '#partially-prefilled',
             e => (e as HTMLSelectElement).value,
         );
         assert.strictEqual(value, 'abcdef');
       });

    it('should be able to replay viewport change', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/select.html`,
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
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
    });

    it('should be able to replay scroll events', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/scroll.html`,
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
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );

      assert.strictEqual(await inspectedPage.evaluate(() => window.pageXOffset), 40);
      assert.strictEqual(await inspectedPage.evaluate(() => window.pageYOffset), 40);
      assert.strictEqual(
          await inspectedPage.evaluate(() => document.querySelector('#overflow')?.scrollTop),
          40,
      );
      assert.strictEqual(
          await inspectedPage.evaluate(() => document.querySelector('#overflow')?.scrollLeft),
          0,
      );
    });

    it('should be able to scroll into view when needed', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/scroll-into-view.html`,
              },
              {
                type: 'click' as StepType.Click,
                selectors: [['button']],
                offsetX: 1,
                offsetY: 1,
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );

      assert.strictEqual(
          await inspectedPage.evaluate(() => document.querySelector('button')?.innerText),
          'clicked',
      );
    });

    it('should be able to replay ARIA selectors on inputs', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/form.html`,
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
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );

      assert.strictEqual(
          await inspectedPage.evaluate(() => document.activeElement?.id),
          'name',
      );
    });

    it('should be able to waitForElement', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/shadow-dynamic.html`,
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
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
      assert.strictEqual(
          await inspectedPage.evaluate(() => document.querySelectorAll('custom-element').length),
          2,
      );
    });

    it('should be able to waitForExpression', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/shadow-dynamic.html`,
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
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
      assert.strictEqual(
          await inspectedPage.evaluate(
              () => document.querySelectorAll('custom-element').length,
              ),
          2,
      );
    });

    it('should show PerformancePanel if the MeasurePerformance SelectMenu is clicked for replay',
       async ({inspectedPage, devToolsPage}) => {
         await setupRecorderWithScript(
             {
               title: 'Test Recording',
               steps: [
                 {
                   type: 'navigate' as StepType.Navigate,
                   url: `${inspectedPage.getResourcesPath()}/recorder/recorder2.html`,
                 },
               ],
             },
             undefined,
             devToolsPage,
             inspectedPage,
         );
         const onceFinished = onReplayFinished(devToolsPage);
         await devToolsPage.click('aria/Performance panel');
         await onceFinished;
         assert.strictEqual(
             inspectedPage.page.url(),
             `${inspectedPage.getResourcesPath()}/recorder/recorder2.html`,
         );
         await devToolsPage.waitFor('[aria-label="Performance panel"]');
       });

    it('should be able to replay actions with popups', async ({inspectedPage, devToolsPage, browser}) => {
      const events: Array<{type: string, url: string}> = [];
      // We can't import 'puppeteer' here because its not listed in the tsconfig.json of
      // the test inspectedPage.
      const targetLifecycleHandler = (target: Target, type: string) => {
        if (!target.url().endsWith('popup.html')) {
          return;
        }
        events.push({type, url: target.url()});
      };
      const targetCreatedHandler = (target: Target) => targetLifecycleHandler(target, 'targetCreated');
      const targetDestroyedHandler = (target: Target) => targetLifecycleHandler(target, 'targetDestroyed');

      browser.browser.on('targetcreated', targetCreatedHandler);
      browser.browser.on('targetdestroyed', targetDestroyedHandler);

      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/recorder.html`,
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
                target: `${inspectedPage.getResourcesPath()}/recorder/popup.html`,
                offsetX: 1,
                offsetY: 1,
              },
              {
                type: 'close' as StepType.Close,
                target: `${inspectedPage.getResourcesPath()}/recorder/popup.html`,
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
      assert.deepEqual(events, [
        {
          type: 'targetCreated',
          url: `${inspectedPage.getResourcesPath()}/recorder/popup.html`,
        },
        {
          type: 'targetDestroyed',
          url: `${inspectedPage.getResourcesPath()}/recorder/popup.html`,
        },
      ]);

      browser.browser.off('targetcreated', targetCreatedHandler);
      browser.browser.off('targetdestroyed', targetDestroyedHandler);
    });

    it('should record interactions with OOPIFs', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScriptAndReplay(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/oopif.html`,
                assertedEvents: [
                  {
                    title: '',
                    type: 'navigation' as AssertedEventType.Navigation,
                    url: `${inspectedPage.getResourcesPath()}/recorder/oopif.html`,
                  },
                ],
              },
              {
                type: 'click' as StepType.Click,
                target: `${inspectedPage.getOopifResourcesPath()}/recorder/iframe1.html`,
                selectors: [['aria/To iframe 2'], ['body > a']],
                offsetX: 1,
                offsetY: 1,
                assertedEvents: [
                  {
                    type: 'navigation' as AssertedEventType.Navigation,
                    title: '',
                    url: `${inspectedPage.getOopifResourcesPath()}/recorder/iframe2.html`,
                  },
                ],
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );
      const frame = inspectedPage.page.frames().find(
          frame => frame.url() === `${inspectedPage.getOopifResourcesPath()}/recorder/iframe2.html`,
      );
      assert.isOk(frame, 'Frame that the target page navigated to is not found');
    });

    it('should replay when clicked on slow replay', async ({inspectedPage, devToolsPage}) => {
      await setupRecorderWithScript(
          {
            title: 'Test Recording',
            steps: [
              {
                type: 'navigate' as StepType.Navigate,
                url: `${inspectedPage.getResourcesPath()}/recorder/recorder.html`,
              },
              {
                type: 'click' as StepType.Click,
                selectors: ['a[href="recorder2.html"]'],
                offsetX: 1,
                offsetY: 1,
                assertedEvents: [
                  {
                    type: 'navigation' as AssertedEventType.Navigation,
                    url: `${inspectedPage.getResourcesPath()}/recorder/recorder.html`,
                  },
                ],
              },
            ],
          },
          undefined,
          devToolsPage,
          inspectedPage,
      );

      const onceFinished = onReplayFinished(devToolsPage);
      await clickSelectButtonItem('Slow', 'devtools-replay-section', devToolsPage);
      await onceFinished;

      assert.strictEqual(
          inspectedPage.page.url(),
          `${inspectedPage.getResourcesPath()}/recorder/recorder2.html`,
      );
    });
  });

  it('should be able to start a replay with shortcut', async ({inspectedPage, devToolsPage}) => {
    await setupRecorderWithScript(
        {
          title: 'Test Recording',
          steps: [
            {
              type: 'navigate' as StepType.Navigate,
              url: `${inspectedPage.getResourcesPath()}/recorder/recorder2.html`,
            },
          ],
        },
        undefined,
        devToolsPage,
        inspectedPage,
    );
    const onceFinished = onReplayFinished(devToolsPage);
    await replayShortcut(devToolsPage);
    await onceFinished;

    assert.strictEqual(
        inspectedPage.page.url(),
        `${inspectedPage.getResourcesPath()}/recorder/recorder2.html`,
    );
  });

  it('should be able to navigate to a prerendered page', async ({inspectedPage, devToolsPage}) => {
    await setupRecorderWithScriptAndReplay(
        {
          title: 'Test Recording',
          steps: [
            {
              type: 'navigate' as StepType.Navigate,
              url: `${inspectedPage.getResourcesPath()}/recorder/prerender.html`,
            },
            {
              type: 'click' as StepType.Click,
              selectors: ['a'],
              offsetX: 1,
              offsetY: 1,
              assertedEvents: [
                {
                  type: 'navigation' as AssertedEventType.Navigation,
                  url: `${inspectedPage.getResourcesPath()}/recorder/prerendered.html`,
                },
              ],
            }
          ],
        },
        undefined,
        devToolsPage,
        inspectedPage,
    );
    const isPrerendered = await inspectedPage.evaluate(() => {
      return document.querySelector('div')!.innerText === 'true';
    });

    assert.isTrue(isPrerendered);
  });
});
