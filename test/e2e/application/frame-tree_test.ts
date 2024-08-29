// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  $$,
  click,
  getBrowserAndPages,
  getTestServerPort,
  goToResource,
  pressKey,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';

import {
  getFrameTreeTitles,
  getTrimmedTextContent,
  navigateToApplicationTab,
  navigateToFrame,
  navigateToFrameServiceWorkers,
  navigateToOpenedWindows,
  navigateToWebWorkers,
  unregisterServiceWorker,
} from '../helpers/application-helpers.js';
import {setIgnoreListPattern} from '../helpers/settings-helpers.js';

const OPENED_WINDOWS_SELECTOR = '[aria-label="Opened Windows"]';
const EXPAND_STACKTRACE_BUTTON_SELECTOR = '.arrow-icon-button';
const STACKTRACE_ROW_SELECTOR = '.stack-trace-row';
const STACKTRACE_ROW_LINK_SELECTOR = '.stack-trace-row .link';
const APPLICATION_PANEL_SELECTED_SELECTOR = '.tabbed-pane-header-tab.selected[aria-label="Application"]';

const getTrailingURL = (text: string) => {
  const match = text.match(/http.*$/);
  return match ? match[0] : '';
};

const ensureApplicationPanel = async () => {
  if ((await $$(APPLICATION_PANEL_SELECTED_SELECTOR)).length === 0) {
    await waitForFunction(async () => {
      await click('#tab-resources');
      return (await $$(APPLICATION_PANEL_SELECTED_SELECTOR)).length === 1;
    });
  }
};

declare global {
  interface Window {
    iFrameWindow: Window|null|undefined;
  }
}

const getFieldValuesTextContent = async () => {
  const fieldValues = await getTrimmedTextContent('devtools-report-value');
  if (fieldValues[0]) {
    // This contains some CSS from the svg icon link being rendered. It's
    // system-specific, so we get rid of it and only look at the (URL) text.
    fieldValues[0] = getTrailingURL(fieldValues[0]);
  }
  if (fieldValues[10] && fieldValues[10].includes('accelerometer')) {
    fieldValues[10] = 'accelerometer';
  }
  // Make sure the length is equivalent to the expected value below
  if (fieldValues.length === 11) {
    return fieldValues;
  }
  return undefined;
};

