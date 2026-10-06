// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import {raf, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as SourceFrame from './source_frame.js';

describeWithEnvironment('StreamingContentHexView', () => {
  function getMemoryViewer(view: SourceFrame.StreamingContentHexView.StreamingContentHexView): HTMLElement {
    const inspector = view.contentElement.firstChild as HTMLElement;
    const viewer = inspector.querySelector('.viewer-widget');
    assert.instanceOf(viewer, HTMLElement);
    return viewer;
  }

  function getAllByteCells(view: SourceFrame.StreamingContentHexView.StreamingContentHexView): string {
    const viewer = getMemoryViewer(view);
    const byteCells = [...viewer.querySelectorAll('.byte-cell')];
    return byteCells.map(c => c.textContent).join('');
  }

  function getAllTextCells(view: SourceFrame.StreamingContentHexView.StreamingContentHexView): string {
    const viewer = getMemoryViewer(view);
    const textCells = [...viewer.querySelectorAll('.text-cell')];
    return textCells.map(c => c.textContent).join('');
  }

  it('shows the initial content of a StreamingContentData', async () => {
    const streamingContentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(window.btoa('abc'), /* isBase64 */ true, 'application/octet-stream'));
    const view = new SourceFrame.StreamingContentHexView.StreamingContentHexView(streamingContentData);
    renderElementIntoDOM(view);
    await raf();

    assert.strictEqual(getAllByteCells(view), '616263');
    assert.strictEqual(getAllTextCells(view), 'abc');

    view.detach();
  });

  it('shows the updated content of a StreamingContentData', async () => {
    const streamingContentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(window.btoa('abc'), /* isBase64 */ true, 'application/octet-stream'));
    const view = new SourceFrame.StreamingContentHexView.StreamingContentHexView(streamingContentData);
    renderElementIntoDOM(view);
    await raf();

    streamingContentData.addChunk(window.btoa('def'));
    await raf();

    assert.strictEqual(getAllByteCells(view), '61626364');
    assert.strictEqual(getAllTextCells(view), 'abcd');

    view.detach();
  });
});
