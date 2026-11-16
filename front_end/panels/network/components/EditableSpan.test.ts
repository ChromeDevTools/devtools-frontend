// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';

import * as NetworkComponents from './components.js';

const {EditableSpan} = NetworkComponents.EditableSpan;

async function renderEditableSpan(value: string, includeCommonStyles = false): Promise<{
  widget: NetworkComponents.EditableSpan.EditableSpan,
  editable: HTMLSpanElement,
}> {
  const widget = new EditableSpan();
  widget.value = value;
  renderElementIntoDOM(widget, {includeCommonStyles});
  await widget.updateComplete;

  const editable = widget.contentElement.querySelector('.editable');
  assert.instanceOf(editable, HTMLSpanElement);
  return {widget, editable};
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
