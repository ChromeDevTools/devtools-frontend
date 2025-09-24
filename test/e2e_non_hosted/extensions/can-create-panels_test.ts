// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/// <reference types="../../../extension-api/ExtensionAPI.d.ts" />

import {assert} from 'chai';
import {
  describe,
  it,
} from 'mocha';
import type * as puppeteer from 'puppeteer-core';

import {expectError} from '../../conductor/events.js';
import {
  loadExtension,
} from '../../e2e/helpers/extension-helpers.js';

async function createPanel(extension: puppeteer.Frame, resourcePath = '') {
  return await extension.evaluate(
      (path: string) => new Promise<string>(
          r => window.chrome.devtools.panels.create(
              'extension-tab-title', /* iconPath=*/ '', /* resourcePath=*/ path,
              (...args: unknown[]) => r(JSON.stringify(args)))),
      resourcePath);
}

describe('The Extension API', () => {
  it('can create panels with callbacks', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);

    const callbackArgs = await createPanel(extension);

    assert.deepEqual(callbackArgs, '[{"onShown":{},"onHidden":{},"onSearch":{}}]');
  });

  it('rejects absolute resource URLs', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);

    const error = expectError(
        'Extension server error: Invalid argument page: Resources paths cannot point to non-extension resources');
    // absolute URLs should report an error and not create a panel view
    await createPanel(extension, 'http://example.com');
    await devToolsPage.waitForFunction(async () => error.caught);
    await devToolsPage.waitForAriaNone('extension-tab-title');
  });

  it('handles absolute resource paths correctly', async ({devToolsPage, inspectedPage}) => {
    expectError('Unknown VE context: https://localhostextension-tab-title');
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);

    await createPanel(extension, '/blank.html');
    await devToolsPage.clickMoreTabsButton();
    const header = await devToolsPage.waitForAria('extension-tab-title');
    await header.click();
    const panel = await devToolsPage.waitForAria('extension-tab-title panel');
    const page = await devToolsPage.waitFor('iframe', panel);
    const target = await page.evaluate(e => e.src);
    assert.strictEqual(target, `${inspectedPage.domain()}/blank.html`);
  });

  it('handles relative resource paths correctly', async ({devToolsPage, inspectedPage}) => {
    expectError('Unknown VE context: https://localhostextension-tab-title');
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);
    await createPanel(extension, 'blank.html');
    await devToolsPage.clickMoreTabsButton();
    const header = await devToolsPage.waitForAria('extension-tab-title');
    await header.click();
    const panel = await devToolsPage.waitForAria('extension-tab-title panel');
    const page = await devToolsPage.waitFor('iframe', panel);
    const target = await page.evaluate(e => e.src);
    assert.strictEqual(target, `${inspectedPage.domain()}/blank.html`);
  });
});
