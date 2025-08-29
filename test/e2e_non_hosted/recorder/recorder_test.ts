// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {Page} from 'puppeteer-core';

import type {StepChanged} from '../../../front_end/panels/recorder/components/StepView.js';
import type {RecorderActions} from '../../../front_end/panels/recorder/recorder-actions/recorder-actions.js';
import {
  changeNetworkConditions,
  fillCreateRecordingForm,
  getCurrentRecording,
  getRecordingController,
  onRecorderAttachedToTarget,
  openRecorderPanel,
  processAndVerifyBaseRecording,
  startOrStopRecordingShortcut,
  startRecording,
  startRecordingViaShortcut,
  stopRecording,
} from '../../e2e/helpers/recorder-helpers.js';

describe('Recorder', function() {
  it('should capture the initial page as the url of the first section', async ({inspectedPage, devToolsPage}) => {
    await startRecording(
        'recorder/recorder.html',
        undefined,
        devToolsPage,
        inspectedPage,
    );
    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(processAndVerifyBaseRecording(recording), {steps: []});
  });

  it('should capture clicks on buttons', async ({inspectedPage, devToolsPage}) => {
    await startRecording(
        'recorder/recorder.html',
        undefined,
        devToolsPage,
        inspectedPage,
    );

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#test');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording),
        {
          steps: [

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
        },
    );
  });

  it('should capture multiple clicks with duration', async ({inspectedPage, devToolsPage}) => {
    await startRecording(
        'recorder/recorder.html',
        undefined,
        devToolsPage,
        inspectedPage,
    );

    await inspectedPage.bringToFront();

    const element = await inspectedPage.waitForSelector('#test');

    const point = await element!.clickablePoint();
    await inspectedPage.page.mouse.move(point.x, point.y);

    await inspectedPage.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 350));
    await inspectedPage.page.mouse.up();

    await inspectedPage.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 350));
    await inspectedPage.page.mouse.up();

    const recording = await stopRecording(devToolsPage);
    const steps = recording.steps.slice(2);
    assert.lengthOf(steps, 2);
    for (const step of steps) {
      assert.strictEqual(step.type, 'click');
      assert.isTrue('duration' in step && step.duration && step.duration > 350);
    }
  });

  it('should capture non-primary clicks and double clicks', async ({inspectedPage, devToolsPage}) => {
    await startRecording(
        'recorder/recorder.html',
        undefined,
        devToolsPage,
        inspectedPage,
    );

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#mouse-button', {button: 'middle'});
    await inspectedPage.page.click('#mouse-button', {button: 'right'});
    await inspectedPage.page.click('#mouse-button', {button: 'forward' as 'left'});
    await inspectedPage.page.click('#mouse-button', {button: 'back' as 'left'});
    await inspectedPage.page.click('#mouse-button', {clickCount: 1});
    await inspectedPage.page.click('#mouse-button', {clickCount: 2});

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(processAndVerifyBaseRecording(recording), {
      steps: [
        {
          type: 'click',
          target: 'main',
          selectors: [
            ['aria/Mouse click button'],
            ['#mouse-button'],
            ['xpath///*[@id="mouse-button"]'],
            ['pierce/#mouse-button'],
            ['text/Mouse click button'],
          ],
          button: 'auxiliary'
        },
        {
          type: 'click',
          target: 'main',
          selectors: [
            ['aria/Mouse click button'],
            ['#mouse-button'],
            ['xpath///*[@id="mouse-button"]'],
            ['pierce/#mouse-button'],
            ['text/Mouse click button'],
          ],
          button: 'secondary'
        },
        {
          type: 'click',
          target: 'main',
          selectors: [
            ['aria/Mouse click button'],
            ['#mouse-button'],
            ['xpath///*[@id="mouse-button"]'],
            ['pierce/#mouse-button'],
            ['text/Mouse click button'],
          ],
          button: 'forward'
        },
        {
          type: 'click',
          target: 'main',
          selectors: [
            ['aria/Mouse click button'],
            ['#mouse-button'],
            ['xpath///*[@id="mouse-button"]'],
            ['pierce/#mouse-button'],
            ['text/Mouse click button'],
          ],
          button: 'back'
        },
        {
          type: 'doubleClick',
          target: 'main',
          selectors: [
            ['aria/Mouse click button'],
            ['#mouse-button'],
            ['xpath///*[@id="mouse-button"]'],
            ['pierce/#mouse-button'],
            ['text/Mouse click button'],
          ]
        }
      ]
    });
  });

  it('should capture clicks on input buttons', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/input.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#reset');
    await inspectedPage.page.click('#submit');
    await inspectedPage.page.click('#button');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/input.html',
        }),
        {
          steps: [
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['aria/Reset'],
                ['#reset'],
                ['xpath///*[@id="reset"]'],
                ['pierce/#reset'],
              ]
            },
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['#submit'],
                ['xpath///*[@id="submit"]'],
                ['pierce/#submit'],
              ],
            },
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['#button'],
                ['xpath///*[@id="button"]'],
                ['pierce/#button'],
              ],
            }
          ]
        },
    );
  });

  it('should capture clicks on buttons with custom selector attribute', async ({inspectedPage, devToolsPage}) => {
    await startRecording(
        'recorder/recorder.html',
        {
          selectorAttribute: 'data-devtools-test',
        },
        devToolsPage,
        inspectedPage,
    );

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#selector-attribute');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording),
        {
          selectorAttribute: 'data-devtools-test',
          steps: [{
            type: 'click',
            target: 'main',
            selectors: [
              ['[data-devtools-test=\'selector-attribute\']'],
              ['xpath///*[@data-devtools-test="selector-attribute"]'],
              ['pierce/[data-devtools-test=\'selector-attribute\']'],
              ['aria/Custom selector attribute'],
              ['text/Custom selector'],
            ]
          }]
        },

    );
  });

  it('should capture Enter key presses on buttons', async ({inspectedPage, devToolsPage}) => {
    await startRecording(
        'recorder/recorder.html',
        undefined,
        devToolsPage,
        inspectedPage,
    );

    await inspectedPage.bringToFront();
    const button = await inspectedPage.waitForSelector('#test');
    await button?.press('Enter');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording),
        {
          steps: [
            {
              type: 'keyDown',
              target: 'main',
              key: 'Enter',
            },
            {
              type: 'keyUp',
              key: 'Enter',
              target: 'main',
            }
          ]
        },
    );
  });

  it('should not capture synthetic events', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/recorder.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#synthetic');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording),
        {
          steps: [{
            type: 'click',
            target: 'main',
            selectors: [
              ['aria/Trigger Synthetic Event'],
              ['#synthetic'],
              ['xpath///*[@id="synthetic"]'],
              ['pierce/#synthetic'],
              ['text/Trigger Synthetic'],
            ]
          }]
        },
    );
  });

  it('should capture implicit form submissions', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/form.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#name');
    await inspectedPage.page.type('#name', 'test');
    await inspectedPage.page.keyboard.down('Enter');
    await inspectedPage.page.waitForFunction(async () => {
      return window.location.href.endsWith('form.html?name=test');
    });
    await inspectedPage.page.keyboard.up('Enter');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/form.html',
        }),
        {
          steps: [
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['aria/Name:'],
                ['#name'],
                ['xpath///*[@id="name"]'],
                ['pierce/#name'],
              ]
            },
            {
              type: 'change',
              value: 'test',
              selectors: [
                ['aria/Name:'],
                ['#name'],
                ['xpath///*[@id="name"]'],
                ['pierce/#name'],
              ],
              target: 'main'
            },
            {
              type: 'keyDown',
              target: 'main',
              key: 'Enter',
              assertedEvents: [{
                type: 'navigation',
                url: 'https://localhost:<test-port>/test/e2e/resources/recorder/form.html?name=test',
                title: ''
              }]
            },
            {
              type: 'keyUp',
              key: 'Enter',
              target: 'main',
            }
          ]
        },
    );
  });

  it('should capture clicks on submit buttons inside of forms as click steps',
     async ({inspectedPage, devToolsPage}) => {
       await startRecording(
           'recorder/recorder.html',
           undefined,
           devToolsPage,
           inspectedPage,
       );

       await inspectedPage.bringToFront();
       await inspectedPage.page.click('#form-button');

       const recording = await stopRecording(devToolsPage);
       assert.deepEqual(
           processAndVerifyBaseRecording(recording),
           {
             steps: [{
               type: 'click',
               target: 'main',
               selectors: [
                 ['aria/Form Button'],
                 ['#form-button'],
                 ['xpath///*[@id="form-button"]'],
                 ['pierce/#form-button'],
                 ['text/Form Button'],
               ]
             }]
           },
       );
     });

  it('should build an ARIA selector for the parent element that is interactive',
     async ({inspectedPage, devToolsPage}) => {
       await startRecording(
           'recorder/recorder.html',
           undefined,
           devToolsPage,
           inspectedPage,
       );

       await inspectedPage.bringToFront();
       await inspectedPage.page.click('#span');

       const recording = await stopRecording(devToolsPage);
       assert.deepEqual(processAndVerifyBaseRecording(recording), {
         steps: [{
           type: 'click',
           target: 'main',
           selectors: [
             ['aria/Hello World', 'aria/[role="generic"]'],
             ['#span'],
             ['xpath///*[@id="span"]'],
             ['pierce/#span'],
           ]
         }]
       });
     });

  it('should fall back to a css selector if an element does not have an accessible and interactive parent',
     async ({devToolsPage, inspectedPage}) => {
       await startRecording(
           'recorder/recorder.html',
           undefined,
           devToolsPage,
           inspectedPage,
       );

       await inspectedPage.bringToFront();
       await inspectedPage.page.click('#span2');

       const recording = await stopRecording(devToolsPage);
       assert.deepEqual(
           processAndVerifyBaseRecording(recording),
           {
             steps: [{
               type: 'click',
               target: 'main',
               selectors: [
                 ['#span2'],
                 ['xpath///*[@id="span2"]'],
                 ['pierce/#span2'],
               ],
             }]
           },
       );
     });

  it('should create an aria selector even if the element is within a shadow root',
     async ({inspectedPage, devToolsPage}) => {
       await startRecording('recorder/recorder.html', undefined, devToolsPage, inspectedPage);

       await inspectedPage.bringToFront();
       await inspectedPage.page.click('pierce/#inner-span');

       const recording = await stopRecording(devToolsPage);
       assert.deepEqual(
           processAndVerifyBaseRecording(recording),
           {
             steps: [{
               type: 'click',
               target: 'main',
               selectors: [
                 ['#shadow-root > span', '#inner-span'],
                 ['pierce/#inner-span'],
               ],
             }]
           },
       );
     });

  it('should record clicks on shadow DOM elements with slots containing text nodes only',
     async ({inspectedPage, devToolsPage}) => {
       await startRecording('recorder/shadow-text-node.html', undefined, devToolsPage, inspectedPage);

       await inspectedPage.bringToFront();
       await inspectedPage.page.click('custom-button');

       const recording = await stopRecording(devToolsPage);
       assert.deepEqual(
           processAndVerifyBaseRecording(recording, {
             resource: 'recorder/shadow-text-node.html',
           }),
           {
             steps: [{
               type: 'click',
               target: 'main',
               selectors: [
                 ['custom-button'],
                 ['xpath//html/body/custom-button'],
                 ['pierce/custom-button'],
               ]
             }]
           },
       );
     });

  it('should record interactions with elements within iframes', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/recorder.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.mainFrame().childFrames()[0].click('#in-iframe');
    await inspectedPage.page.mainFrame().childFrames()[0].childFrames()[0].click('aria/Inner iframe button');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording),
        {
          steps: [
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['aria/iframe button'],
                ['#in-iframe'],
                ['xpath///*[@id="in-iframe"]'],
                ['pierce/#in-iframe'],
                ['text/iframe button'],
              ],
              frame: [0]
            },
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['aria/Inner iframe button'],
                ['#inner-iframe'],
                ['xpath///*[@id="inner-iframe"]'],
                ['pierce/#inner-iframe'],
                ['text/Inner iframe'],
              ],
              frame: [0, 0]
            }
          ]
        },
    );
  });

  it('should wait for navigations in the generated scripts', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/recorder.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('aria/Page 2');
    await inspectedPage.page.waitForFunction(() => {
      return window.location.href.endsWith('recorder2.html');
    });
    await inspectedPage.waitForSelector('aria/Back to Page 1');
    await devToolsPage.waitForFunction(async () => {
      const recording = await getCurrentRecording(devToolsPage);
      return recording.steps.length >= 3;
    });
    await inspectedPage.bringToFront();
    await inspectedPage.page.click('aria/Back to Page 1');
    await inspectedPage.page.waitForFunction(async () => {
      return window.location.href.endsWith('recorder.html');
    });

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(processAndVerifyBaseRecording(recording), {
      steps: [
        {
          type: 'click',
          target: 'main',
          selectors: [
            ['aria/Page 2'],
            ['a:nth-of-type(2)'],
            ['xpath//html/body/div/a[2]'],
            ['pierce/a:nth-of-type(2)'],
            ['text/Page 2'],
          ],
          assertedEvents: [{
            type: 'navigation',
            url: 'https://localhost:<test-port>/test/e2e/resources/recorder/recorder2.html',
            title: ''
          }]
        },
        {
          type: 'click',
          target: 'main',
          selectors: [
            ['aria/Back to Page 1'],
            ['a'],
            ['xpath//html/body/a'],
            ['pierce/a'],
            ['text/Back to Page'],
          ],
          assertedEvents: [{
            type: 'navigation',
            url: 'https://localhost:<test-port>/test/e2e/resources/recorder/recorder.html',
            title: ''
          }]
        }
      ]
    });
  });

  it('should also record network conditions', async ({inspectedPage, devToolsPage}) => {
    await startRecording(
        'recorder/recorder.html',
        {
          networkCondition: '3G',
        },
        devToolsPage,
        inspectedPage,
    );

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#test');
    await devToolsPage.bringToFront();
    await changeNetworkConditions('Slow 4G', devToolsPage);
    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#test');
    await devToolsPage.bringToFront();
    await openRecorderPanel(devToolsPage);

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          expectCommon: false,
        }),
        {
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
              ],
            },
            {
              type: 'emulateNetworkConditions',
              download: 180000,
              upload: 84375,
              latency: 562.5,
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
        },
    );
  });

  it('should capture keyboard events on inputs', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/input.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.keyboard.press('Tab');
    await inspectedPage.page.keyboard.type('1');
    await inspectedPage.page.keyboard.press('Tab');
    await inspectedPage.page.keyboard.type('2');
    // TODO(alexrudenko): for some reason the headless test does not flush the buffer
    // when recording is stopped.
    await inspectedPage.evaluate(
        () => (document.activeElement as HTMLElement | null)?.blur(),
    );

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {resource: 'recorder/input.html'}),
        {
          steps: [
            {
              type: 'keyDown',
              target: 'main',
              key: 'Tab',
            },
            {
              type: 'keyUp',
              key: 'Tab',
              target: 'main',
            },
            {
              type: 'change',
              value: '1',
              selectors: [
                ['#one'],
                ['xpath///*[@id="one"]'],
                ['pierce/#one'],
              ],
              target: 'main'
            },
            {
              type: 'keyDown',
              target: 'main',
              key: 'Tab',
            },
            {
              type: 'keyUp',
              key: 'Tab',
              target: 'main',
            },
            {
              type: 'change',
              value: '2',
              selectors: [
                ['#two'],
                ['xpath///*[@id="two"]'],
                ['pierce/#two'],
              ],
              target: 'main'
            }
          ]
        },
    );
  });

  it('should capture keyboard events on non-text inputs', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/input.html', {untrustedEvents: true}, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    const color = await inspectedPage.waitForSelector('#color');
    await color!.click();

    // Imitating an input event.
    await color!.evaluate(el => {
      const element = el as HTMLInputElement;
      element.value = '#333333';
      element.dispatchEvent(new Event('input', {bubbles: true}));
    });

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/input.html',
        }),
        {
          steps: [
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['#color'],
                ['xpath///*[@id="color"]'],
                ['pierce/#color'],
                ['text/#000000'],
              ]
            },
            {
              type: 'change',
              value: '#333333',
              selectors: [
                ['#color'],
                ['xpath///*[@id="color"]'],
                ['pierce/#color'],
                ['text/#000000'],
              ],
              target: 'main'
            }
          ]
        },
    );
  });

  it('should capture navigation without change', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/input.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.keyboard.press('Tab');
    await inspectedPage.page.keyboard.down('Shift');
    await inspectedPage.page.keyboard.press('Tab');
    await inspectedPage.page.keyboard.up('Shift');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/input.html',
        }),
        {
          steps: [
            {
              type: 'keyDown',
              target: 'main',
              key: 'Tab',
            },
            {
              type: 'keyUp',
              key: 'Tab',
              target: 'main',
            },
            {
              type: 'keyDown',
              target: 'main',
              key: 'Shift',
            },
            {
              type: 'keyDown',
              target: 'main',
              key: 'Tab',
            },
            {
              type: 'keyUp',
              key: 'Tab',
              target: 'main',
            },
            {
              type: 'keyUp',
              key: 'Shift',
              target: 'main',
            }
          ]
        },
    );
  });

  it('should capture a change that causes navigation without blur or change', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/programmatic-navigation-on-keydown.html', undefined, devToolsPage, inspectedPage);
    await inspectedPage.bringToFront();
    await inspectedPage.waitForSelector('input');
    await inspectedPage.page.keyboard.press('1');
    await inspectedPage.page.keyboard.press('Enter', {delay: 50});

    await devToolsPage.waitForFunction(async () => {
      const controller = await getRecordingController(devToolsPage);
      return await controller.evaluate(
          c => c.getCurrentRecordingForTesting()?.flow.steps.length === 5,
      );
    });

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/programmatic-navigation-on-keydown.html',
        }),
        {
          steps: [
            {
              type: 'change',
              value: '1',
              selectors: [
                ['input'],
                ['xpath//html/body/input'],
                ['pierce/input'],
              ],
              target: 'main'
            },
            {
              type: 'keyDown',
              target: 'main',
              key: 'Enter',
              assertedEvents: [{
                type: 'navigation',
                url: 'https://localhost:<test-port>/test/e2e/resources/recorder/input.html',
                title: ''
              }]
            },
            {
              type: 'keyUp',
              key: 'Enter',
              target: 'main',
            }
          ]
        },
    );
  });

  it('should associate events with right navigations', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/multiple-navigations.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('button');
    await inspectedPage.page.waitForFunction(async () => {
      return window.location.href.endsWith('input.html');
    });

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/multiple-navigations.html',
        }),
        {
          steps: [{
            type: 'click',
            target: 'main',
            selectors: [
              ['aria/Navigate'],
              ['button'],
              ['xpath//html/body/button'],
              ['pierce/button'],
              ['text/Navigate'],
            ],
            assertedEvents: [{
              type: 'navigation',
              url: 'https://localhost:<test-port>/test/e2e/resources/recorder/input.html',
              title: ''
            }]
          }]
        },
    );
  });

  it('should work for select elements', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/select.html', {untrustedEvents: true}, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#select');
    await inspectedPage.page.select('#select', 'O2');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/select.html',
        }),
        {
          steps: [
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['aria/Select'],
                ['#select'],
                ['xpath///*[@id="select"]'],
                ['pierce/#select'],
              ]
            },
            {
              type: 'change',
              value: 'O2',
              selectors: [
                ['aria/Select'],
                ['#select'],
                ['xpath///*[@id="select"]'],
                ['pierce/#select'],
              ],
              target: 'main'
            }
          ]
        },
    );
  });

  it('should work for checkbox elements', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/checkbox.html', {untrustedEvents: true}, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#checkbox');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/checkbox.html',
        }),
        {
          steps: [{
            type: 'click',
            target: 'main',
            selectors: [
              ['aria/checkbox'],
              ['#checkbox'],
              ['xpath///*[@id="checkbox"]'],
              ['pierce/#checkbox'],
            ]
          }]
        },
    );
  });

  it('should work for elements modified on mousedown', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/input.html', {untrustedEvents: true}, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#to-be-modified');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/input.html',
        }),
        {
          steps: [{
            type: 'click',
            target: 'main',
            selectors: [
              ['#to-be-modified'],
              ['xpath///*[@id="to-be-modified"]'],
              ['pierce/#to-be-modified'],
            ]
          }]
        },
    );
  });

  it('should record OOPIF interactions', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/oopif.html', {untrustedEvents: true}, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    const frame = inspectedPage.page.frames().find(frame => frame.url().endsWith('iframe1.html'));
    const link = await frame!.waitForSelector('a');
    const frame2Promise = inspectedPage.page.waitForFrame(
        frame => frame.url().endsWith('iframe2.html'),
    );
    await link!.click();
    const frame2 = await frame2Promise;
    await frame2?.waitForSelector('a');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(processAndVerifyBaseRecording(recording, {resource: 'recorder/oopif.html'}), {
      steps: [{
        type: 'click',
        target: 'https://devtools.oopif.test:<test-port>/test/e2e/resources/recorder/iframe1.html',
        selectors: [
          ['aria/To iframe 2'],
          ['a'],
          ['xpath//html/body/a'],
          ['pierce/a'],
          ['text/To iframe 2'],
        ],
        assertedEvents: [{
          type: 'navigation',
          url: 'https://devtools.oopif.test:<test-port>/test/e2e/resources/recorder/iframe2.html',
          title: ''
        }]
      }]
    });
  });

  it('should capture and store screenshots for every section', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/recorder.html', undefined, devToolsPage, inspectedPage);
    await inspectedPage.bringToFront();
    await devToolsPage.raf();
    await stopRecording(devToolsPage);
    await devToolsPage.waitFor('.section .screenshot');
  });

  it('should record interactions with popups', async ({inspectedPage, devToolsPage, browser}) => {
    await startRecording('recorder/recorder.html', {untrustedEvents: true}, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    const openPopupButton = await inspectedPage.waitForSelector('aria/Open Popup');
    // Popups are separate targets so Recorder is only able to learn about them
    // after a while. To allow no-flaky testing, we need to synchronies with the
    // devToolsPage here.
    const recorderHandledPopup = onRecorderAttachedToTarget(devToolsPage);
    await openPopupButton?.click();
    await devToolsPage.waitForFunction(async () => {
      const controller = await getRecordingController(devToolsPage);
      return await controller.evaluate(c => {
        const steps = c.getCurrentRecordingForTesting()?.flow.steps;
        return steps?.length === 3 && steps[1].assertedEvents?.length === 1;
      });
    });

    const popupTarget = await browser.browser.waitForTarget(
        target => target.url().endsWith('popup.html'),
    );
    const popupPage = (await popupTarget.page()) as Page;
    await popupPage.bringToFront();

    await recorderHandledPopup;
    const buttonInPopup = await popupPage.waitForSelector(
        'aria/Button in Popup',
    );
    await buttonInPopup!.click();
    await devToolsPage.bringToFront();
    await devToolsPage.waitForFunction(async () => {
      const controller = await getRecordingController(devToolsPage);
      return await controller.evaluate(
          c => c.getCurrentRecordingForTesting()?.flow.steps.length === 4,
      );
    });

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording),
        {
          steps: [
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['aria/Open Popup'],
                ['#popup'],
                ['xpath///*[@id="popup"]'],
                ['pierce/#popup'],
                ['text/Open Popup'],
              ]
            },
            {
              type: 'click',
              target: 'https://localhost:<test-port>/test/e2e/resources/recorder/popup.html',
              selectors: [
                ['aria/Button in Popup'],
                ['button'],
                ['xpath//html/body/button'],
                ['pierce/button'],
                ['text/Button in Popup'],
              ]
            }
          ]
        },
    );
  });

  it('should break out shifts in text controls', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/input.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.keyboard.press('Tab');
    await inspectedPage.page.keyboard.type('1');
    await inspectedPage.page.keyboard.press('Shift');
    await inspectedPage.page.keyboard.type('d');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/input.html',
        }),
        {
          steps: [
            {
              type: 'keyDown',
              target: 'main',
              key: 'Tab',
            },
            {
              type: 'keyUp',
              key: 'Tab',
              target: 'main',
            },
            {
              type: 'change',
              value: '1',
              selectors: [
                ['#one'],
                ['xpath///*[@id="one"]'],
                ['pierce/#one'],
              ],
              target: 'main'
            },
            {
              type: 'keyDown',
              target: 'main',
              key: 'Shift',
            },
            {
              type: 'keyUp',
              key: 'Shift',
              target: 'main',
            },
            {
              type: 'change',
              value: '1d',
              selectors: [
                ['#one'],
                ['xpath///*[@id="one"]'],
                ['pierce/#one'],
              ],
              target: 'main'
            }
          ]
        });
  });

  it('should work with contiguous inputs', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/input.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();

    // Focus the first input in the contiguous line of inputs.
    await inspectedPage.waitForSelector('#contiguous-field-1');
    await inspectedPage.page.focus('#contiguous-field-1');

    // This should type into `#contiguous-field-1` and `#contiguous-field-2` due
    // to the in-page script.
    await inspectedPage.page.keyboard.type('somethingworks');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/input.html',
        }),
        {
          steps: [
            {
              type: 'change',
              value: 'something',
              selectors: [
                ['#contiguous-field-1'],
                ['xpath///*[@id="contiguous-field-1"]'],
                ['pierce/#contiguous-field-1'],
              ],
              target: 'main'
            },
            {
              type: 'change',
              value: 'works',
              selectors: [
                ['#contiguous-field-2'],
                ['xpath///*[@id="contiguous-field-2"]'],
                ['pierce/#contiguous-field-2'],
              ],
              target: 'main'
            }
          ]
        },
    );
  });

  it('should work with shadow inputs', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/shadow-input.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('custom-input');
    await inspectedPage.page.keyboard.type('works');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          resource: 'recorder/shadow-input.html',
        }),
        {
          steps: [
            {
              type: 'click',
              target: 'main',
              selectors: [
                ['custom-input', 'input'],
                ['pierce/input'],
              ],
            },
            {
              type: 'change',
              value: 'works',
              selectors: [
                ['custom-input', 'input'],
                ['pierce/input'],
              ],
              target: 'main'
            }
          ]
        });
  });

  it('should edit while recording', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/recorder.html', undefined, devToolsPage, inspectedPage);

    const steps = await devToolsPage.waitForFunction(async () => {
      const steps = await devToolsPage.$$('devtools-step-view');
      return steps.length === 3 ? steps : undefined;
    });
    const lastStep = steps.pop();

    if (!lastStep) {
      throw new Error('Step is not found.');
    }

    await lastStep.click({button: 'right'});

    const removeStep = await devToolsPage.waitForAria('Remove step[role="menuitem"]');
    await removeStep.click();

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#test');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(
        processAndVerifyBaseRecording(recording, {
          expectCommon: false,
        }),
        {
          title: 'New Recording',
          steps: [
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
        },
    );
  });

  it('should edit the type while recording', async ({inspectedPage, devToolsPage}) => {
    await startRecording('recorder/recorder.html', undefined, devToolsPage, inspectedPage);

    await inspectedPage.bringToFront();
    await inspectedPage.page.click('#test');

    await devToolsPage.bringToFront();
    const steps = await devToolsPage.waitForFunction(async () => {
      const steps = await devToolsPage.$$('devtools-step-view');
      return steps.length === 5 ? steps : undefined;
    });
    const step = steps.pop();
    assert.isOk(step);
    const title = await step.waitForSelector(':scope >>>> .main-title');
    await title!.click();

    const input = await step.waitForSelector(
        ':scope >>>> devtools-recorder-step-editor >>>> div:nth-of-type(1) > devtools-suggestion-input');
    await input!.focus();

    const eventPromise = step.evaluate(element => {
      return new Promise(resolve => {
        element.addEventListener('stepchanged', (event: Event) => {
          resolve((event as StepChanged).newStep);
        }, {once: true});
      });
    });

    await devToolsPage.page.keyboard.type('emulateNetworkConditions');
    await devToolsPage.page.keyboard.press('Enter');

    assert.deepEqual(await eventPromise, {
      download: 1000,
      latency: 25,
      type: 'emulateNetworkConditions',
      upload: 1000,
    });

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(processAndVerifyBaseRecording(recording), {
      steps: [{
        type: 'emulateNetworkConditions',
        download: 1000,
        latency: 25,
        upload: 1000,
      }]
    });
  });

  it('should add an assertion through the button', async ({inspectedPage, devToolsPage}) => {
    await startRecording(
        'recorder/recorder.html',
        undefined,
        devToolsPage,
        inspectedPage,
    );

    // Find the button.
    await devToolsPage.click('.add-assertion-button');

    await devToolsPage.renderCoordinatorQueueEmpty();

    // Get the latest step.
    const step = await devToolsPage.waitFor('.section:last-child devtools-step-view:last-of-type');

    // Check that it's expanded.
    if (!(await step.waitForSelector('pierce/devtools-timeline-section.expanded'))) {
      throw new Error('Last step is not open.');
    }

    // Check that it's the correct step.
    assert.strictEqual(await step.$eval('pierce/.main-title', element => element.textContent), 'Wait for element');

    const recording = await stopRecording(devToolsPage);
    assert.deepEqual(processAndVerifyBaseRecording(recording), {
      steps: [{
        type: 'waitForElement',
        selectors: [
          ['.cls'],
        ],
      }]
    });
  });

  describe('Shortcuts', () => {
    it('should not open create a new recording while recording', async ({inspectedPage, devToolsPage}) => {
      await startRecordingViaShortcut('recorder/recorder.html', devToolsPage, inspectedPage);
      const controller = await getRecordingController(devToolsPage);
      await controller.evaluate(element => {
        return element.handleActions(
            'chrome-recorder.create-recording' as RecorderActions.CREATE_RECORDING,
        );
      });
      const page = await controller.evaluate(element => {
        return element.getCurrentPageForTesting();
      });

      assert.notStrictEqual(page, 'CreateRecordingPage');

      await stopRecording(devToolsPage);
    });

    it('should start with keyboard shortcut while on the create page', async ({inspectedPage, devToolsPage}) => {
      await fillCreateRecordingForm('recorder/recorder.html', devToolsPage, inspectedPage);
      await startOrStopRecordingShortcut('devToolsPage', devToolsPage, inspectedPage);
      const recording = await stopRecording(devToolsPage);
      assert.deepEqual(processAndVerifyBaseRecording(recording), {steps: []});
    });

    it('should stop with keyboard shortcut without recording it', async ({inspectedPage, devToolsPage}) => {
      await startRecordingViaShortcut('recorder/recorder.html', devToolsPage, inspectedPage);
      const recording = await startOrStopRecordingShortcut('devToolsPage', devToolsPage, inspectedPage);
      assert.deepEqual(
          processAndVerifyBaseRecording({
            ...recording,
            title: 'New Recording',
          }),
          {steps: []},
      );
    });

    it('should stop recording with shortcut on the target', async ({inspectedPage, devToolsPage}) => {
      await startRecording(
          'recorder/recorder.html',
          undefined,
          devToolsPage,
          inspectedPage,
      );

      await inspectedPage.bringToFront();
      await inspectedPage.page.keyboard.down('e');
      await inspectedPage.page.keyboard.up('e');

      const recording = await startOrStopRecordingShortcut(
          'inspectedPage',
          devToolsPage,
          inspectedPage,
      );
      assert.deepEqual(processAndVerifyBaseRecording(recording), {
        steps: [
          {
            type: 'keyDown',
            target: 'main',
            key: 'e',
          },
          {
            type: 'keyUp',
            key: 'e',
            target: 'main',
          }
        ]
      });
    });
  });
});
