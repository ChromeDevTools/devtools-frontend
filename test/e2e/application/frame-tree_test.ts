// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, getTestServerPort, goToResource, pressKey, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {doubleClickSourceTreeItem, getFrameTreeTitles, getReportValues, navigateToApplicationTab} from '../helpers/application-helpers.js';

const TOP_FRAME_SELECTOR = '[aria-label="top"]';
const WEB_WORKERS_SELECTOR = '[aria-label="Web Workers"]';
const SERVICE_WORKERS_SELECTOR = '[aria-label="top"] ~ ol [aria-label="Service Workers"]';
const OPENED_WINDOWS_SELECTOR = '[aria-label="Opened Windows"]';
const IFRAME_SELECTOR = '[aria-label="frameId (iframe.html)"]';
const MAIN_FRAME_SELECTOR = '[aria-label="frameId (main-frame.html)"]';

describe('The Application Tab', async () => {
  afterEach(async () => {
    const {target} = getBrowserAndPages();
    await target.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  });

  it('shows details for a frame when clicked on in the frame tree', async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'frame-tree');
    await click('#tab-resources');
    await doubleClickSourceTreeItem(TOP_FRAME_SELECTOR);

    await waitForFunction(async () => {
      const fieldValues = await getReportValues();
      const expected = [
        `https://localhost:${getTestServerPort()}/test/e2e/resources/application/frame-tree.html`,
        '',
        `https://localhost:${getTestServerPort()}`,
        '<#document>',
        '',
        'YesLocalhost is always a secure context',
        'No',
        'None',
        'UnsafeNone',
        'available, transferable⚠️ will require cross-origin isolated context in the future',
        'unavailable Learn more',
      ];
      return JSON.stringify(fieldValues) === JSON.stringify(expected);
    });
  });

  it('shows details for opened windows in the frame tree', async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'frame-tree');
    await click('#tab-resources');
    await doubleClickSourceTreeItem(TOP_FRAME_SELECTOR);

    await target.evaluate(() => {
      window.open('iframe.html');
    });

    await doubleClickSourceTreeItem(OPENED_WINDOWS_SELECTOR);
    await waitFor(`${OPENED_WINDOWS_SELECTOR} + ol li:first-child`);
    pressKey('ArrowDown');

    await waitForFunction(async () => {
      const fieldValues = await getReportValues();
      const expected = [
        `https://localhost:${getTestServerPort()}/test/e2e/resources/application/iframe.html`,
        '<#document>',
        'Yes',
      ];
      return JSON.stringify(fieldValues) === JSON.stringify(expected);
    });
  });

  it('shows dedicated workers in the frame tree', async () => {
    const {target} = getBrowserAndPages();
    await goToResource('application/frame-tree.html');
    await click('#tab-resources');
    await doubleClickSourceTreeItem(TOP_FRAME_SELECTOR);
    // DevTools is not ready yet when the worker is being initially attached.
    // We therefore need to reload the page to see the worker in DevTools.
    await target.reload();
    await doubleClickSourceTreeItem(WEB_WORKERS_SELECTOR);
    await waitFor(`${WEB_WORKERS_SELECTOR} + ol li:first-child`);
    pressKey('ArrowDown');

    await waitForFunction(async () => {
      const fieldValues = await getReportValues();
      const expected = [
        `https://localhost:${getTestServerPort()}/test/e2e/resources/application/dedicated-worker.js`,
        'Web Worker',
        'None',
      ];
      return JSON.stringify(fieldValues) === JSON.stringify(expected);
    });
  });

  it('shows service workers in the frame tree', async () => {
    await goToResource('application/service-worker-network.html');
    await click('#tab-resources');
    await doubleClickSourceTreeItem(TOP_FRAME_SELECTOR);
    await doubleClickSourceTreeItem(SERVICE_WORKERS_SELECTOR);
    await waitFor(`${SERVICE_WORKERS_SELECTOR} + ol li:first-child`);
    pressKey('ArrowDown');

    await waitForFunction(async () => {
      const fieldValues = await getReportValues();
      const expected = [
        `https://localhost:${getTestServerPort()}/test/e2e/resources/application/service-worker.js`,
        'Service Worker',
        'None',
      ];
      return JSON.stringify(fieldValues) === JSON.stringify(expected);
    });
  });

  it('can handle when JS writes to frame', async () => {
    const {target} = getBrowserAndPages();
    await goToResource('application/main-frame.html');
    await click('#tab-resources');
    await doubleClickSourceTreeItem(TOP_FRAME_SELECTOR);
    await doubleClickSourceTreeItem(IFRAME_SELECTOR);

    // check iframe's URL after pageload
    await waitForFunction(async () => {
      const fieldValues = await getReportValues();
      const expected = [
        `https://localhost:${getTestServerPort()}/test/e2e/resources/application/iframe.html`,
        '',
        `https://localhost:${getTestServerPort()}`,
        '<iframe>',
        '',
        'YesLocalhost is always a secure context',
        'No',
        'None',
        'UnsafeNone',
        'available, transferable⚠️ will require cross-origin isolated context in the future',
        'unavailable Learn more',
      ];
      return JSON.stringify(fieldValues) === JSON.stringify(expected);
    });

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
    await doubleClickSourceTreeItem(MAIN_FRAME_SELECTOR);
    await waitForFunction(async () => {
      const fieldValues = await getReportValues();
      const expected = [
        `https://localhost:${getTestServerPort()}/test/e2e/resources/application/main-frame.html`,
        '',
        `https://localhost:${getTestServerPort()}`,
        '<iframe>',
        '',
        'YesLocalhost is always a secure context',
        'No',
        'None',
        'UnsafeNone',
        'available, transferable⚠️ will require cross-origin isolated context in the future',
        'unavailable Learn more',
      ];
      return JSON.stringify(fieldValues) === JSON.stringify(expected);
    });

    assert.deepEqual(
        await getFrameTreeTitles(), ['top', 'frameId (main-frame.html)', 'Document not available', 'main-frame.html']);
  });
});
