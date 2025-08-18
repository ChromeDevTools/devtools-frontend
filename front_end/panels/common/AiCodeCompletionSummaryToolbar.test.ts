// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Common from './common.js';

describeWithEnvironment('AiCodeCompletionSummaryToolbar', () => {
  async function createToolbar() {
    const view = createViewFunctionStub(Common.AiCodeCompletionSummaryToolbar);
    const widget = new Common.AiCodeCompletionSummaryToolbar(
        {citationsTooltipId: 'citations-tooltip', disclaimerTooltipId: 'disclaimer-tooltip'}, view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  afterEach(() => {
    sinon.restore();
  });

  it('should update citations', async () => {
    const {view, widget} = await createToolbar();

    assert.deepEqual(view.input.citations, []);

    widget.updateCitations(['https://example.com/1']);
    await view.nextInput;

    assert.deepEqual(view.input.citations, ['https://example.com/1']);

    widget.updateCitations(['https://example.com/2']);
    await view.nextInput;

    assert.deepEqual(view.input.citations, ['https://example.com/1', 'https://example.com/2']);

    widget.detach();
  });

  it('should not add duplicate citations', async () => {
    const {view, widget} = await createToolbar();

    assert.deepEqual(view.input.citations, []);

    widget.updateCitations(['https://example.com/1']);
    await view.nextInput;

    assert.deepEqual(view.input.citations, ['https://example.com/1']);

    widget.updateCitations(['https://example.com/1']);
    await view.nextInput;

    assert.deepEqual(view.input.citations, ['https://example.com/1']);

    widget.detach();
  });

  it('should clear citations', async () => {
    const {view, widget} = await createToolbar();

    widget.updateCitations(['https://example.com/1']);
    await view.nextInput;

    assert.deepEqual(view.input.citations, ['https://example.com/1']);

    widget.clearCitations();
    await view.nextInput;

    assert.deepEqual(view.input.citations, []);

    widget.detach();
  });
});
