// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';

import {SOURCE_ROOT} from '../../conductor/paths.js';

describe('Mock Extension Loading', () => {
  // Path to the dummy extension in its new home
  const extensionPath = path.join(SOURCE_ROOT, 'test/e2e/resources/extensions/dummy_ext');

  setup({
    extensions: [extensionPath],
  });

  it('can load the extension, inject content script, log to console, and style elements in OTR',
     async ({inspectedPage}) => {
       const consoleMessages: string[] = [];
       // Listen to console events on the inspected page
       inspectedPage.page.on('console', msg => {
         consoleMessages.push(msg.text());
       });

       // Navigate to a page to trigger injection
       await inspectedPage.goToResource('empty.html');

       // 1. Verify console log from content script
       assert.include(consoleMessages, 'OTR Test Extension content script injected!',
                      'Expected console message from extension was not found');

       // 2. Verify child element is present
       const marker = await inspectedPage.page.$('#otr-test-extension-marker');
       assert.isNotNull(marker, 'Marker element injected by extension was not found');

       // 3. Verify child element has red background color
       const backgroundColor = await inspectedPage.page.evaluate(() => {
         const el = document.getElementById('otr-test-extension-marker');
         return el ? window.getComputedStyle(el).backgroundColor : null;
       });

       // 'red' resolves to 'rgb(255, 0, 0)' in computed style
       assert.strictEqual(backgroundColor, 'rgb(255, 0, 0)',
                          `Expected marker to have red background (rgb(255, 0, 0)), but got ${backgroundColor}`);
     });
});
