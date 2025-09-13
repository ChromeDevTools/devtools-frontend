// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import type * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';

import * as SourceFrame from './source_frame.js';

const {urlString} = Platform.DevToolsPath;

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
        urlString`https://example.com/sse`, Common.ResourceType.resourceTypes.Fetch,
        new TextUtils.ContentData.ContentData('', true, 'text/event-stream'));

    const resourceSourceFrame =
        new SourceFrame.ResourceSourceFrame.ResourceSourceFrame(contentProvider, 'text/event-stream');
    renderElementIntoDOM(resourceSourceFrame);

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
