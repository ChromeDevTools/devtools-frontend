// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
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
        super();
        this.#inspector.addEventListener("MemoryRequest" /* LinearMemoryInspectorComponents.LinearMemoryInspector.Events.MEMORY_REQUEST */, this.#memoryRequested, this);
        this.#inspector.addEventListener("AddressChanged" /* LinearMemoryInspectorComponents.LinearMemoryInspector.Events.ADDRESS_CHANGED */, (event) => {
            this.#address = event.data;
        });
        this.#inspector.show(this.contentElement);
    }
    wasShown() {
        super.wasShown();
        this.refreshData();
    }
    setMemory(memory) {
        this.#memory = memory;
        this.refreshData();
    }
    refreshData() {
        // TODO(szuend): The following lines are copied from `LinearMemoryInspectorController`. We can't reuse them
        // as depending on a module in `panels/` from a component is a layering violation.
        // Provide a chunk of memory that covers the address to show and some before and after
        // as 1. the address shown is not necessarily at the beginning of a page and
        // 2. to allow for fewer memory requests.
        const memoryChunkStart = Math.max(0, this.#address - MEMORY_TRANSFER_MIN_CHUNK_SIZE / 2);
        const memoryChunkEnd = memoryChunkStart + MEMORY_TRANSFER_MIN_CHUNK_SIZE;
        const memory = this.#memory.slice(memoryChunkStart, memoryChunkEnd);
        this.#inspector.memory = memory;
        this.#inspector.address = this.#address;
        this.#inspector.memoryOffset = memoryChunkStart;
        this.#inspector.outerMemoryLength = this.#memory.length;
        this.#inspector.hideValueInspector = true;
    }
    #memoryRequested(event) {
        // TODO(szuend): The following lines are copied from `LinearMemoryInspectorController`. We can't reuse them
        // as depending on a module in `panels/` from a component is a layering violation.
        const { start, end, address } = event.data;
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
        this.#inspector.memory = memory;
        this.#inspector.address = address;
        this.#inspector.memoryOffset = start;
        this.#inspector.outerMemoryLength = this.#memory.length;
        this.#inspector.hideValueInspector = true;
    }
}
/**
 * Adapter for the linear memory inspector that can show a {@link StreamingContentData}.
 */
export class StreamingContentHexView extends LinearMemoryInspectorView {
    #streamingContentData;
    constructor(streamingContentData) {
        super();
        this.#streamingContentData = streamingContentData;
    }
    wasShown() {
        super.wasShown();
        this.#updateMemoryFromContentData();
        this.#streamingContentData.addEventListener("ChunkAdded" /* TextUtils.StreamingContentData.Events.CHUNK_ADDED */, this.#updateMemoryFromContentData, this);
        // No need to call super.wasShown() as we call super.refreshData() ourselves.
    }
    willHide() {
        super.willHide();
        this.#streamingContentData.removeEventListener("ChunkAdded" /* TextUtils.StreamingContentData.Events.CHUNK_ADDED */, this.#updateMemoryFromContentData, this);
    }
    #updateMemoryFromContentData() {
        const binaryString = window.atob(this.#streamingContentData.content().base64);
        const memory = Uint8Array.from(binaryString, m => m.codePointAt(0));
        this.setMemory(memory);
    }
}
//# sourceMappingURL=StreamingContentHexView.js.map