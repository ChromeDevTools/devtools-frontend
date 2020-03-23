// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$, click, getBrowserAndPages, resetPages, resourcesPath} from '../../shared/helper.js';
import {RESUME_BUTTON} from '../helpers/sources-helpers.js';

describe('Raw-Wasm', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('displays correct location in Wasm source', async () => {
    const {target, frontend} = getBrowserAndPages();

    // Have the target load the page.
    await target.goto(`${resourcesPath}/pages/callstack-wasm-to-js.html`);

    // This page automatically enters debugging.
    const messageElement = await frontend.waitForSelector('.paused-message');
    const statusMain = await $('.status-main', messageElement);
    const statusMainElement = statusMain.asElement();

    if (!statusMainElement) {
      assert.fail('Unable to find .status-main element');
      return;
    }

    const pauseMessage = await statusMainElement.evaluate(n => n.textContent);

    assert.equal(pauseMessage, 'Debugger paused');

    const sidebar = await messageElement.evaluateHandle(n => n.parentElement);

    // Find second frame of call stack
    const callFrame = (await $('.call-frame-item.selected + .call-frame-item', sidebar)).asElement();
    if (!callFrame) {
      assert.fail('Unable to find callframe');
      return;
    }

    const callFrameTitle = (await $('.call-frame-title-text', callFrame)).asElement();
    if (!callFrameTitle) {
      assert.fail('Unable to find callframe title');
      return;
    }

    const title = await callFrameTitle.evaluate(n => n.textContent);
    const callFrameLocation = (await $('.call-frame-location', callFrame)).asElement();
    if (!callFrameLocation) {
      assert.fail('Unable to find callframe location');
      return;
    }

    const location = await callFrameLocation.evaluate(n => n.textContent);

    assert.equal(title, 'foo');
    assert.equal(location, 'callstack-wasm-to-js.wasm:1');

    // Select next call frame.
    await callFrame.press('ArrowDown');
    await callFrame.press('Space');

    // Wasm code for function call should be highlighted
    const codeLine = await frontend.waitForSelector('.cm-execution-line pre');
    const codeText = await codeLine.evaluate(n => n.textContent);

    assert.equal(codeText, '    call $bar');

    // Resume the evaluation
    await click(RESUME_BUTTON);
  });
});
