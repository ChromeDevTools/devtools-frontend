// Copyright (c) 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import {raf} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as LinearMemoryInspectorComponents from '../linear_memory_inspector/components/components.js';

import * as Network from './network.js';

describeWithEnvironment('RequestBinaryResponseView', () => {
  function getMemoryViewer(view: Network.RequestBinaryResponseView.RequestBinaryResponseView):
      LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer {
    const inspector = view.contentElement.firstChild as HTMLElement;
    assert.isNotNull(inspector.shadowRoot);

    const viewer = inspector.shadowRoot.querySelector('devtools-linear-memory-inspector-viewer');
    assert.instanceOf(viewer, LinearMemoryInspectorComponents.LinearMemoryViewer.LinearMemoryViewer);
    return viewer;
  }

  function getAllByteCells(view: Network.RequestBinaryResponseView.RequestBinaryResponseView): string {
    const viewer = getMemoryViewer(view);
    assert.isNotNull(viewer.shadowRoot);

    const byteCells = [...viewer.shadowRoot.querySelectorAll('.byte-cell')];
    return byteCells.map(c => c.textContent).join('');
  }

  function getAllTextCells(view: Network.RequestBinaryResponseView.RequestBinaryResponseView): string {
    const viewer = getMemoryViewer(view);
    assert.isNotNull(viewer.shadowRoot);

    const textCells = [...viewer.shadowRoot.querySelectorAll('.text-cell')];
    return textCells.map(c => c.textContent).join('');
  }

  it('shows the initial content of a StreamingContentData', async () => {
    const streamingContentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(window.btoa('abc'), /* isBase64 */ true, 'application/octet-stream'));
    const view = new Network.RequestBinaryResponseView.RequestBinaryResponseView(streamingContentData);
    view.markAsRoot();
    view.show(document.body);
    await raf();

    assert.strictEqual(getAllByteCells(view), '616263');
    assert.strictEqual(getAllTextCells(view), 'abc');

    view.detach();
  });

  it('shows the updated content of a StreamingContentData', async () => {
    const streamingContentData = TextUtils.StreamingContentData.StreamingContentData.from(
        new TextUtils.ContentData.ContentData(window.btoa('abc'), /* isBase64 */ true, 'application/octet-stream'));
    const view = new Network.RequestBinaryResponseView.RequestBinaryResponseView(streamingContentData);
    view.markAsRoot();
    view.show(document.body);
    await raf();

    streamingContentData.addChunk(window.btoa('def'));
    await raf();

    assert.strictEqual(getAllByteCells(view), '616263646566');
    assert.strictEqual(getAllTextCells(view), 'abcdef');

    view.detach();
  });
});