describe('The Application Tab', () => {
  // Update and reactivate when the whole FrameDetailsView is a custom component
  it.skip('[crbug.com/1519420]: shows details for a frame when clicked on in the frame tree', async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'frame-tree');
    await click('#tab-resources');
    await navigateToFrame('top');

    const fieldValuesTextContent = await waitForFunction(getFieldValuesTextContent);
    const expected = [
      `https://localhost:${getTestServerPort()}/test/e2e/resources/application/frame-tree.html`,
      `https://localhost:${getTestServerPort()}`,
      '<#document>',
      'Yes\xA0Localhost is always a secure context',
      'No',
      'None',
      'UnsafeNone',
      'None',
      'unavailable\xA0requires cross-origin isolated context',
      'unavailable\xA0Learn more',
      'accelerometer',
    ];

    assert.deepEqual(fieldValuesTextContent, expected);
  });

  it('shows stack traces for OOPIF', async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'js-oopif');
    await waitForFunction(async () => {
      await navigateToFrame('top');
      await navigateToFrame('iframe.html');
      return (await $$(EXPAND_STACKTRACE_BUTTON_SELECTOR)).length === 1;
    });
    const stackTraceRowsTextContent = await waitForFunction(async () => {
      await ensureApplicationPanel();
      await click(EXPAND_STACKTRACE_BUTTON_SELECTOR);
      const stackTraceRows = await getTrimmedTextContent(STACKTRACE_ROW_SELECTOR);
      // Make sure the length is equivalent to the expected value below
      if (stackTraceRows.length === 3) {
        return stackTraceRows;
      }
      return undefined;
    });
    const expected = [
      'second\xA0@\xA0js-oopif.html:13',
      'first\xA0@\xA0js-oopif.js:3',
      '(anonymous)\xA0@\xA0js-oopif.js:6',
    ];
    assert.deepEqual(stackTraceRowsTextContent, expected);
  });

  it('stack traces for OOPIF with ignore listed frames can be expanded and collapsed', async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    await setIgnoreListPattern('js-oopif.js');
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'js-oopif');
    await waitForFunction(async () => {
      await navigateToFrame('top');
      await navigateToFrame('iframe.html');
      return (await $$(EXPAND_STACKTRACE_BUTTON_SELECTOR)).length === 1;
    });
    let stackTraceRowsTextContent = await waitForFunction(async () => {
      await ensureApplicationPanel();
      await click(EXPAND_STACKTRACE_BUTTON_SELECTOR);
      const stackTraceRows = await getTrimmedTextContent(STACKTRACE_ROW_SELECTOR);
      // Make sure the length is equivalent to the expected value below
      if (stackTraceRows.length === 2) {
        return stackTraceRows;
      }
      return undefined;
    });
    const expectedCollapsed = [
      'second\xA0@\xA0js-oopif.html:13',
      'Show 2 more frames',
    ];
    assert.deepEqual(stackTraceRowsTextContent, expectedCollapsed);

    // Expand all frames
    await click(STACKTRACE_ROW_LINK_SELECTOR);
    stackTraceRowsTextContent = await waitForFunction(async () => {
      const stackTraceRows = await getTrimmedTextContent(STACKTRACE_ROW_SELECTOR);
      // Make sure the length is equivalent to the expected value below
      if (stackTraceRows.length === 4) {
        return stackTraceRows;
      }
      return undefined;
    });

    const expectedFull = [
      'second\xA0@\xA0js-oopif.html:13',
      'first\xA0@\xA0js-oopif.js:3',
      '(anonymous)\xA0@\xA0js-oopif.js:6',
      'Show less',
    ];
    assert.deepEqual(stackTraceRowsTextContent, expectedFull);

    await click(STACKTRACE_ROW_LINK_SELECTOR);
    stackTraceRowsTextContent = await waitForFunction(async () => {
      const stackTraceRows = await getTrimmedTextContent(STACKTRACE_ROW_SELECTOR);
      // Make sure the length is equivalent to the expected value below
      if (stackTraceRows.length === 2) {
        return stackTraceRows;
      }
      return undefined;
    });
    assert.deepEqual(stackTraceRowsTextContent, expectedCollapsed);
  });

  describe('', () => {
    after(async () => {
      const {target} = getBrowserAndPages();
      await target.evaluate(() => {
        window.iFrameWindow?.close();
      });
    });

    it('shows details for opened windows in the frame tree', async () => {
      const {target, frontend} = getBrowserAndPages();
      await navigateToApplicationTab(target, 'frame-tree');
      await click('#tab-resources');
      await navigateToFrame('top');

      await target.evaluate(() => {
        window.iFrameWindow = window.open('iframe.html');
      });

      // window.open above would put DevTools in the background stopping updates
      // to the application panel.
      await frontend.bringToFront();

      await navigateToOpenedWindows();
      await waitFor(`${OPENED_WINDOWS_SELECTOR} + ol li:first-child`);
      void pressKey('ArrowDown');

      const fieldValuesTextContent = await waitForFunction(async () => {
        const fieldValues = await getTrimmedTextContent('.report-field-value');
        // Make sure the length is equivalent to the expected value below
        if (fieldValues.length === 3 && !fieldValues.includes('')) {
          return fieldValues;
        }
        return undefined;
      });
      const expected = [
        `https://localhost:${getTestServerPort()}/test/e2e/resources/application/iframe.html`,
        '<#document>',
        'Yes',
      ];
      assert.deepEqual(fieldValuesTextContent, expected);
    });
  });

  it('shows dedicated workers in the frame tree', async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'frame-tree');
    await navigateToFrame('top');
    // DevTools is not ready yet when the worker is being initially attached.
    // We therefore need to reload the page to see the worker in DevTools.
    await target.reload();
    await navigateToWebWorkers();
    void pressKey('ArrowDown');

    const fieldValuesTextContent = await waitForFunction(async () => {
      const fieldValues = await getTrimmedTextContent('.report-field-value');
      // Make sure the length is equivalent to the expected value below
      if (fieldValues.length === 3 && fieldValues.every(field => field.trim() !== '')) {
        return fieldValues;
      }
      return undefined;
    });
    const expected = [
      `https://localhost:${getTestServerPort()}/test/e2e/resources/application/dedicated-worker.js`,
      'Web Worker',
      'None',
    ];
    assert.deepEqual(fieldValuesTextContent, expected);
  });

  it('shows service workers in the frame tree', async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'service-worker-network');
    await navigateToFrameServiceWorkers('top');
    void pressKey('ArrowDown');

    const fieldValuesTextContent = await waitForFunction(async () => {
      const fieldValues = await getTrimmedTextContent('.report-field-value');
      // Make sure the length is equivalent to the expected value below
      if (fieldValues.length === 3 && fieldValues.every(field => field.trim() !== '')) {
        return fieldValues;
      }
      return undefined;
    });
    const expected = [
      `https://localhost:${getTestServerPort()}/test/e2e/resources/application/service-worker.js`,
      'Service Worker',
      'None',
    ];
    assert.deepEqual(fieldValuesTextContent, expected);

    // Unregister service worker to prevent leftovers from causing test errors.
    void pressKey('ArrowUp');
    void pressKey('ArrowLeft');
    await unregisterServiceWorker();
  });

  // Update and reactivate when the whole FrameDetailsView is a custom component
  it.skip('[crbug.com/1519420]: can handle when JS writes to frame', async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    const {target} = getBrowserAndPages();
    await goToResource('application/main-frame.html');
    await click('#tab-resources');
    await navigateToFrame('top');
    await navigateToFrame('frameId (iframe.html)');

    // check iframe's URL after pageload
    const fieldValuesTextContent = await waitForFunction(getFieldValuesTextContent);
    const expected = [
      `https://localhost:${getTestServerPort()}/test/e2e/resources/application/iframe.html`,
      `https://localhost:${getTestServerPort()}`,
      '<iframe>',
      'Yes\xA0Localhost is always a secure context',
      'No',
      'None',
      'UnsafeNone',
      'None',
      'unavailable\xA0requires cross-origin isolated context',
      'unavailable\xA0Learn more',
      'accelerometer',
    ];
    assert.deepEqual(fieldValuesTextContent, expected);

    assert.deepEqual(await getFrameTreeTitles(), ['top', 'frameId (iframe.html)', 'iframe.html', 'main-frame.html']);

    // write to the iframe using 'document.write()'
    await target.evaluate(() => {
      const frame = document.getElementById('frameId') as HTMLIFrameElement;
      const doc = frame.contentDocument;
      if (doc) {
        doc.open();
        doc.write('<h1>Hello world !</h1>');
        doc.close();
      }
    });

    // check that iframe's URL has changed
    await navigateToFrame('frameId (main-frame.html)');
    const fieldValuesTextContent2 = await waitForFunction(getFieldValuesTextContent);
    const expected2 = [
      `https://localhost:${getTestServerPort()}/test/e2e/resources/application/main-frame.html`,
      `https://localhost:${getTestServerPort()}`,
      '<iframe>',
      'Yes\xA0Localhost is always a secure context',
      'No',
      'None',
      'UnsafeNone',
      'None',
      'unavailable\xA0requires cross-origin isolated context',
      'unavailable\xA0Learn more',
      'accelerometer',
    ];
    assert.deepEqual(fieldValuesTextContent2, expected2);

    assert.deepEqual(
        await getFrameTreeTitles(), ['top', 'frameId (main-frame.html)', 'Document not available', 'main-frame.html']);
  });
});
