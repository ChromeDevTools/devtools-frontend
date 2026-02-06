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

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import {expectError} from '../../conductor/events.js';
import {
  loadExtension,
} from '../helpers/extension-helpers.js';

declare global {
  interface Window {
    searchEvents: Array<{action: string, queryString?: string}>;
  }
}

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
    expectError('Unknown VE context: \'https://localhostextension-tab-title\'');
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
    expectError('Unknown VE context: \'https://localhostextension-tab-title\'');
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

  it('can handle search events', async ({devToolsPage, inspectedPage}) => {
    expectError('Unknown VE context: \'https://localhostSearchPanel\'');
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);

    const page = new URL(`${inspectedPage.getResourcesPath()}/extensions/test_panel.html`).pathname;

    await extension.evaluate(async (page: string) => {
      window.searchEvents = [];
      const panel = await new Promise<Chrome.DevTools.ExtensionPanel>(
          r => window.chrome.devtools.panels.create('SearchPanel', '', page, r));
      panel.onSearch.addListener((action, queryString) => window.searchEvents.push({action, queryString}));
    }, page);

    await devToolsPage.clickMoreTabsButton();
    await devToolsPage.waitForAria('SearchPanel');
    await devToolsPage.click('[aria-label=SearchPanel]');

    const panel = await devToolsPage.waitForAria('SearchPanel panel');
    await devToolsPage.waitFor('iframe', panel);

    // Trigger search
    await devToolsPage.pressKey('F', {control: true});
    const search = await devToolsPage.waitFor('#search-input-field');
    await search.type('abc');

    // Wait for performSearch
    await devToolsPage.waitForFunction(() => {
      return extension.evaluate(
          () => window.searchEvents.some(e => e.action === 'performSearch' && e.queryString === 'abc'));
    });

    // Press Enter to go to next result
    await devToolsPage.pressKey('Enter');

    // Wait for nextSearchResult
    await devToolsPage.waitForFunction(() => {
      return extension.evaluate(() => window.searchEvents.some(e => e.action === 'nextSearchResult'));
    });

    // Press Shift+Enter to go to previous result
    await devToolsPage.pressKey('Enter', {shift: true});

    // Wait for previousSearchResult
    await devToolsPage.waitForFunction(() => {
      return extension.evaluate(() => window.searchEvents.some(e => e.action === 'previousSearchResult'));
    });

    const events = await extension.evaluate(() => window.searchEvents);
    assert.deepInclude(events, {action: 'performSearch', queryString: 'abc'});
    assert.deepInclude(events, {action: 'nextSearchResult'});
    assert.deepInclude(events, {action: 'previousSearchResult'});
  });
});
