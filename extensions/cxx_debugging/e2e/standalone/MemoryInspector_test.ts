// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {
  addBreakpointForLine,
  openFileInEditor,
  PAUSE_INDICATOR_SELECTOR,
} from 'test/e2e/helpers/sources-helpers';
import {getBrowserAndPagesWrappers} from 'test/shared/non_hosted_wrappers.js';

import {
  openTestSuiteResourceInSourcesPanel,
} from '../cxx-debugging-extension-helpers.js';

describe('LinearMemoryInspector', () => {
  it('can show variables', async () => {
    const {inspectedPage, devToolsPage} = getBrowserAndPagesWrappers();
    const test =
        'extensions/cxx_debugging/e2e/resources/scope-view-primitives__Scope_view_formats_primitive_types_correctly_0.html';
    await openTestSuiteResourceInSourcesPanel(test);
    await devToolsPage.installEventListener('DevTools.DebuggerPaused');

    const file = 'scope-view-primitives.c';
    const breakpoint = 14;
    await openFileInEditor(file);
    await addBreakpointForLine(Number(breakpoint));

    await inspectedPage.reload();
    await devToolsPage.waitForFunction(
        async () => ((await devToolsPage.getPendingEvents('DevTools.DebuggerPaused')) || []).length > 0);

    const stopped = await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    const stoppedText =
        await devToolsPage.waitForFunction(async () => await stopped.evaluate(node => node.textContent));

    assert.strictEqual(stoppedText, 'Paused on breakpoint');

    const localVariable = await devToolsPage.waitFor('[data-object-property-name-for-test="d"]');
    await devToolsPage.click('[title="Open in Memory inspector panel"]', {
      root: localVariable,
    });

    const byteHighlights = await devToolsPage.waitForMany('.byte-cell.highlight-area', 8);
    const byteHighlightText = await Promise.all(byteHighlights.map(cell => cell.evaluate(cell => cell.textContent)));
    assert.deepEqual(byteHighlightText, ['33', '33', '33', '33', '33', '33', 'F3', '3F']);

    const valueHighlights = await devToolsPage.waitForMany('.text-cell.highlight-area', 8);
    const valueHighlightText = await Promise.all(valueHighlights.map(cell => cell.evaluate(cell => cell.textContent)));
    assert.deepEqual(valueHighlightText, ['3', '3', '3', '3', '3', '3', '.', '?']);
  });
});
