// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  getFrameTreeTitles,
  getTrimmedTextContent,
  navigateToApplicationTab,
  navigateToFrame,
  navigateToFrameServiceWorkers,
  navigateToOpenedWindows,
  navigateToWebWorkers,
  unregisterServiceWorker,
} from '../../e2e/helpers/application-helpers.js';
import {setIgnoreListPattern} from '../../e2e/helpers/settings-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

const OPENED_WINDOWS_SELECTOR = '[aria-label="Opened Windows"]';
const EXPAND_STACKTRACE_BUTTON_SELECTOR = '.arrow-icon-button';
const STACKTRACE_ROW_SELECTOR = '.stack-trace-row';
const STACKTRACE_ROW_LINK_SELECTOR = '.stack-trace-row .link';
const APPLICATION_PANEL_SELECTED_SELECTOR = '.tabbed-pane-header-tab.selected[aria-label="Application"]';

const getTrailingURL = (text: string) => {
  const match = text.match(/http.*$/);
  return match ? match[0] : '';
};

const ensureApplicationPanel = async (devToolsPage: DevToolsPage) => {
  if ((await devToolsPage.$$(APPLICATION_PANEL_SELECTED_SELECTOR)).length === 0) {
    await devToolsPage.waitForFunction(async () => {
      await devToolsPage.click('#tab-resources');
      return (await devToolsPage.$$(APPLICATION_PANEL_SELECTED_SELECTOR)).length === 1;
    });
  }
};

declare global {
  interface Window {
    iFrameWindow: Window|null|undefined;
  }
}

const getFieldValuesTextContent = async (devToolsPage: DevToolsPage) => {
  const fieldValues = await getTrimmedTextContent('devtools-report-value', devToolsPage);
  if (fieldValues[0]) {
    // This contains some CSS from the svg icon link being rendered. It's
    // system-specific, so we get rid of it and only look at the (URL) text.
    fieldValues[0] = getTrailingURL(fieldValues[0]);
  }
  if (fieldValues[10]?.includes('accelerometer')) {
    fieldValues[10] = 'accelerometer';
  }
  // Make sure the length is equivalent to the expected value below
  if (fieldValues.length === 11) {
    return fieldValues;
  }
  return undefined;
};

