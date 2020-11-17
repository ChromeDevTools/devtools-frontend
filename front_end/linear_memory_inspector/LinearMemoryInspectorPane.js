// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {createLinearMemoryInspector} from './LinearMemoryInspector_bridge.js';

/** @type {!LinearMemoryInspectorPaneImpl} */
let inspectorInstance;
export class Wrapper extends UI.Widget.VBox {
  constructor() {
    super();
    this.view = LinearMemoryInspectorPaneImpl.instance();
  }

  /**
   * @override
   */
  wasShown() {
    this.view.show(this.contentElement);
  }
}

export class LinearMemoryInspectorPaneImpl extends UI.Widget.VBox {
  constructor() {
    super(false);
    const placeholder = document.createElement('div');
    placeholder.textContent = ls`No open inspections`;
    placeholder.style.display = 'flex';
    this._tabbedPane = new UI.TabbedPane.TabbedPane();
    this._tabbedPane.setPlaceholderElement(placeholder);
    this._tabbedPane.setCloseableTabs(true);
    this._tabbedPane.setAllowTabReorder(true, true);
    this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, this._tabClosed, this);
    this._tabbedPane.show(this.contentElement);

    this._tabIdToInspectorView = new Map();
  }

  static instance() {
    if (!inspectorInstance) {
      inspectorInstance = new LinearMemoryInspectorPaneImpl();
    }
    return inspectorInstance;
  }

  /**
   * @param {string} scriptId
   * @param {string} title
   * @param {!LazyUint8Array} arrayWrapper
   * @param {number} address
   */
  showLinearMemory(scriptId, title, arrayWrapper, address) {
    if (this._tabIdToInspectorView.has(scriptId)) {
      this._tabbedPane.selectTab(scriptId);
      return;
    }
    const inspectorView = new LinearMemoryInspectorView(arrayWrapper, address);
    this._tabIdToInspectorView.set(scriptId, inspectorView);
    this._tabbedPane.appendTab(scriptId, title, inspectorView, undefined, false, true);
    this._tabbedPane.selectTab(scriptId);
  }

  /**
   *
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _tabClosed(event) {
    const tabId = event.data.tabId;
    this._tabIdToInspectorView.delete(tabId);
  }
}

/**
 * @interface
 */
export class LazyUint8Array {
  /**
   * @param {number} start
   * @param {number} end
   * @return {!Promise<!Uint8Array>}
   */
  getRange(start, end) {
    return Promise.resolve(new Uint8Array([]));
  }

  /**
   * @return {number}
   */
  length() {
    return 0;
  }
}

const MEMORY_TRANSFER_MIN_CHUNK_SIZE = 1000;

class LinearMemoryInspectorView extends UI.Widget.VBox {
  /**
   *
   * @param {!LazyUint8Array} memoryWrapper
   * @param {number} address
   */
  constructor(memoryWrapper, address) {
    super(false);

    if (address < 0 || address > memoryWrapper.length()) {
      throw new Error('Invalid address to show');
    }

    this.memoryWrapper = memoryWrapper;
    this._inspector = createLinearMemoryInspector();
    this._inspector.addEventListener('memoryRequest', /** @param {!Event} event */ event => {
      this._memoryRequested(/** @type {?} */ (event));
    });
    this.contentElement.appendChild(this._inspector);

    // Provide a chunk of memory that covers the address to show and some before and after
    // as 1. the address shown is not necessarily at the beginning of a page and
    // 2. to allow for fewer memory requests.
    const memoryChunkStart = Math.max(0, address - MEMORY_TRANSFER_MIN_CHUNK_SIZE / 2);
    const memoryChunkEnd = memoryChunkStart + MEMORY_TRANSFER_MIN_CHUNK_SIZE;
    this.memoryWrapper.getRange(memoryChunkStart, memoryChunkEnd).then(memory => {
      this._inspector.data = {
        memory: memory,
        address: address,
        memoryOffset: memoryChunkStart,
      };
    });
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _memoryRequested(event) {
    const {start, end, address} = /** @type {!{start: number, end: number, address: number}} */ (event.data);
    if (address < start || address >= end) {
      throw new Error('Requested address is out of bounds.');
    }

    // Check that the requested start is within bounds.
    // If the requested end is larger than the actual
    // memory, it will be automatically capped when
    // requesting the range.
    if (start < 0 || start > end || start >= this.memoryWrapper.length()) {
      throw new Error('Requested range is out of bounds.');
    }
    const chunkEnd = Math.max(end, start + MEMORY_TRANSFER_MIN_CHUNK_SIZE);
    this.memoryWrapper.getRange(start, chunkEnd).then(memory => {
      this._inspector.data = {
        memory: memory,
        address: address,
        memoryOffset: start,
      };
    });
  }
}
