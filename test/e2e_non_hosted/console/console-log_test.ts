// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CONSOLE_ALL_MESSAGES_SELECTOR,
  focusConsolePrompt,
  getConsoleMessages,
  getCurrentConsoleMessages,
  getStructuredConsoleMessages,
  navigateToConsoleTab,
  showVerboseMessages,
  typeIntoConsoleAndWaitForResult,
  waitForConsoleInfoMessageAndClickOnLink,
  waitForLastConsoleMessageToHaveContent,
} from '../../e2e/helpers/console-helpers.js';
import {
  addLogpointForLine,
  openSourceCodeEditorForFile,
} from '../../e2e/helpers/sources-helpers.js';
import {
  replacePuppeteerUrl,
} from '../../shared/helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

/* eslint-disable no-console */

describe('The Console Tab', () => {
  const tests = [
    {
      description: 'produces console messages when a page logs using console.log',
      evaluate: () => console.log('log'),
      expectedMessages: [{
        message: 'log',
        messageClasses: 'console-message',
        repeatCount: null,
        source: '(index):1',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
      }],
    },
    {
      description: 'produces console messages when a page logs using console.debug',
      evaluate: () => console.debug('debug'),
      expectedMessages: [{
        message: 'debug',
        messageClasses: 'console-message',
        repeatCount: null,
        source: '(index):1',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-from-api console-verbose-level',
      }],
    },
    {
      description: 'produces console messages when a page logs using console.warn',
      evaluate: () => console.warn('warn'),
      expectedMessages: [{
        message: 'warn',
        messageClasses: 'console-message',
        repeatCount: null,
        source: '(index):1',
        stackPreview: '\n(anonymous) @ (index):1',
        wrapperClasses: 'console-message-wrapper console-from-api console-warning-level',
      }],
    },
    {
      description: 'produces console messages when a page logs using console.error',
      evaluate: () => console.error('error'),
      expectedMessages: [{
        message: 'error',
        messageClasses: 'console-message',
        repeatCount: null,
        source: '(index):1',
        stackPreview: '\n(anonymous) @ (index):1',
        wrapperClasses: 'console-message-wrapper console-from-api console-error-level',
      }],
    },
    {
      description: 'produces a single console message when messages are repeated',
      evaluate: () => {
        for (let i = 0; i < 5; ++i) {
          console.log('repeated');
        }
      },
      expectedMessages: [{
        message: 'repeated',
        messageClasses: 'console-message repeated-message',
        repeatCount: '5',
        source: '(index):3',
        stackPreview: null,
        wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
      }],
    },
    {
      description: 'counts how many time console.count has been called with the same message',
      evaluate: () => {
        for (let i = 0; i < 2; ++i) {
          console.count('count');
        }
      },
      expectedMessages: [
        {
          message: 'count: 1',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):3',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'count: 2',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):3',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
      ],
    },
    {
      description: 'creates an empty group message using console.group/console.groupEnd',
      evaluate: () => {
        console.group('group');
        console.groupEnd();
      },
      expectedMessages: [
        {
          message: 'group',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):2',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-group-title console-from-api console-info-level',
        },
      ],
    },
    {
      description: 'logs multiple arguments using console.log',
      evaluate: () => {
        console.log('1', '2', '3');
      },
      expectedMessages: [
        {
          message: '1 2 3',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):2',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
      ],
    },
    {
      description: 'creates a collapsed group using console.groupCollapsed with all messages in between hidden',
      evaluate: () => {
        console.groupCollapsed('groupCollapsed');
        console.log({property: 'value'});
        console.log(42);
        console.log(true);
        console.log(null);
        console.log(undefined);
        console.log(document);
        console.log(function() {});
        console.log(function f() {});
        console.log([1, 2, 3]);
        console.log(/regexp.*/);
        console.groupEnd();
      },
      expectedMessages: [
        {
          message: 'groupCollapsed',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):2',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-group-title console-from-api console-info-level',
        },
      ],
    },
    {
      description: 'logs console.count messages with and without arguments',
      evaluate: () => {
        console.count();
        console.count();
        console.count();
        console.count('title');
        console.count('title');
        console.count('title');
      },
      expectedMessages: [
        {
          message: 'default: 1',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):2',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'default: 2',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):3',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'default: 3',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):4',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'title: 1',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):5',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'title: 2',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):6',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
        {
          message: 'title: 3',
          messageClasses: 'console-message',
          repeatCount: null,
          source: '(index):7',
          stackPreview: null,
          wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
        },
      ],
    },
  ];

  for (const test of tests) {
    it(test.description, async ({devToolsPage, inspectedPage}) => {
      await navigateToConsoleTab(devToolsPage);
      await showVerboseMessages(devToolsPage);
      await inspectedPage.evaluate(test.evaluate);
      const actualMessages = await devToolsPage.waitForFunction(async () => {
        const messages = await getStructuredConsoleMessages(devToolsPage);
        return messages.length === test.expectedMessages.length ? messages : undefined;
      });
      for (const message of actualMessages) {
        if (message.source?.includes('pptr:')) {
          message.source = replacePuppeteerUrl(message.source);
        }
        if (message.stackPreview?.includes('pptr:')) {
          message.stackPreview = replacePuppeteerUrl(message.stackPreview);
        }
      }
      assert.deepEqual(actualMessages, test.expectedMessages, 'Console message does not match the expected message');
    });
  }

  describe('keyboard navigation', () => {
    it('can navigate between individual messages', async ({devToolsPage, inspectedPage}) => {
      await getConsoleMessages('focus-interaction', undefined, undefined, devToolsPage, inspectedPage);
      await focusConsolePrompt(devToolsPage);

      await devToolsPage.tabBackward();
      assert.strictEqual(await devToolsPage.activeElementTextContent(), 'focus-interaction.html:9');

      await devToolsPage.pressKey('ArrowUp');
      assert.strictEqual(await devToolsPage.activeElementTextContent(), 'focus-interaction.html:9 Third message');

      await devToolsPage.pressKey('ArrowUp');
      assert.strictEqual(await devToolsPage.activeElementTextContent(), 'focus-interaction.html:8');

      await devToolsPage.pressKey('ArrowDown');
      assert.strictEqual(await devToolsPage.activeElementTextContent(), 'focus-interaction.html:9 Third message');

      await devToolsPage
          .tabBackward();  // Focus should now be on the console settings, e.g. out of the list of console messages
      assert.strictEqual(await devToolsPage.activeElementAccessibleName(), 'Console settings');

      await devToolsPage.tabForward();  // Focus is now back to the list, selecting the last message source URL
      assert.strictEqual(await devToolsPage.activeElementTextContent(), 'focus-interaction.html:9');

      await devToolsPage.tabForward();
      assert.strictEqual(await devToolsPage.activeElementAccessibleName(), 'Console prompt');
    });

    it('should not lose focus on prompt when logging and scrolling', async ({inspectedPage, devToolsPage}) => {
      await getConsoleMessages('focus-interaction', undefined, undefined, devToolsPage, inspectedPage);
      await focusConsolePrompt(devToolsPage);

      await inspectedPage.evaluate(() => {
        console.log('New message');
      });
      await waitForLastConsoleMessageToHaveContent('New message', devToolsPage);
      assert.strictEqual(await devToolsPage.activeElementAccessibleName(), 'Console prompt');

      await inspectedPage.evaluate(() => {
        for (let i = 0; i < 100; i++) {
          console.log(`Message ${i}`);
        }
      });
      await waitForLastConsoleMessageToHaveContent('Message 99', devToolsPage);
      assert.strictEqual(await devToolsPage.activeElementAccessibleName(), 'Console prompt');

      const consolePrompt = await devToolsPage.activeElement();
      const wrappingBox = await consolePrompt.boundingBox();
      if (!wrappingBox) {
        throw new Error('Can\'t compute bounding box of console prompt.');
      }

      // +20 to move from the top left point so we are definitely scrolling
      // within the container
      await devToolsPage.page.mouse.move(wrappingBox.x + 20, wrappingBox.y + 5);
      await devToolsPage.page.mouse.wheel({deltaY: -500});

      assert.strictEqual(await devToolsPage.activeElementAccessibleName(), 'Console prompt');
    });
  });

  describe('Console log message formatters', () => {
    async function getConsoleMessageTextChunksWithStyle(
        devToolsPage: DevToolsPage, styles: Array<keyof CSSStyleDeclaration> = []): Promise<string[][][]> {
      return await devToolsPage.evaluate((selector, styles) => {
        return [...document.querySelectorAll(selector)].map(message => [...message.childNodes].map(node => {
          // For all nodes, extract text.
          const result = [node.textContent as string];
          // For element nodes, get the requested styles.
          for (const style of styles) {
            result.push(((node as HTMLElement).style?.[style] as string) ?? '');
          }
          return result;
        }));
      }, CONSOLE_ALL_MESSAGES_SELECTOR, styles);
    }

    async function waitForConsoleMessages(count: number, devToolsPage: DevToolsPage): Promise<void> {
      await devToolsPage.waitForFunction(async () => {
        const messages = await getCurrentConsoleMessages(false, undefined, undefined, devToolsPage);
        return messages.length === count ? messages : null;
      });
    }

    it('expand primitive formatters', async ({devToolsPage, inspectedPage}) => {
      await navigateToConsoleTab(devToolsPage);
      await inspectedPage.evaluate(() => {
        console.log('--%s--', 'text');
        console.log('--%s--', '%s%i', 'u', 2);
        console.log('Number %i', 42);
        console.log('Float %f', 1.5);
      });

      await waitForConsoleMessages(4, devToolsPage);
      const texts = await getConsoleMessageTextChunksWithStyle(devToolsPage);
      assert.deepEqual(texts, [[['--text--']], [['--u2--']], [['Number 42']], [['Float 1.5']]]);
    });

    it('expand %c formatter with color style', async ({devToolsPage, inspectedPage}) => {
      await navigateToConsoleTab(devToolsPage);
      await inspectedPage.evaluate(() => console.log('PRE%cRED%cBLUE', 'color:red', 'color:blue'));

      await waitForConsoleMessages(1, devToolsPage);

      // Extract the text and color.
      const textsAndStyles = await getConsoleMessageTextChunksWithStyle(devToolsPage, ['color']);
      assert.deepEqual(textsAndStyles, [[['PRE', ''], ['RED', 'red'], ['BLUE', 'blue']]]);
    });

    it('expand %c formatter with background image in data URL', async ({devToolsPage, inspectedPage}) => {
      await navigateToConsoleTab(devToolsPage);
      await inspectedPage.evaluate(
          () => console.log(
              'PRE%cBG',
              'background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAAAAABzHgM7AAAAF0lEQVR42mM4Awb/wYCBYg6EgghRzAEAWDWBGQVyKPMAAAAASUVORK5CYII=);'));

      await waitForConsoleMessages(1, devToolsPage);

      // Check that the 'BG' text has the background image set.
      const textsAndStyles = await getConsoleMessageTextChunksWithStyle(devToolsPage, ['backgroundImage']);
      assert.lengthOf(textsAndStyles, 1);
      const message = textsAndStyles[0];
      assert.lengthOf(message, 2);
      const textWithBackground = message[1];
      assert.strictEqual(textWithBackground[0], 'BG');
      assert.include(textWithBackground[1], 'data:image/png;base64');
    });

    it('filter out %c formatter if background image is remote URL', async ({devToolsPage, inspectedPage}) => {
      await navigateToConsoleTab(devToolsPage);
      await inspectedPage.evaluate(() => console.log('PRE%cBG', 'background-image: url(http://localhost/image.png)'));

      await waitForConsoleMessages(1, devToolsPage);

      // Check that the 'BG' text has no background image.
      const textsAndStyles = await getConsoleMessageTextChunksWithStyle(devToolsPage, ['backgroundImage']);
      assert.deepEqual(textsAndStyles, [[['PRE', ''], ['BG', '']]]);
    });
  });

  describe('message anchor', () => {
    it('opens the breakpoint edit dialog for logpoint messages', async ({devToolsPage, inspectedPage}) => {
      await openSourceCodeEditorForFile('logpoint.js', 'logpoint.html', devToolsPage, inspectedPage);
      await addLogpointForLine(3, 'x', devToolsPage);
      await inspectedPage.evaluate('triggerLogpoint(42)');

      await navigateToConsoleTab(devToolsPage);
      await waitForConsoleInfoMessageAndClickOnLink(devToolsPage);

      await devToolsPage.waitFor('.sources-edit-breakpoint-dialog');
    });
  });

  describe('for memory objects', () => {
    const MEMORY_ICON_SELECTOR = '[aria-label="Open in Memory inspector panel"]';

    it('shows one memory icon to open memory inspector for ArrayBuffers (description)', async ({devToolsPage}) => {
      await navigateToConsoleTab(devToolsPage);
      await typeIntoConsoleAndWaitForResult('new ArrayBuffer(10)', 1, undefined, devToolsPage);

      // We expect one memory icon directly next to the description.
      let memoryIcons = await devToolsPage.$$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 1);

      // Expand the object, and wait until it has completely expanded and the last property is shown.
      await devToolsPage.click('.console-object');
      await devToolsPage.waitForElementWithTextContent('[[ArrayBufferData]]');

      // We still expect only to see one memory icon.
      memoryIcons = await devToolsPage.$$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 1);
    });

    it('shows two memory icons to open memory inspector for a TypedArray (description, buffer)',
       async ({devToolsPage}) => {
         await navigateToConsoleTab(devToolsPage);
         await typeIntoConsoleAndWaitForResult('new Uint8Array(10)', 1, undefined, devToolsPage);

         // We expect one memory icon directly next to the description.
         let memoryIcons = await devToolsPage.$$(MEMORY_ICON_SELECTOR);
         assert.lengthOf(memoryIcons, 1);

         // Expand the object, and wait until it has completely expanded and the last property is shown.
         await devToolsPage.click('.console-object');
         await devToolsPage.waitForElementWithTextContent('[[Prototype]]');

         // We expect to see in total two memory icons: one for the buffer, one next to the description.
         memoryIcons = await devToolsPage.$$(MEMORY_ICON_SELECTOR);
         assert.lengthOf(memoryIcons, 2);

         // Confirm that the second memory icon is next to the `buffer`.
         const arrayBufferProperty = await devToolsPage.waitFor('.object-value-arraybuffer');
         const arrayBufferMemoryIcon = await devToolsPage.$(MEMORY_ICON_SELECTOR, arrayBufferProperty);
         assert.isOk(arrayBufferMemoryIcon);
       });

    it('shows two memory icons to open memory inspector for a DataView (description, buffer)',
       async ({devToolsPage}) => {
         await navigateToConsoleTab(devToolsPage);
         await typeIntoConsoleAndWaitForResult('new DataView(new Uint8Array(10).buffer)', 1, undefined, devToolsPage);

         // We expect one memory icon directly next to the description.
         let memoryIcons = await devToolsPage.$$(MEMORY_ICON_SELECTOR);
         assert.lengthOf(memoryIcons, 1);

         // Expand the object, and wait until it has completely expanded and the last property is shown.
         await devToolsPage.click('.console-object');
         await devToolsPage.waitForElementWithTextContent('[[Prototype]]');

         // We expect to see in total two memory icons: one for the buffer, one next to the description.
         memoryIcons = await devToolsPage.$$(MEMORY_ICON_SELECTOR);
         assert.lengthOf(memoryIcons, 2);

         // Confirm that the second memory icon is next to the `buffer`.
         const arrayBufferProperty = await devToolsPage.waitFor('.object-value-arraybuffer');
         const arrayBufferMemoryIcon = await devToolsPage.$(MEMORY_ICON_SELECTOR, arrayBufferProperty);
         assert.isOk(arrayBufferMemoryIcon);
       });

    it('shows two memory icons to open memory inspector for WebAssembly memory (description, buffer)',
       async ({devToolsPage}) => {
         await navigateToConsoleTab(devToolsPage);
         await typeIntoConsoleAndWaitForResult('new WebAssembly.Memory({initial: 10})', 1, undefined, devToolsPage);

         // We expect one memory icon directly next to the description.
         let memoryIcons = await devToolsPage.$$(MEMORY_ICON_SELECTOR);
         assert.lengthOf(memoryIcons, 1);

         // Expand the object, and wait until it has completely expanded and the last property is shown.
         await devToolsPage.click('.console-object');
         await devToolsPage.waitForElementWithTextContent('[[Prototype]]');

         // We expect to see in total two memory icons: one for the buffer, one next to the description.
         memoryIcons = await devToolsPage.$$(MEMORY_ICON_SELECTOR);
         assert.lengthOf(memoryIcons, 2);

         // Confirm that the second memory icon is next to the `buffer`.
         const arrayBufferProperty = await devToolsPage.waitFor('.object-value-arraybuffer');
         const arrayBufferMemoryIcon = await devToolsPage.$(MEMORY_ICON_SELECTOR, arrayBufferProperty);
         assert.isOk(arrayBufferMemoryIcon);
       });
  });
});
