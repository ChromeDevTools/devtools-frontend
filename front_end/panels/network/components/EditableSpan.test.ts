// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as NetworkComponents from './components.js';

async function renderEditableSpan(value: string, includeCommonStyles = false): Promise<{
  component: NetworkComponents.EditableSpan.EditableSpan,
  editable: HTMLSpanElement,
}> {
  const component = new NetworkComponents.EditableSpan.EditableSpan();
  renderElementIntoDOM(component, {includeCommonStyles});
  component.data = {value};
  await RenderCoordinator.done();

  assert.isNotNull(component.shadowRoot);
  const editable = component.shadowRoot.querySelector('.editable');
  assert.instanceOf(editable, HTMLSpanElement);
  return {component, editable};
}

describe('EditableSpan', () => {
  it('selects all text contents of .editable span on focusin', async () => {
    const {editable} = await renderEditableSpan('select-me');

    editable.focus();

    const selection = window.getSelection();
    assert.isNotNull(selection);
    assert.strictEqual(selection.toString(), 'select-me');
  });

  it('renders an editable span', async () => {
    await renderEditableSpan('example-header-value', true);

    await assertScreenshot('network/editable_span.png');
  });
});
