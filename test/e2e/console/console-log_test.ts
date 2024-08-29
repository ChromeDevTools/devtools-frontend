// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  $,
  $$,
  activeElement,
  activeElementAccessibleName,
  activeElementTextContent,
  assertNotNullOrUndefined,
  click,
  getBrowserAndPages,
  replacePuppeteerUrl,
  tabBackward,
  tabForward,
  waitFor,
  waitForElementWithTextContent,
  waitForFunction,
} from '../../shared/helper.js';

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
} from '../helpers/console-helpers.js';
import {
  addLogpointForLine,
  openSourceCodeEditorForFile,
} from '../helpers/sources-helpers.js';

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
    it(test.description, async () => {
      const {target} = getBrowserAndPages();
      await navigateToConsoleTab();
      await showVerboseMessages();
      await target.evaluate(test.evaluate);
      const actualMessages = await waitForFunction(async () => {
        const messages = await getStructuredConsoleMessages();
        return messages.length === test.expectedMessages.length ? messages : undefined;
      });
      for (const message of actualMessages) {
        if (message.source && message.source.includes('pptr:')) {
          message.source = replacePuppeteerUrl(message.source);
        }
        if (message.stackPreview && message.stackPreview.includes('pptr:')) {
          message.stackPreview = replacePuppeteerUrl(message.stackPreview);
        }
      }
      assert.deepEqual(actualMessages, test.expectedMessages, 'Console message does not match the expected message');
    });
  }

  describe('keyboard navigation', () => {
    it('can navigate between individual messages', async () => {
      const {frontend} = getBrowserAndPages();
      await getConsoleMessages('focus-interaction');
      await focusConsolePrompt();

      await tabBackward();
      assert.strictEqual(await activeElementTextContent(), 'focus-interaction.html:9');

      await frontend.keyboard.press('ArrowUp');
      assert.strictEqual(await activeElementTextContent(), 'focus-interaction.html:9 Third message');

      await frontend.keyboard.press('ArrowUp');
      assert.strictEqual(await activeElementTextContent(), 'focus-interaction.html:8');

      await frontend.keyboard.press('ArrowDown');
      assert.strictEqual(await activeElementTextContent(), 'focus-interaction.html:9 Third message');

      await tabBackward();  // Focus should now be on the console settings, e.g. out of the list of console messages
      assert.strictEqual(await activeElementAccessibleName(), 'Console settings');

      await tabForward();  // Focus is now back to the list, selecting the last message source URL
      assert.strictEqual(await activeElementTextContent(), 'focus-interaction.html:9');

      await tabForward();
      assert.strictEqual(await activeElementAccessibleName(), 'Console prompt');
    });

    it('should not lose focus on prompt when logging and scrolling', async () => {
      const {target, frontend} = getBrowserAndPages();

      await getConsoleMessages('focus-interaction');
      await focusConsolePrompt();

      await target.evaluate(() => {
        console.log('New message');
      });
      await waitForLastConsoleMessageToHaveContent('New message');
      assert.strictEqual(await activeElementAccessibleName(), 'Console prompt');

      await target.evaluate(() => {
        for (let i = 0; i < 100; i++) {
          console.log(`Message ${i}`);
        }
      });
      await waitForLastConsoleMessageToHaveContent('Message 99');
      assert.strictEqual(await activeElementAccessibleName(), 'Console prompt');

      const consolePrompt = await activeElement();
      const wrappingBox = await consolePrompt.boundingBox();
      if (!wrappingBox) {
        throw new Error('Can\'t compute bounding box of console prompt.');
      }

      // +20 to move from the top left point so we are definitely scrolling
      // within the container
      await frontend.mouse.move(wrappingBox.x + 20, wrappingBox.y + 5);
      await frontend.mouse.wheel({deltaY: -500});

      assert.strictEqual(await activeElementAccessibleName(), 'Console prompt');
    });
  });

  describe('Console log message formatters', () => {
    async function getConsoleMessageTextChunksWithStyle(
        frontend: puppeteer.Page, styles: (keyof CSSStyleDeclaration)[] = []): Promise<string[][][]> {
      return await frontend.evaluate((selector, styles) => {
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

    async function waitForConsoleMessages(count: number): Promise<void> {
      await waitForFunction(async () => {
        const messages = await getCurrentConsoleMessages();
        return messages.length === count ? messages : null;
      });
    }

    it('expand primitive formatters', async () => {
      const {frontend, target} = getBrowserAndPages();
      await navigateToConsoleTab();
      await target.evaluate(() => {
        console.log('--%s--', 'text');
        console.log('--%s--', '%s%i', 'u', 2);
        console.log('Number %i', 42);
        console.log('Float %f', 1.5);
      });

      await waitForConsoleMessages(4);
      const texts = await getConsoleMessageTextChunksWithStyle(frontend);
      assert.deepEqual(texts, [[['--text--']], [['--u2--']], [['Number 42']], [['Float 1.5']]]);
    });

    it('expand %c formatter with color style', async () => {
      const {frontend, target} = getBrowserAndPages();
      await navigateToConsoleTab();
      await target.evaluate(() => console.log('PRE%cRED%cBLUE', 'color:red', 'color:blue'));

      await waitForConsoleMessages(1);

      // Extract the text and color.
      const textsAndStyles = await getConsoleMessageTextChunksWithStyle(frontend, ['color']);
      assert.deepEqual(textsAndStyles, [[['PRE', ''], ['RED', 'red'], ['BLUE', 'blue']]]);
    });

    it('expand %c formatter with background image in data URL', async () => {
      const {frontend, target} = getBrowserAndPages();
      await navigateToConsoleTab();
      await target.evaluate(
          () => console.log(
              'PRE%cBG',
              'background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAAAAABzHgM7AAAAF0lEQVR42mM4Awb/wYCBYg6EgghRzAEAWDWBGQVyKPMAAAAASUVORK5CYII=);'));

      await waitForConsoleMessages(1);

      // Check that the 'BG' text has the background image set.
      const textsAndStyles = await getConsoleMessageTextChunksWithStyle(frontend, ['backgroundImage']);
      assert.strictEqual(textsAndStyles.length, 1);
      const message = textsAndStyles[0];
      assert.strictEqual(message.length, 2);
      const textWithBackground = message[1];
      assert.strictEqual(textWithBackground[0], 'BG');
      assert.include(textWithBackground[1], 'data:image/png;base64');
    });

    it('filter out %c formatter if background image is remote URL', async () => {
      const {frontend, target} = getBrowserAndPages();
      await navigateToConsoleTab();
      await target.evaluate(() => console.log('PRE%cBG', 'background-image: url(http://localhost/image.png)'));

      await waitForConsoleMessages(1);

      // Check that the 'BG' text has no bakcground image.
      const textsAndStyles = await getConsoleMessageTextChunksWithStyle(frontend, ['backgroundImage']);
      assert.deepEqual(textsAndStyles, [[['PRE', ''], ['BG', '']]]);
    });
  });

  describe('message anchor', () => {
    it('opens the breakpoint edit dialog for logpoint messages', async () => {
      const {target} = getBrowserAndPages();
      await openSourceCodeEditorForFile('logpoint.js', 'logpoint.html');
      await addLogpointForLine(3, 'x');
      await target.evaluate('triggerLogpoint(42)');

      await navigateToConsoleTab();
      await waitForConsoleInfoMessageAndClickOnLink();

      await waitFor('.sources-edit-breakpoint-dialog');
    });
  });

  describe('for memory objects', () => {
    const MEMORY_ICON_SELECTOR = '[aria-label="Reveal in Memory inspector panel"]';

    it('shows one memory icon to open memory inspector for ArrayBuffers (description)', async () => {
      const {frontend} = getBrowserAndPages();
      await navigateToConsoleTab();
      await typeIntoConsoleAndWaitForResult(frontend, 'new ArrayBuffer(10)');

      // We expect one memory icon directly next to the description.
      let memoryIcons = await $$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 1);

      // Expand the object, and wait until it has completely expanded and the last property is shown.
      await click('.console-object');
      await waitForElementWithTextContent('[[ArrayBufferData]]');

      // We still expect only to see one memory icon.
      memoryIcons = await $$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 1);
    });

    it('shows two memory icons to open memory inspector for a TypedArray (description, buffer)', async () => {
      const {frontend} = getBrowserAndPages();
      await navigateToConsoleTab();
      await typeIntoConsoleAndWaitForResult(frontend, 'new Uint8Array(10)');

      // We expect one memory icon directly next to the description.
      let memoryIcons = await $$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 1);

      // Expand the object, and wait until it has completely expanded and the last property is shown.
      await click('.console-object');
      await waitForElementWithTextContent('[[Prototype]]');

      // We expect to see in total two memory icons: one for the buffer, one next to the description.
      memoryIcons = await $$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 2);

      // Confirm that the second memory icon is next to the `buffer`.
      const arrayBufferProperty = await waitFor('.object-value-arraybuffer');
      const arrayBufferMemoryIcon = await $(MEMORY_ICON_SELECTOR, arrayBufferProperty);
      assertNotNullOrUndefined(arrayBufferMemoryIcon);
    });

    it('shows two memory icons to open memory inspector for a DataView (description, buffer)', async () => {
      const {frontend} = getBrowserAndPages();
      await navigateToConsoleTab();
      await typeIntoConsoleAndWaitForResult(frontend, 'new DataView(new Uint8Array(10).buffer)');

      // We expect one memory icon directly next to the description.
      let memoryIcons = await $$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 1);

      // Expand the object, and wait until it has completely expanded and the last property is shown.
      await click('.console-object');
      await waitForElementWithTextContent('[[Prototype]]');

      // We expect to see in total two memory icons: one for the buffer, one next to the description.
      memoryIcons = await $$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 2);

      // Confirm that the second memory icon is next to the `buffer`.
      const arrayBufferProperty = await waitFor('.object-value-arraybuffer');
      const arrayBufferMemoryIcon = await $(MEMORY_ICON_SELECTOR, arrayBufferProperty);
      assertNotNullOrUndefined(arrayBufferMemoryIcon);
    });

    it('shows two memory icons to open memory inspector for WebAssembly memory (description, buffer)', async () => {
      const {frontend} = getBrowserAndPages();
      await navigateToConsoleTab();
      await typeIntoConsoleAndWaitForResult(frontend, 'new WebAssembly.Memory({initial: 10})');

      // We expect one memory icon directly next to the description.
      let memoryIcons = await $$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 1);

      // Expand the object, and wait until it has completely expanded and the last property is shown.
      await click('.console-object');
      await waitForElementWithTextContent('[[Prototype]]');

      // We expect to see in total two memory icons: one for the buffer, one next to the description.
      memoryIcons = await $$(MEMORY_ICON_SELECTOR);
      assert.lengthOf(memoryIcons, 2);

      // Confirm that the second memory icon is next to the `buffer`.
      const arrayBufferProperty = await waitFor('.object-value-arraybuffer');
      const arrayBufferMemoryIcon = await $(MEMORY_ICON_SELECTOR, arrayBufferProperty);
      assertNotNullOrUndefined(arrayBufferMemoryIcon);
    });
  });
});
