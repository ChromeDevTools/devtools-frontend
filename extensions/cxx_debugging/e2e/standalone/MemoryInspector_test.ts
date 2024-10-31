// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {
  addBreakpointForLine,
  openFileInEditor,
  PAUSE_INDICATOR_SELECTOR,
} from 'test/e2e/helpers/sources-helpers';
import {
  clickElement,
  getBrowserAndPages,
  getPendingEvents,
  installEventListener,
  waitFor,
  waitForFunction,
  waitForMany,
} from 'test/shared/helper.js';


import {
  openTestSuiteResourceInSourcesPanel,
} from '../cxx-debugging-extension-helpers.js';

describe('LinearMemoryInspector', () => {
  it('can show variables', async () => {
    const {target, frontend} = getBrowserAndPages();
    const test =
        'extensions/cxx_debugging/e2e/resources/scope-view-primitives__Scope_view_formats_primitive_types_correctly_0.html';
    await openTestSuiteResourceInSourcesPanel(test);
    await installEventListener(frontend, 'DevTools.DebuggerPaused');

    const file = 'scope-view-primitives.c';
    const breakpoint = 14;
    await openFileInEditor(file);
    await addBreakpointForLine(frontend, Number(breakpoint));

    await target.reload();
    await waitForFunction(async () => ((await getPendingEvents(frontend, 'DevTools.DebuggerPaused')) || []).length > 0);

    const stopped = await waitFor(PAUSE_INDICATOR_SELECTOR);
    const stoppedText = await waitForFunction(async () => stopped.evaluate(node => node.textContent));

    assert.equal(stoppedText, 'Paused on breakpoint');

    const localVariable = await waitFor('[data-object-property-name-for-test="d"]');
    const memIcon = await waitFor('[title="Open in Memory inspector panel"]', localVariable);
    await clickElement(memIcon);

    const byteHighlights = await waitForMany('.byte-cell.highlight-area', 8);
    const byteHighlightText = await Promise.all(byteHighlights.map(cell => cell.evaluate(cell => cell.textContent)));
    assert.deepEqual(byteHighlightText, ['33', '33', '33', '33', '33', '33', 'F3', '3F']);

    const valueHighlights = await waitForMany('.text-cell.highlight-area', 8);
    const valueHighlightText = await Promise.all(valueHighlights.map(cell => cell.evaluate(cell => cell.textContent)));
    assert.deepEqual(valueHighlightText, ['3', '3', '3', '3', '3', '3', '.', '?']);
  });
});
