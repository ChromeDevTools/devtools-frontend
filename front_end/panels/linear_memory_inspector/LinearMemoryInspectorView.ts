// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../ui/lit/lit.js';

import * as LinearMemoryInspectorComponents from './components/components.js';
import {type LazyUint8Array, LinearMemoryInspectorController} from './LinearMemoryInspectorController.js';

const {widget} = UI.Widget;

export interface ViewInput {
  memory?: Uint8Array<ArrayBuffer>;
  offset: number;
  address: number;
  outerMemoryLength: number;
  highlightInfo?: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo;
  hideValueInspector: boolean;
  valueTypes: Set<LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType>;
  valueTypeModes: Map<LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueType,
                      LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.ValueTypeMode>;
  endianness: LinearMemoryInspectorComponents.ValueInterpreterDisplayUtils.Endianness;
  onMemoryRequest: (request: {start: number, end: number, address: number}) => void;
  onAddressChanged: (address: number) => void;
  onSettingsChanged: (settings: LinearMemoryInspectorComponents.LinearMemoryInspector.Settings) => void;
  onDeleteMemoryHighlight:
      (highlightInfo: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  if (!input.memory) {
    render(nothing, target);
    return;
  }
  // clang-format off
  render(html`
    ${widget(LinearMemoryInspectorComponents.LinearMemoryInspector.LinearMemoryInspector, {
      memory: input.memory,
      memoryOffset: input.offset,
      address: input.address,
      outerMemoryLength: input.outerMemoryLength,
      highlightInfo: input.highlightInfo,
      hideValueInspector: input.hideValueInspector,
      valueTypes: input.valueTypes,
      valueTypeModes: input.valueTypeModes,
      endianness: input.endianness,
      onMemoryRequest: input.onMemoryRequest,
      onAddressChanged: input.onAddressChanged,
      onSettingsChanged: input.onSettingsChanged,
      onDeleteMemoryHighlight: input.onDeleteMemoryHighlight,
    })}
  `, target);
  // clang-format on
};

export class LinearMemoryInspectorView extends UI.Widget.VBox {
  #memoryWrapper?: LazyUint8Array;
  #memory?: Uint8Array<ArrayBuffer>;
  #offset = 0;
  #address = 0;
  #tabId = '';
  #hideValueInspector = false;
  #refreshSequence = 0;
  #currentRequestId = 0;
  #settings?: LinearMemoryInspectorComponents.LinearMemoryInspector.Settings;
  #onAddressChanged?: (tabId: string, address: number) => void;
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set memoryWrapper(memoryWrapper: LazyUint8Array) {
    if (this.#memoryWrapper === memoryWrapper) {
      return;
    }
    if (memoryWrapper.length() === 0 || this.#address >= memoryWrapper.length()) {
      throw new Error('Requested address is out of bounds.');
    }
    this.#memoryWrapper = memoryWrapper;
    this.#memory = undefined;
    this.refreshData();
  }

  set address(address: number) {
    if (address < 0 || (this.#memoryWrapper && address >= this.#memoryWrapper.length())) {
      throw new Error('Requested address is out of bounds.');
    }
    if (this.#address === address) {
      return;
    }
    this.#address = address;
    this.requestUpdate();
  }

  set tabId(tabId: string) {
    if (this.#tabId === tabId) {
      return;
    }
    this.#tabId = tabId;
    this.requestUpdate();
  }

  set hideValueInspector(hideValueInspector: boolean) {
    if (this.#hideValueInspector === hideValueInspector) {
      return;
    }
    this.#hideValueInspector = hideValueInspector;
    this.requestUpdate();
  }

  set onAddressChanged(onAddressChanged: ((tabId: string, address: number) => void)|undefined) {
    this.#onAddressChanged = onAddressChanged;
  }

  set refreshSequence(value: number) {
    if (this.#refreshSequence === value) {
      return;
    }
    this.#refreshSequence = value;
    if (this.isShowing()) {
      this.refreshData();
    }
  }

  override performUpdate(): void {
    if (!this.#settings) {
      this.#settings = LinearMemoryInspectorController.instance().loadSettings();
    }

    if (!this.#memoryWrapper) {
      return;
    }

    const viewInput: ViewInput = {
      memory: this.#memory,
      offset: this.#offset,
      address: this.#address,
      outerMemoryLength: this.#memoryWrapper.length(),
      highlightInfo: this.#getHighlightInfo(),
      hideValueInspector: this.#hideValueInspector,
      valueTypes: this.#settings.valueTypes,
      valueTypeModes: this.#settings.modes,
      endianness: this.#settings.endianness,
      onMemoryRequest: this.#memoryRequested,
      onAddressChanged: this.updateAddress.bind(this),
      onSettingsChanged: this.#settingsChanged,
      onDeleteMemoryHighlight: this.#deleteMemoryHighlight,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    this.#settings = LinearMemoryInspectorController.instance().loadSettings();
    this.refreshData();
  }

  updateAddress(address: number): void {
    this.address = address;
    this.#onAddressChanged?.(this.#tabId, address);
  }

  refreshData(): void {
    if (!this.#memoryWrapper) {
      return;
    }
    const requestId = ++this.#currentRequestId;
    void LinearMemoryInspectorController.getMemoryForAddress(this.#memoryWrapper, this.#address)
        .then(({memory, offset}) => {
          if (requestId !== this.#currentRequestId) {
            return;
          }
          this.#memory = memory;
          this.#offset = offset;
          this.requestUpdate();
        });
  }

  #memoryRequested = (request: {start: number, end: number, address: number}): void => {
    if (!this.#memoryWrapper) {
      return;
    }
    const {start, end, address} = request;
    if (address < start || address >= end) {
      throw new Error('Requested address is out of bounds.');
    }

    const requestId = ++this.#currentRequestId;
    void LinearMemoryInspectorController.getMemoryRange(this.#memoryWrapper, start, end).then(memory => {
      if (requestId !== this.#currentRequestId) {
        return;
      }
      this.#memory = memory;
      this.#offset = start;
      this.requestUpdate();
    });
  };

  #settingsChanged = (settings: LinearMemoryInspectorComponents.LinearMemoryInspector.Settings): void => {
    this.#settings = settings;
    LinearMemoryInspectorController.instance().saveSettings(settings);
    this.requestUpdate();
  };

  #deleteMemoryHighlight =
      (highlightInfo: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo): void => {
        LinearMemoryInspectorController.instance().removeHighlight(this.#tabId, highlightInfo);
        this.refreshData();
      };

  #getHighlightInfo(): LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo|undefined {
    const highlightInfo = LinearMemoryInspectorController.instance().getHighlightInfo(this.#tabId);
    if (highlightInfo !== undefined && this.#memoryWrapper) {
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
