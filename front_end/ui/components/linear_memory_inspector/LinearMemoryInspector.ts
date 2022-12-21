// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as ComponentHelpers from '../helpers/helpers.js';
import linearMemoryInspectorStyles from './linearMemoryInspector.css.js';

const {render, html} = LitHtml;

import {
  Mode,
  Navigation,
  LinearMemoryNavigator,
  type AddressInputChangedEvent,
  type HistoryNavigationEvent,
  type LinearMemoryNavigatorData,
  type PageNavigationEvent,
} from './LinearMemoryNavigator.js';

import {
  LinearMemoryValueInterpreter,
  type EndiannessChangedEvent,
  type LinearMemoryValueInterpreterData,
  type ValueTypeToggledEvent,
} from './LinearMemoryValueInterpreter.js';

import {
  VALUE_INTEPRETER_MAX_NUM_BYTES,
  Endianness,
  getDefaultValueTypeMapping,
  type ValueType,
  type ValueTypeMode,
} from './ValueInterpreterDisplayUtils.js';
import {formatAddress, parseAddress} from './LinearMemoryInspectorUtils.js';
import {type JumpToPointerAddressEvent, type ValueTypeModeChangedEvent} from './ValueInterpreterDisplay.js';
import {
  LinearMemoryViewer,
  type ByteSelectedEvent,
  type LinearMemoryViewerData,
  type ResizeEvent,
} from './LinearMemoryViewer.js';
import {
  LinearMemoryHighlightChipList,
  type LinearMemoryHighlightChipListData,
  type DeleteMemoryHighlightEvent,
  type JumpToHighlightedMemoryEvent,
} from './LinearMemoryHighlightChipList.js';
import {type HighlightInfo} from './LinearMemoryViewerUtils.js';

