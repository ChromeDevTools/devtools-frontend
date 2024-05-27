// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import type * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';

import * as SourceFrame from './source_frame.js';

class MockStreamingContentProvider implements TextUtils.ContentProvider.StreamingContentProvider {
  readonly #contentURL: Platform.DevToolsPath.UrlString;
  readonly #contentType: Common.ResourceType.ResourceType;
  readonly #content: TextUtils.StreamingContentData.StreamingContentData;

  constructor(
      contentURL: Platform.DevToolsPath.UrlString, contentType: Common.ResourceType.ResourceType,
      initialContent: TextUtils.ContentData.ContentData) {
    this.#contentURL = contentURL;
    this.#contentType = contentType;
    this.#content = TextUtils.StreamingContentData.StreamingContentData.from(initialContent);
  }

  async requestStreamingContent(): Promise<TextUtils.StreamingContentData.StreamingContentDataOrError> {
    return this.#content;
  }

  async requestContentData(): Promise<TextUtils.ContentData.ContentData> {
    return this.#content.content();
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.#contentURL;
  }

  contentType(): Common.ResourceType.ResourceType {
    return this.#contentType;
  }

  async requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    return this.#content.content().asDeferedContent();
  }

  addChunk(chunk: string): void {
    this.#content.addChunk(chunk);
  }

  searchInContent(_query: string, _caseSensitive: boolean, _isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    throw new Error('Method not implemented.');
  }
}

describeWithEnvironment('ResourceSourceFrame', () => {
  it('updates the editor when a StreamingContentProvider changes', async () => {
    const contentProvider = new MockStreamingContentProvider(
        'https://example.com/sse' as Platform.DevToolsPath.UrlString, Common.ResourceType.resourceTypes.Fetch,
        new TextUtils.ContentData.ContentData('', true, 'text/event-stream'));

    const resourceSourceFrame =
        new SourceFrame.ResourceSourceFrame.ResourceSourceFrame(contentProvider, 'text/event-stream');
    resourceSourceFrame.markAsRoot();
    resourceSourceFrame.show(document.body);

    const initialState = await new Promise<CodeMirror.EditorState>(
        resolve => sinon.stub(resourceSourceFrame.textEditor, 'state').set(resolve));
    assert.strictEqual(initialState.doc.toString(), '');

    contentProvider.addChunk('Zm9v');

    const updatedState = await new Promise<CodeMirror.EditorState>(
        resolve => sinon.stub(resourceSourceFrame.textEditor, 'state').set(resolve));
    assert.strictEqual(updatedState.doc.toString(), 'foo');

    resourceSourceFrame.detach();
  });
});
