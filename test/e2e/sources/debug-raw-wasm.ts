// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, resetPages, resourcesPath, $, getElementPosition} from '../../shared/helper.js';

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
    const pauseMessage = await (await $('.status-main', messageElement)).asElement().evaluate(n => n.textContent);

    assert.equal(pauseMessage, "Debugger paused");

    const sidebar = await messageElement.evaluateHandle(n => n.parentElement);
    // Find second frame of call stack
    const callFrame = (await $('.call-frame-item.selected + .call-frame-item', sidebar)).asElement();
    const callFrameTitle = await $('.call-frame-title-text', callFrame);
    const title = await callFrameTitle.asElement().evaluate(n => n.textContent);
    const callFrameLocation = await $('.call-frame-location', callFrame);
    const location = await callFrameLocation.asElement().evaluate(n => n.textContent);

    assert.equal(title, "foo");
    assert.equal(location, "callstack-wasm-to-js.wasm:1");

    // Select next call frame.
    await callFrame.press('ArrowDown');
    await callFrame.press('Space');

    // Wasm code for function call should be highlighted
    const codeLine = await frontend.waitForSelector('.cm-execution-line pre');
    const codeText = await codeLine.evaluate(n => n.textContent);

    assert.equal(codeText, '    call $import0');
  });
});
