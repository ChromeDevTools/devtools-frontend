// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as LinearMemoryInspectorComponents from '../../../../panels/linear_memory_inspector/components/components.js';
import * as UI from '../../legacy.js';

const MEMORY_TRANSFER_MIN_CHUNK_SIZE = 1000;

/**
 * This is a slightly reduced version of `panels/LinearMemoryInspectorPane.LinearMemoryInspectorView.
 *
 * It's not hooked up to the LinearMemoryInspectorController and it operates on a fixed memory array thats
 * known upfront.
 */
class LinearMemoryInspectorView extends UI.Widget.VBox {
  #memory = new Uint8Array([0]);
  #address = 0;
  #inspector = new LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector();

  constructor() {
    super(false);
    this.#inspector.addEventListener(
        LinearMemoryInspectorComponents.LinearMemoryInspector.MemoryRequestEvent.eventName,
        this.#memoryRequested.bind(this));
    this.#inspector.addEventListener(
        LinearMemoryInspectorComponents.LinearMemoryInspector.AddressChangedEvent.eventName, event => {
          this.#address = event.data;
        });
    this.contentElement.appendChild(this.#inspector);
  }

  override wasShown(): void {
    this.refreshData();
  }

  setMemory(memory: Uint8Array): void {
    this.#memory = memory;
    this.refreshData();
  }

  refreshData(): void {
    // TODO(szuend): The following lines are copied from `LinearMemoryInspectorController`. We can't reuse them
    // as depending on a module in `panels/` from a component is a layering violation.

    // Provide a chunk of memory that covers the address to show and some before and after
    // as 1. the address shown is not necessarily at the beginning of a page and
    // 2. to allow for fewer memory requests.
    const memoryChunkStart = Math.max(0, this.#address - MEMORY_TRANSFER_MIN_CHUNK_SIZE / 2);
    const memoryChunkEnd = memoryChunkStart + MEMORY_TRANSFER_MIN_CHUNK_SIZE;
    const memory = this.#memory.slice(memoryChunkStart, memoryChunkEnd);
    this.#inspector.data = {
      memory,
      address: this.#address,
      memoryOffset: memoryChunkStart,
      outerMemoryLength: this.#memory.length,
      hideValueInspector: true,
    };
  }

  #memoryRequested(event: LinearMemoryInspectorComponents.LinearMemoryInspector.MemoryRequestEvent): void {
    // TODO(szuend): The following lines are copied from `LinearMemoryInspectorController`. We can't reuse them
    // as depending on a module in `panels/` from a component is a layering violation.

    const {start, end, address} = event.data;
    if (address < start || address >= end) {
      throw new Error('Requested address is out of bounds.');
    }

    // Check that the requested start is within bounds.
    // If the requested end is larger than the actual
    // memory, it will be automatically capped when
    // requesting the range.
    if (start < 0 || start > end || start >= this.#memory.length) {
      throw new Error('Requested range is out of bounds.');
    }

    const chunkEnd = Math.max(end, start + MEMORY_TRANSFER_MIN_CHUNK_SIZE);
    const memory = this.#memory.slice(start, chunkEnd);

    this.#inspector.data = {
      memory,
      address,
      memoryOffset: start,
      outerMemoryLength: this.#memory.length,
      hideValueInspector: true,
    };
  }
}

/**
 * Adapter for the linear memory inspector that can show a {@link StreamingContentData}.
 */
export class StreamingContentHexView extends LinearMemoryInspectorView {
  readonly #streamingContentData: TextUtils.StreamingContentData.StreamingContentData;

  constructor(streamingContentData: TextUtils.StreamingContentData.StreamingContentData) {
    super();
    this.#streamingContentData = streamingContentData;
  }

  override wasShown(): void {
    this.#updateMemoryFromContentData();
    this.#streamingContentData.addEventListener(
        TextUtils.StreamingContentData.Events.CHUNK_ADDED, this.#updateMemoryFromContentData, this);

    // No need to call super.wasShown() as we call super.refreshData() ourselves.
  }

  override willHide(): void {
    super.willHide();
    this.#streamingContentData.removeEventListener(
        TextUtils.StreamingContentData.Events.CHUNK_ADDED, this.#updateMemoryFromContentData, this);
  }

  #updateMemoryFromContentData(): void {
    const binaryString = window.atob(this.#streamingContentData.content().base64);
    const memory = Uint8Array.from(binaryString, m => m.codePointAt(0) as number);
    this.setMemory(memory);
  }
}