import * as i18n from '../../../core/i18n/i18n.js';
const UIStrings = {
  /**
   *@description Tooltip text that appears when hovering over an invalid address in the address line in the Linear Memory Inspector
   *@example {0x00000000} PH1
   *@example {0x00400000} PH2
   */
  addressHasToBeANumberBetweenSAnd: 'Address has to be a number between {PH1} and {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/linear_memory_inspector/LinearMemoryInspector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
// If the LinearMemoryInspector only receives a portion
// of the original Uint8Array to show, it requires information
// on the 1. memoryOffset (at which index this portion starts),
// and on the 2. outerMemoryLength (length of the original Uint8Array).
export interface LinearMemoryInspectorData {
  memory: Uint8Array;
  address: number;
  memoryOffset: number;
  outerMemoryLength: number;
  valueTypes?: Set<ValueType>;
  valueTypeModes?: Map<ValueType, ValueTypeMode>;
  endianness?: Endianness;
  highlightInfo?: HighlightInfo;
}

export type Settings = {
  valueTypes: Set<ValueType>,
  modes: Map<ValueType, ValueTypeMode>,
  endianness: Endianness,
};

export class MemoryRequestEvent extends Event {
  static readonly eventName = 'memoryrequest';
  data: {start: number, end: number, address: number};

  constructor(start: number, end: number, address: number) {
    super(MemoryRequestEvent.eventName);
    this.data = {start, end, address};
  }
}

export class AddressChangedEvent extends Event {
  static readonly eventName = 'addresschanged';
  data: number;

  constructor(address: number) {
    super(AddressChangedEvent.eventName);
    this.data = address;
  }
}

export class SettingsChangedEvent extends Event {
  static readonly eventName = 'settingschanged';
  data: Settings;

  constructor(settings: Settings) {
    super(SettingsChangedEvent.eventName);
    this.data = settings;
  }
}

class AddressHistoryEntry implements Common.SimpleHistoryManager.HistoryEntry {
  #address = 0;
  #callback;

  constructor(address: number, callback: (x: number) => void) {
    if (address < 0) {
      throw new Error('Address should be a greater or equal to zero');
    }
    this.#address = address;
    this.#callback = callback;
  }

  valid(): boolean {
    return true;
  }

  reveal(): void {
    this.#callback(this.#address);
  }
}

export class LinearMemoryInspector extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-linear-memory-inspector-inspector`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #history = new Common.SimpleHistoryManager.SimpleHistoryManager(10);

  #memory = new Uint8Array();
  #memoryOffset = 0;
  #outerMemoryLength = 0;

  #address = -1;
  #highlightInfo?: HighlightInfo;

  #currentNavigatorMode = Mode.Submitted;
  #currentNavigatorAddressLine = `${this.#address}`;

  #numBytesPerPage = 4;

  #valueTypeModes = getDefaultValueTypeMapping();
  #valueTypes = new Set(this.#valueTypeModes.keys());
  #endianness = Endianness.Little;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [linearMemoryInspectorStyles];
  }

  set data(data: LinearMemoryInspectorData) {
    if (data.address < data.memoryOffset || data.address > data.memoryOffset + data.memory.length || data.address < 0) {
      throw new Error('Address is out of bounds.');
    }

    if (data.memoryOffset < 0) {
      throw new Error('Memory offset has to be greater or equal to zero.');
    }

    if (data.highlightInfo) {
      if (data.highlightInfo.size < 0) {
        throw new Error('Object size has to be greater than or equal to zero');
      }
      if (data.highlightInfo.startAddress < 0 || data.highlightInfo.startAddress >= data.outerMemoryLength) {
        throw new Error('Object start address is out of bounds.');
      }
    }

    this.#memory = data.memory;
    this.#memoryOffset = data.memoryOffset;
    this.#outerMemoryLength = data.outerMemoryLength;
    this.#valueTypeModes = data.valueTypeModes || this.#valueTypeModes;
    this.#valueTypes = data.valueTypes || this.#valueTypes;
    this.#endianness = data.endianness || this.#endianness;
    this.#highlightInfo = data.highlightInfo;
    this.#setAddress(data.address);
    this.#render();
  }

  #render(): void {
    const {start, end} = this.#getPageRangeForAddress(this.#address, this.#numBytesPerPage);

    const navigatorAddressToShow = this.#currentNavigatorMode === Mode.Submitted ? formatAddress(this.#address) :
                                                                                   this.#currentNavigatorAddressLine;
    const navigatorAddressIsValid = this.#isValidAddress(navigatorAddressToShow);

    const invalidAddressMsg = i18nString(
        UIStrings.addressHasToBeANumberBetweenSAnd,
        {PH1: formatAddress(0), PH2: formatAddress(this.#outerMemoryLength)});

    const errorMsg = navigatorAddressIsValid ? undefined : invalidAddressMsg;

    const canGoBackInHistory = this.#history.canRollback();
    const canGoForwardInHistory = this.#history.canRollover();

    const highlightedMemoryAreas = this.#highlightInfo ? [this.#highlightInfo] : [];
    const focusedMemoryHighlight = this.#getSmallestEnclosingMemoryHighlight(highlightedMemoryAreas, this.#address);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="view">
        <${LinearMemoryNavigator.litTagName}
          .data=${{address: navigatorAddressToShow, valid: navigatorAddressIsValid, mode: this.#currentNavigatorMode, error: errorMsg, canGoBackInHistory, canGoForwardInHistory} as LinearMemoryNavigatorData}
          @refreshrequested=${this.#onRefreshRequest}
          @addressinputchanged=${this.#onAddressChange}
          @pagenavigation=${this.#navigatePage}
          @historynavigation=${this.#navigateHistory}></${LinearMemoryNavigator.litTagName}>
          <${LinearMemoryHighlightChipList.litTagName}
          .data=${{highlightInfos: highlightedMemoryAreas, focusedMemoryHighlight: focusedMemoryHighlight } as LinearMemoryHighlightChipListData}
          @jumptohighlightedmemory=${this.#onJumpToAddress}>
          </${LinearMemoryHighlightChipList.litTagName}>
        <${LinearMemoryViewer.litTagName}
          .data=${{
            memory: this.#memory.slice(start - this.#memoryOffset,
            end - this.#memoryOffset),
            address: this.#address, memoryOffset: start,
            focus: this.#currentNavigatorMode === Mode.Submitted,
            highlightInfo: this.#highlightInfo,
            focusedMemoryHighlight: focusedMemoryHighlight } as LinearMemoryViewerData}
          @byteselected=${this.#onByteSelected}
          @resize=${this.#resize}>
        </${LinearMemoryViewer.litTagName}>
      </div>
      <div class="value-interpreter">
        <${LinearMemoryValueInterpreter.litTagName}
          .data=${{
            value: this.#memory.slice(this.#address - this.#memoryOffset, this.#address + VALUE_INTEPRETER_MAX_NUM_BYTES).buffer,
            valueTypes: this.#valueTypes,
            valueTypeModes: this.#valueTypeModes,
            endianness: this.#endianness,
            memoryLength: this.#outerMemoryLength } as LinearMemoryValueInterpreterData}
          @valuetypetoggled=${this.#onValueTypeToggled}
          @valuetypemodechanged=${this.#onValueTypeModeChanged}
          @endiannesschanged=${this.#onEndiannessChanged}
          @jumptopointeraddress=${this.#onJumpToAddress}
          >
        </${LinearMemoryValueInterpreter.litTagName}/>
      </div>
      `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }

  #onJumpToAddress(e: JumpToPointerAddressEvent|JumpToHighlightedMemoryEvent): void {
    // Stop event from bubbling up, since no element further up needs the event.
    e.stopPropagation();
    this.#currentNavigatorMode = Mode.Submitted;
    const addressInRange = Math.max(0, Math.min(e.data, this.#outerMemoryLength - 1));
    this.#jumpToAddress(addressInRange);
  }

  #onRefreshRequest(): void {
    const {start, end} = this.#getPageRangeForAddress(this.#address, this.#numBytesPerPage);
    this.dispatchEvent(new MemoryRequestEvent(start, end, this.#address));
  }

  #onByteSelected(e: ByteSelectedEvent): void {
    this.#currentNavigatorMode = Mode.Submitted;
    const addressInRange = Math.max(0, Math.min(e.data, this.#outerMemoryLength - 1));
    this.#jumpToAddress(addressInRange);
  }

  #createSettings(): Settings {
    return {valueTypes: this.#valueTypes, modes: this.#valueTypeModes, endianness: this.#endianness};
  }

  #onEndiannessChanged(e: EndiannessChangedEvent): void {
    this.#endianness = e.data;
    this.dispatchEvent(new SettingsChangedEvent(this.#createSettings()));
    this.#render();
  }

  #isValidAddress(address: string): boolean {
    const newAddress = parseAddress(address);
    return newAddress !== undefined && newAddress >= 0 && newAddress < this.#outerMemoryLength;
  }

  #onAddressChange(e: AddressInputChangedEvent): void {
    const {address, mode} = e.data;
    const isValid = this.#isValidAddress(address);
    const newAddress = parseAddress(address);
    this.#currentNavigatorAddressLine = address;

    if (newAddress !== undefined && isValid) {
      this.#currentNavigatorMode = mode;
      this.#jumpToAddress(newAddress);
      return;
    }

    if (mode === Mode.Submitted && !isValid) {
      this.#currentNavigatorMode = Mode.InvalidSubmit;
    } else {
      this.#currentNavigatorMode = Mode.Edit;
    }

    this.#render();
  }

  #onValueTypeToggled(e: ValueTypeToggledEvent): void {
    const {type, checked} = e.data;
    if (checked) {
      this.#valueTypes.add(type);
    } else {
      this.#valueTypes.delete(type);
    }
    this.dispatchEvent(new SettingsChangedEvent(this.#createSettings()));
    this.#render();
  }

  #onValueTypeModeChanged(e: ValueTypeModeChangedEvent): void {
    e.stopImmediatePropagation();
    const {type, mode} = e.data;
    this.#valueTypeModes.set(type, mode);
    this.dispatchEvent(new SettingsChangedEvent(this.#createSettings()));
    this.#render();
  }

  #navigateHistory(e: HistoryNavigationEvent): boolean {
    return e.data === Navigation.Forward ? this.#history.rollover() : this.#history.rollback();
  }

  #navigatePage(e: PageNavigationEvent): void {
    const newAddress =
        e.data === Navigation.Forward ? this.#address + this.#numBytesPerPage : this.#address - this.#numBytesPerPage;
    const addressInRange = Math.max(0, Math.min(newAddress, this.#outerMemoryLength - 1));
    this.#jumpToAddress(addressInRange);
  }

  #jumpToAddress(address: number): void {
    if (address < 0 || address >= this.#outerMemoryLength) {
      console.warn(`Specified address is out of bounds: ${address}`);
      return;
    }
    this.#setAddress(address);
    this.#update();
  }

  #getPageRangeForAddress(address: number, numBytesPerPage: number): {start: number, end: number} {
    const pageNumber = Math.floor(address / numBytesPerPage);
    const pageStartAddress = pageNumber * numBytesPerPage;
    const pageEndAddress = Math.min(pageStartAddress + numBytesPerPage, this.#outerMemoryLength);
    return {start: pageStartAddress, end: pageEndAddress};
  }

  #resize(event: ResizeEvent): void {
    this.#numBytesPerPage = event.data;
    this.#update();
  }

  #update(): void {
    const {start, end} = this.#getPageRangeForAddress(this.#address, this.#numBytesPerPage);
    if (start < this.#memoryOffset || end > this.#memoryOffset + this.#memory.length) {
      this.dispatchEvent(new MemoryRequestEvent(start, end, this.#address));
    } else {
      this.#render();
    }
  }

  #setAddress(address: number): void {
    // If we are already showing the address that is requested, no need to act upon it.
    if (this.#address === address) {
      return;
    }
    const historyEntry = new AddressHistoryEntry(address, () => this.#jumpToAddress(address));
    this.#history.push(historyEntry);
    this.#address = address;
    this.dispatchEvent(new AddressChangedEvent(this.#address));
  }

  // Returns the highlightInfo with the smallest size property that encloses the provided address.
  // If there are multiple smallest enclosing highlights, we pick the one appearing the earliest in highlightedMemoryAreas.
  // If no such highlightInfo exists, it returns undefined.
  //
  // Selecting the smallest enclosing memory highlight is a heuristic that aims to pick the
  // most specific highlight given a provided address. This way, objects contained in other objects are
  // potentially still accessible.
  #getSmallestEnclosingMemoryHighlight(highlightedMemoryAreas: HighlightInfo[], address: number): HighlightInfo
      |undefined {
    let smallestEnclosingHighlight;
    for (const highlightedMemory of highlightedMemoryAreas) {
      if (highlightedMemory.startAddress <= address &&
          address < highlightedMemory.startAddress + highlightedMemory.size) {
        if (!smallestEnclosingHighlight) {
          smallestEnclosingHighlight = highlightedMemory;
        } else if (highlightedMemory.size < smallestEnclosingHighlight.size) {
          smallestEnclosingHighlight = highlightedMemory;
        }
      }
    }
    return smallestEnclosingHighlight;
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-linear-memory-inspector-inspector', LinearMemoryInspector);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-inspector': LinearMemoryInspector;
  }

  interface HTMLElementEventMap {
    'memoryrequest': MemoryRequestEvent;
    'addresschanged': AddressChangedEvent;
    'settingschanged': SettingsChangedEvent;
    'deletememoryhighlight': DeleteMemoryHighlightEvent;
  }
}