describe('The Application Tab', () => {
  setup({dockingMode: 'undocked', disabledDevToolsExperiments: ['protocol-monitor']});

  it('shows details for a frame when clicked on in the frame tree', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('frame-tree', devToolsPage, inspectedPage);
    await devToolsPage.click('#tab-resources');
    await navigateToFrame('top', devToolsPage);

    const fieldValuesTextContent = await devToolsPage.waitForFunction(() => getFieldValuesTextContent(devToolsPage));
    const expected = [
      `${inspectedPage.getResourcesPath()}/application/frame-tree.html`,
      `https://localhost:${inspectedPage.serverPort}`,
      '<#document>',
      'Yes\xA0Localhost is always a secure context',
      'No',
      'none',
      'unsafe-none',
      'None',
      'unavailable\xA0requires cross-origin isolated context',
      'unavailable\xA0Learn more',
      'accelerometer',
    ];

    assert.deepEqual(fieldValuesTextContent, expected);
  });

  it('shows stack traces for OOPIF', async ({devToolsPage, inspectedPage}) => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    await navigateToApplicationTab('js-oopif', devToolsPage, inspectedPage);
    await devToolsPage.waitForFunction(async () => {
      await navigateToFrame('top', devToolsPage);
      await navigateToFrame('iframe.html', devToolsPage);
      return (await devToolsPage.$$(EXPAND_STACKTRACE_BUTTON_SELECTOR)).length === 1;
    });
    const stackTraceRowsTextContent = await devToolsPage.waitForFunction(async () => {
      await ensureApplicationPanel(devToolsPage);
      await devToolsPage.click(EXPAND_STACKTRACE_BUTTON_SELECTOR);
      const stackTraceRows = await getTrimmedTextContent(STACKTRACE_ROW_SELECTOR, devToolsPage);
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

  it('stack traces for OOPIF with ignore listed frames can be expanded and collapsed',
     async ({devToolsPage, inspectedPage}) => {
       expectError(
           'Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
       await setIgnoreListPattern('js-oopif.js', devToolsPage);
       await navigateToApplicationTab('js-oopif', devToolsPage, inspectedPage);
       await devToolsPage.waitForFunction(async () => {
         await navigateToFrame('top', devToolsPage);
         await navigateToFrame('iframe.html', devToolsPage);
         return (await devToolsPage.$$(EXPAND_STACKTRACE_BUTTON_SELECTOR)).length === 1;
       });
       let stackTraceRowsTextContent = await devToolsPage.waitForFunction(async () => {
         await ensureApplicationPanel(devToolsPage);
         await devToolsPage.click(EXPAND_STACKTRACE_BUTTON_SELECTOR);
         const stackTraceRows = await getTrimmedTextContent(STACKTRACE_ROW_SELECTOR, devToolsPage);
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
       await devToolsPage.click(STACKTRACE_ROW_LINK_SELECTOR);
       stackTraceRowsTextContent = await devToolsPage.waitForFunction(async () => {
         const stackTraceRows = await getTrimmedTextContent(STACKTRACE_ROW_SELECTOR, devToolsPage);
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

       await devToolsPage.click(STACKTRACE_ROW_LINK_SELECTOR);
       stackTraceRowsTextContent = await devToolsPage.waitForFunction(async () => {
         const stackTraceRows = await getTrimmedTextContent(STACKTRACE_ROW_SELECTOR, devToolsPage);
         // Make sure the length is equivalent to the expected value below
         if (stackTraceRows.length === 2) {
           return stackTraceRows;
         }
         return undefined;
       });
       assert.deepEqual(stackTraceRowsTextContent, expectedCollapsed);
     });

  it('shows details for opened windows in the frame tree', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('frame-tree', devToolsPage, inspectedPage);
    await devToolsPage.click('#tab-resources');
    await navigateToFrame('top', devToolsPage);

    await inspectedPage.evaluate(() => {
      window.iFrameWindow = window.open('iframe.html');
    });

    // window.open above would put DevTools in the background stopping updates
    // to the application panel.
    await devToolsPage.bringToFront();

    await navigateToOpenedWindows(devToolsPage);
    await devToolsPage.waitFor(`${OPENED_WINDOWS_SELECTOR} + ol li:first-child`);
    void devToolsPage.pressKey('ArrowDown');

    const fieldValuesTextContent = await devToolsPage.waitForFunction(async () => {
      const fieldValues = await getTrimmedTextContent('.report-field-value', devToolsPage);
      // Make sure the length is equivalent to the expected value below
      if (fieldValues.length === 3 && !fieldValues.includes('')) {
        return fieldValues;
      }
      return undefined;
    });
    const expected = [
      `${inspectedPage.getResourcesPath()}/application/iframe.html`,
      '<#document>',
      'Yes',
    ];
    assert.deepEqual(fieldValuesTextContent, expected);
    await inspectedPage.evaluate(() => {
      window.iFrameWindow?.close();
    });
  });

  it('shows dedicated workers in the frame tree', async ({devToolsPage, inspectedPage}) => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    await navigateToApplicationTab('frame-tree', devToolsPage, inspectedPage);
    await navigateToFrame('top', devToolsPage);
    // DevTools is not ready yet when the worker is being initially attached.
    // We therefore need to reload the page to see the worker in DevTools.
    await inspectedPage.reload();
    await navigateToWebWorkers(devToolsPage);
    void devToolsPage.pressKey('ArrowDown');

    const fieldValuesTextContent = await devToolsPage.waitForFunction(async () => {
      const fieldValues = await getTrimmedTextContent('.report-field-value', devToolsPage);
      // Make sure the length is equivalent to the expected value below
      if (fieldValues.length === 3 && fieldValues.every(field => field.trim() !== '')) {
        return fieldValues;
      }
      return undefined;
    });
    const expected = [
      `${inspectedPage.getResourcesPath()}/application/dedicated-worker.js`,
      'Web Worker',
      'None',
    ];
    assert.deepEqual(fieldValuesTextContent, expected);
  });

  it('shows service workers in the frame tree', async ({devToolsPage, inspectedPage}) => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    await navigateToApplicationTab('service-worker-network', devToolsPage, inspectedPage);
    await navigateToFrameServiceWorkers('top', devToolsPage);
    void devToolsPage.pressKey('ArrowDown');

    const fieldValuesTextContent = await devToolsPage.waitForFunction(async () => {
      const fieldValues = await getTrimmedTextContent('.report-field-value', devToolsPage);
      // Make sure the length is equivalent to the expected value below
      if (fieldValues.length === 3 && fieldValues.every(field => field.trim() !== '')) {
        return fieldValues;
      }
      return undefined;
    });
    const expected = [
      `${inspectedPage.getResourcesPath()}/application/service-worker.js`,
      'Service Worker',
      'None',
    ];
    assert.deepEqual(fieldValuesTextContent, expected);

    // Unregister service worker to prevent leftovers from causing test errors.
    void devToolsPage.pressKey('ArrowUp');
    void devToolsPage.pressKey('ArrowLeft');
    await unregisterServiceWorker(devToolsPage);
  });

  it('can handle when JS writes to frame', async ({devToolsPage, inspectedPage}) => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    await inspectedPage.goToResource('application/main-frame.html');
    await devToolsPage.click('#tab-resources');
    await navigateToFrame('top', devToolsPage);
    await navigateToFrame('frameId (iframe.html)', devToolsPage);

    // check iframe's URL after pageload
    const fieldValuesTextContent = await devToolsPage.waitForFunction(() => getFieldValuesTextContent(devToolsPage));
    const expected = [
      `${inspectedPage.getResourcesPath()}/application/iframe.html`,
      `https://localhost:${inspectedPage.serverPort}`,
      '<iframe>',
      'Yes\xA0Localhost is always a secure context',
      'No',
      'none',
      'unsafe-none',
      'None',
      'unavailable\xA0requires cross-origin isolated context',
      'unavailable\xA0Learn more',
      'accelerometer',
    ];
    assert.deepEqual(fieldValuesTextContent, expected);

    assert.includeMembers(
        ['top', 'frameId (iframe.html)', 'iframe.html', 'Other', 'favicon.ico', 'main-frame.html'],
        await getFrameTreeTitles(devToolsPage));

    // write to the iframe using 'document.write()'
    await inspectedPage.evaluate(() => {
      const frame = document.getElementById('frameId') as HTMLIFrameElement;
      const doc = frame.contentDocument;
      if (doc) {
        doc.open();
        doc.write('<h1>Hello world !</h1>');
        doc.close();
      }
    });

    // check that iframe's URL has changed
    await navigateToFrame('frameId (main-frame.html)', devToolsPage);
    const fieldValuesTextContent2 = await devToolsPage.waitForFunction(() => getFieldValuesTextContent(devToolsPage));
    const expected2 = [
      `${inspectedPage.getResourcesPath()}/application/main-frame.html`,
      `https://localhost:${inspectedPage.serverPort}`,
      '<iframe>',
      'Yes\xA0Localhost is always a secure context',
      'No',
      'none',
      'unsafe-none',
      'None',
      'unavailable\xA0requires cross-origin isolated context',
      'unavailable\xA0Learn more',
      'accelerometer',
    ];
    assert.deepEqual(fieldValuesTextContent2, expected2);

    assert.includeMembers(
        ['top', 'frameId (main-frame.html)', 'No document detected', 'Other', 'favicon.ico', 'main-frame.html'],
        await getFrameTreeTitles(devToolsPage));
  });
});
