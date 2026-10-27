// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-imperative-dom-api */

import * as UI from '../../ui/legacy/legacy.js';

import * as LinearMemoryInspectorComponents from './components/components.js';
import {type LazyUint8Array, LinearMemoryInspectorController} from './LinearMemoryInspectorController.js';

export class LinearMemoryInspectorView extends UI.Widget.VBox {
  #memoryWrapper: LazyUint8Array;
  #memory?: Uint8Array<ArrayBuffer>;
  #offset = 0;
  #address: number;
  #tabId: string;
  #inspector: LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector;
  firstTimeOpen: boolean;
  readonly #hideValueInspector: boolean;

  constructor(memoryWrapper: LazyUint8Array, address: number|undefined = 0, tabId: string,
              hideValueInspector?: boolean) {
    super();

    if (address < 0 || address >= memoryWrapper.length()) {
      throw new Error('Requested address is out of bounds.');
    }

    this.#memoryWrapper = memoryWrapper;
    this.#address = address;
    this.#tabId = tabId;
    this.#hideValueInspector = Boolean(hideValueInspector);
    this.firstTimeOpen = true;

    this.#inspector = new LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector();
    this.#inspector.onMemoryRequest = this.#memoryRequested.bind(this);
    this.#inspector.onAddressChanged = (address: number) => this.updateAddress(address);
    this.#inspector.onSettingsChanged = (settings: LinearMemoryInspectorComponents.LinearMemoryInspector.Settings) =>
        this.saveSettings(settings);
    this.#inspector.onDeleteMemoryHighlight =
        (highlight: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo) => {
          LinearMemoryInspectorController.instance().removeHighlight(this.#tabId, highlight);
          this.refreshData();
        };
    this.#inspector.show(this.contentElement);
  }

  render(): void {
    if (this.firstTimeOpen) {
      const settings = LinearMemoryInspectorController.instance().loadSettings();
      this.#inspector.valueTypes = settings.valueTypes;
      this.#inspector.valueTypeModes = settings.modes;
      this.#inspector.endianness = settings.endianness;
      this.firstTimeOpen = false;
    }

    if (!this.#memory) {
      return;
    }

    this.#inspector.memory = this.#memory;
    this.#inspector.memoryOffset = this.#offset;
    this.#inspector.address = this.#address;
    this.#inspector.outerMemoryLength = this.#memoryWrapper.length();
    this.#inspector.highlightInfo = this.#getHighlightInfo();
    this.#inspector.hideValueInspector = this.#hideValueInspector;
  }

  override wasShown(): void {
    super.wasShown();
    this.refreshData();
  }

  saveSettings(settings: LinearMemoryInspectorComponents.LinearMemoryInspector.Settings): void {
    LinearMemoryInspectorController.instance().saveSettings(settings);
  }

  updateAddress(address: number): void {
    if (address < 0 || address >= this.#memoryWrapper.length()) {
      throw new Error('Requested address is out of bounds.');
    }
    this.#address = address;
  }

  refreshData(): void {
    void LinearMemoryInspectorController.getMemoryForAddress(this.#memoryWrapper, this.#address)
        .then(({memory, offset}) => {
          this.#memory = memory;
          this.#offset = offset;
          this.render();
        });
  }

  #memoryRequested(request: {start: number, end: number, address: number}): void {
    const {start, end, address} = request;
    if (address < start || address >= end) {
      throw new Error('Requested address is out of bounds.');
    }

    void LinearMemoryInspectorController.getMemoryRange(this.#memoryWrapper, start, end).then(memory => {
      this.#memory = memory;
      this.#offset = start;
      this.render();
    });
  }

  #getHighlightInfo(): LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo|undefined {
    const highlightInfo = LinearMemoryInspectorController.instance().getHighlightInfo(this.#tabId);
    if (highlightInfo !== undefined) {
      if (highlightInfo.startAddress < 0 || highlightInfo.startAddress >= this.#memoryWrapper.length()) {
        throw new Error('HighlightInfo start address is out of bounds.');
      }
      if (highlightInfo.size <= 0) {
        throw new Error('Highlight size must be a positive number.');
      }
    }
    return highlightInfo;
  }
}
