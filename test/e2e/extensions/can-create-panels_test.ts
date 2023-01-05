// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  getBrowserAndPages,
  waitFor,
  waitForAria,
  waitForAriaNone,
  waitForFunction,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {loadExtension} from '../helpers/extension-helpers.js';

describe('The Extension API', () => {
  it('can create panels with callbacks', async () => {
    const extension = await loadExtension('TestExtension');

    const callbackArgs = await extension.evaluate(
        () => new Promise<string>(
            r => window.chrome.devtools.panels.create(
                'extension-tab-title', /* iconPath=*/ '', /* resourcePath=*/ '',
                (...args) => r(JSON.stringify(args)))));

    assert.deepEqual(callbackArgs, '[{"onShown":{},"onHidden":{},"onSearch":{}}]');
  });

  it('rejects absolute resource URLs', async () => {
    const extension = await loadExtension('TestExtension');

    const error = expectError(
        'Extension server error: Invalid argument page: Resources paths cannot point to non-extension resources');
    // absolute URLs should report an error and not create a panel view
    await extension.evaluate(async () => {
      await new Promise(
          r => window.chrome.devtools.panels.create(
              'extension-tab-title', /* iconPath=*/ '', /* resourcePath=*/ 'http://example.com', r));
    });
    await waitForFunction(async () => error.caught);
    await waitForAriaNone('extension-tab-title');
  });

  it('handles absolute resource paths correctly', async () => {
    const extension = await loadExtension('TestExtension');
    const {frontend} = getBrowserAndPages();
    // We don't have a real extension host, so the extension origin will match the frontend
    const origin = await frontend.evaluate(() => document.location.origin);

    await extension.evaluate(async () => {
      await new Promise(
          r => window.chrome.devtools.panels.create(
              'extension-tab-title', /* iconPath=*/ '', /* resourcePath=*/ '/blank.html', r));
    });
    const header = await waitForAria('extension-tab-title');
    await header.click();
    const panel = await waitForAria('extension-tab-title panel');
    const page = await waitFor('iframe', panel);
    const target = await page.evaluate(e => (e as HTMLIFrameElement).src);
    assert.strictEqual(target, `${origin}/blank.html`);
  });

  it('handles relative resource paths correctly', async () => {
    const extension = await loadExtension('TestExtension');
    const {frontend} = getBrowserAndPages();
    // We don't have a real extension host, so the extension origin will match the frontend
    const origin = await frontend.evaluate(() => document.location.origin);
    await extension.evaluate(async () => {
      await new Promise(
          r => window.chrome.devtools.panels.create(
              'extension-tab-title', /* iconPath=*/ '', /* resourcePath=*/ '/blank.html', r));
    });
    const header = await waitForAria('extension-tab-title');
    await header.click();
    const panel = await waitForAria('extension-tab-title panel');
    const page = await waitFor('iframe', panel);
    const target = await page.evaluate(e => (e as HTMLIFrameElement).src);
    assert.strictEqual(target, `${origin}/blank.html`);
  });
});
