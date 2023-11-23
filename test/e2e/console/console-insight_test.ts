// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {clickOnContextMenu, CONSOLE_TAB_SELECTOR} from '../helpers/console-helpers.js';

describe('ConsoleInsight', async function() {
  const CLICK_TARGET_SELECTOR = '.console-message-text';
  const EXPLAIN_LABEL = 'Explain this error';

  async function mockAida(response: unknown) {
    const {frontend} = getBrowserAndPages();
    await frontend.bringToFront();
    await frontend.evaluateOnNewDocument(`
      globalThis.doAidaConversationForTesting = (data, cb) => {
        cb({"response": JSON.stringify(${JSON.stringify(response)})});
      }
    `);
    await frontend.goto(frontend.url() + '&enableAida=true', {
      waitUntil: 'networkidle0',
    });
    await frontend.evaluate(`(async () => {
      const Root = await import('./core/root/root.js');
      Root.Runtime.experiments.setEnabled('consoleInsights', true);
    })()`);
    await frontend.goto(frontend.url() + '&enableAida=true');
  }

  it('shows an insight for a console message', async () => {
    const {target} = getBrowserAndPages();
    await mockAida([
      {'textChunk': {'text': 'test'}},
    ]);
    await click(CONSOLE_TAB_SELECTOR);
    await target.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await clickOnContextMenu(CLICK_TARGET_SELECTOR, EXPLAIN_LABEL);
    await waitFor('devtools-console-insight', undefined, undefined, 'pierce');
  });

  it('does not show context menu if AIDA is not available', async () => {
    const {target} = getBrowserAndPages();
    await mockAida(null);
    await click(CONSOLE_TAB_SELECTOR);
    await target.evaluate(() => {
      console.error(new Error('Unexpected error'));
    });
    await click(CLICK_TARGET_SELECTOR, {clickOptions: {button: 'right'}});
    const menu = await waitFor('.soft-context-menu', undefined, undefined, 'pierce');
    const items = await menu.$$('.soft-context-menu-item');
    const texts = await Promise.all(items.map(item => item.evaluate(e => (e as HTMLElement).innerText)));
    assert(!texts.some(item => item.toLowerCase().startsWith(EXPLAIN_LABEL)), 'Context menu shows the explain option');
  });
});
