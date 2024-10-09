// Copyright (c) 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as LinearMemoryInspector from '../linear_memory_inspector/linear_memory_inspector.js';

/**
 * Adapter for the linear memory inspector that can show a {@link StreamingContentData}.
 */
export class RequestBinaryResponseView extends
    LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorView {
  readonly #streamingContentData: TextUtils.StreamingContentData.StreamingContentData;
  #memory: ContentDataLazyArrayAdapter;

  constructor(streamingContentData: TextUtils.StreamingContentData.StreamingContentData) {
    const adapter = new ContentDataLazyArrayAdapter();
    super(adapter, /* address */ 0, 'tabId is unused here', /* hideValueInspector */ true);
    this.#memory = adapter;
    this.#streamingContentData = streamingContentData;
    this.refreshData();
  }

  override wasShown(): void {
    this.refreshData();
    this.#streamingContentData.addEventListener(
        TextUtils.StreamingContentData.Events.CHUNK_ADDED, this.refreshData, this);

    // No need to call super.wasShown() as we call super.refreshData() ourselves.
  }

  override willHide(): void {
    super.willHide();
    this.#streamingContentData.removeEventListener(
        TextUtils.StreamingContentData.Events.CHUNK_ADDED, this.refreshData, this);
  }

  override refreshData(): void {
    this.#memory.updateWithContentData(this.#streamingContentData.content());
    super.refreshData();
  }
}

/**
 * A small helper class that serves as the holder for the current content of a
 * {@link StreamingContentData} in the form of a Uint8Array.
 *
 * We can't implement the {@link LazyUint8Array} interface directly on
 * {@link RequestBinaryResponseView} as we can't pass "this" to the "super" constructor.
 * So this class acts as a small container cell instead.
 */
class ContentDataLazyArrayAdapter implements LinearMemoryInspector.LinearMemoryInspectorController.LazyUint8Array {
  #memory = new Uint8Array([0]);

  updateWithContentData(contentData: TextUtils.ContentData.ContentData): void {
    const binaryString = window.atob(contentData.base64);
    this.#memory = Uint8Array.from(binaryString, m => m.codePointAt(0) as number);
  }

  getRange(start: number, end: number): Promise<Uint8Array> {
    return Promise.resolve(this.#memory.slice(start, end));
  }

  length(): number {
    return this.#memory.length;
  }
}
