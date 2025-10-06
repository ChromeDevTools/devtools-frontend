// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './LinearMemoryValueInterpreter.js';
import './LinearMemoryHighlightChipList.js';
import './LinearMemoryViewer.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../../ui/lit/lit.js';

import type {DeleteMemoryHighlightEvent, JumpToHighlightedMemoryEvent} from './LinearMemoryHighlightChipList.js';
import linearMemoryInspectorStyles from './linearMemoryInspector.css.js';
import {formatAddress, parseAddress} from './LinearMemoryInspectorUtils.js';
import {
  type AddressInputChangedEvent,
  type HistoryNavigationEvent,
  Mode,
  Navigation,
  type PageNavigationEvent,
} from './LinearMemoryNavigator.js';
import type {EndiannessChangedEvent, ValueTypeToggledEvent} from './LinearMemoryValueInterpreter.js';
import type {ByteSelectedEvent, ResizeEvent} from './LinearMemoryViewer.js';
import type {HighlightInfo} from './LinearMemoryViewerUtils.js';
import type {JumpToPointerAddressEvent, ValueTypeModeChangedEvent} from './ValueInterpreterDisplay.js';
import {
  Endianness,
  getDefaultValueTypeMapping,
  VALUE_INTEPRETER_MAX_NUM_BYTES,
  type ValueType,
  type ValueTypeMode,
} from './ValueInterpreterDisplayUtils.js';

const UIStrings = {
  /**
   * @description Tooltip text that appears when hovering over an invalid address in the address line in the Linear memory inspector
   * @example {0x00000000} PH1
   * @example {0x00400000} PH2
   */
  addressHasToBeANumberBetweenSAnd: 'Address has to be a number between {PH1} and {PH2}',
} as const;
const str_ =
    i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/LinearMemoryInspector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * If the LinearMemoryInspector only receives a portion
 * of the original Uint8Array to show, it requires information
 * on the 1. memoryOffset (at which index this portion starts),
 * and on the 2. outerMemoryLength (length of the original Uint8Array).
 **/
export interface LinearMemoryInspectorData {
  memory: Uint8Array<ArrayBuffer>;
  address: number;
  memoryOffset: number;
  outerMemoryLength: number;
  valueTypes?: Set<ValueType>;
  valueTypeModes?: Map<ValueType, ValueTypeMode>;
  endianness?: Endianness;
  highlightInfo?: HighlightInfo;
  hideValueInspector?: boolean;
}

export interface Settings {
  valueTypes: Set<ValueType>;
  modes: Map<ValueType, ValueTypeMode>;
  endianness: Endianness;
}

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

export interface ViewInput {
  memory: Uint8Array;
  address: number;
  memoryOffset: number;
  outerMemoryLength: number;
  valueTypes: Set<ValueType>;
  valueTypeModes: Map<ValueType, ValueTypeMode>;
  endianness: Endianness;
  highlightInfo?: HighlightInfo;
  hideValueInspector: boolean;
  currentNavigatorMode: Mode;
  currentNavigatorAddressLine: string;
  canGoBackInHistory: boolean;
  canGoForwardInHistory: boolean;
  onRefreshRequest: () => void;
  onAddressChange: (e: AddressInputChangedEvent) => void;
  onNavigatePage: (e: PageNavigationEvent) => void;
  onNavigateHistory: (e: HistoryNavigationEvent) => boolean;
  onJumpToAddress: (e: JumpToPointerAddressEvent|JumpToHighlightedMemoryEvent) => void;
  onByteSelected: (e: ByteSelectedEvent) => void;
  onResize: (e: ResizeEvent) => void;
  onValueTypeToggled: (e: ValueTypeToggledEvent) => void;
  onValueTypeModeChanged: (e: ValueTypeModeChangedEvent) => void;
  onEndiannessChanged: (e: EndiannessChangedEvent) => void;
  memorySlice: Uint8Array<ArrayBuffer>;
  viewerStart: number;
}

export const DEFAULT_VIEW = (input: ViewInput, _output: Record<string, unknown>, target: HTMLElement): void => {
  const navigatorAddressToShow =
      input.currentNavigatorMode === Mode.SUBMITTED ? formatAddress(input.address) : input.currentNavigatorAddressLine;
  const navigatorAddressIsValid = isValidAddress(navigatorAddressToShow, input.outerMemoryLength);

  const invalidAddressMsg = i18nString(
      UIStrings.addressHasToBeANumberBetweenSAnd, {PH1: formatAddress(0), PH2: formatAddress(input.outerMemoryLength)});

  const errorMsg = navigatorAddressIsValid ? undefined : invalidAddressMsg;

  const highlightedMemoryAreas = input.highlightInfo ? [input.highlightInfo] : [];
  const focusedMemoryHighlight = getSmallestEnclosingMemoryHighlight(highlightedMemoryAreas, input.address);
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  render(html`
    <style>${linearMemoryInspectorStyles}</style>
    <div class="view">
      <devtools-linear-memory-inspector-navigator
        .data=${
      {
        address: navigatorAddressToShow,
        valid: navigatorAddressIsValid,
        mode: input.currentNavigatorMode,
        error: errorMsg,
        canGoBackInHistory: input.canGoBackInHistory,
        canGoForwardInHistory: input.canGoForwardInHistory,
      }}
        @refreshrequested=${input.onRefreshRequest}
        @addressinputchanged=${input.onAddressChange}
        @pagenavigation=${input.onNavigatePage}
        @historynavigation=${input.onNavigateHistory}></devtools-linear-memory-inspector-navigator>
        <devtools-linear-memory-highlight-chip-list
        .data=${{highlightInfos: highlightedMemoryAreas, focusedMemoryHighlight}}
        @jumptohighlightedmemory=${input.onJumpToAddress}>
        </devtools-linear-memory-highlight-chip-list>
      <devtools-linear-memory-inspector-viewer
        .data=${
      {
        memory: input.memorySlice,
        address: input.address,
        memoryOffset: input.viewerStart,
        focus: input.currentNavigatorMode === Mode.SUBMITTED,
        highlightInfo: input.highlightInfo,
        focusedMemoryHighlight,
      }}
        @byteselected=${input.onByteSelected}
        @resize=${input.onResize}>
      </devtools-linear-memory-inspector-viewer>
    </div>
    ${
      input.hideValueInspector ? nothing : html`
    <div class="value-interpreter">
      <devtools-linear-memory-inspector-interpreter
        .data=${
          {
            value: input.memory
                       .slice(
                           input.address - input.memoryOffset,
                           input.address + VALUE_INTEPRETER_MAX_NUM_BYTES,
                           )
                       .buffer,
            valueTypes: input.valueTypes,
            valueTypeModes: input.valueTypeModes,
            endianness: input.endianness,
            memoryLength: input.outerMemoryLength,
          }}
        @valuetypetoggled=${input.onValueTypeToggled}
        @valuetypemodechanged=${input.onValueTypeModeChanged}
        @endiannesschanged=${input.onEndiannessChanged}
        @jumptopointeraddress=${input.onJumpToAddress}
        >
      </devtools-linear-memory-inspector-interpreter/>
    </div>`}
    `,
         target);
  // clang-format on
};

function getPageRangeForAddress(
    address: number, numBytesPerPage: number, outerMemoryLength: number): {start: number, end: number} {
  const pageNumber = Math.floor(address / numBytesPerPage);
  const pageStartAddress = pageNumber * numBytesPerPage;
  const pageEndAddress = Math.min(pageStartAddress + numBytesPerPage, outerMemoryLength);
  return {start: pageStartAddress, end: pageEndAddress};
}

function isValidAddress(address: string, outerMemoryLength: number): boolean {
  const newAddress = parseAddress(address);
  return newAddress !== undefined && newAddress >= 0 && newAddress < outerMemoryLength;
}

// Returns the highlightInfo with the smallest size property that encloses the provided address.
// If there are multiple smallest enclosing highlights, we pick the one appearing the earliest in highlightedMemoryAreas.
// If no such highlightInfo exists, it returns undefined.
//
// Selecting the smallest enclosing memory highlight is a heuristic that aims to pick the
// most specific highlight given a provided address. This way, objects contained in other objects are
// potentially still accessible.
function getSmallestEnclosingMemoryHighlight(highlightedMemoryAreas: HighlightInfo[], address: number): HighlightInfo|
    undefined {
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

export type View = typeof DEFAULT_VIEW;

export class LinearMemoryInspector extends UI.Widget.Widget {
  readonly #history = new Common.SimpleHistoryManager.SimpleHistoryManager(10);

  #memory = new Uint8Array();
  #memoryOffset = 0;
  #outerMemoryLength = 0;

  #address = -1;
  #highlightInfo?: HighlightInfo;

  #currentNavigatorMode = Mode.SUBMITTED;
  #currentNavigatorAddressLine = `${this.#address}`;

  #numBytesPerPage = 4;

  #valueTypeModes = getDefaultValueTypeMapping();
  #valueTypes = new Set(this.#valueTypeModes.keys());
  #endianness = Endianness.LITTLE;

  #hideValueInspector = false;
  #view: View;

  constructor(element?: HTMLElement, view?: View) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW;
  }

  set memory(value: Uint8Array<ArrayBuffer>) {
    this.#memory = value;
    void this.requestUpdate();
  }

  set memoryOffset(value: number) {
    this.#memoryOffset = value;
    void this.requestUpdate();
  }

  set outerMemoryLength(value: number) {
    this.#outerMemoryLength = value;
    void this.requestUpdate();
  }

  set highlightInfo(value: HighlightInfo|undefined) {
    this.#highlightInfo = value;
    void this.requestUpdate();
  }

  set valueTypeModes(value: Map<ValueType, ValueTypeMode>) {
    this.#valueTypeModes = value;
    void this.requestUpdate();
  }

  set valueTypes(value: Set<ValueType>) {
    this.#valueTypes = value;
    void this.requestUpdate();
  }

  set endianness(value: Endianness) {
    this.#endianness = value;
    void this.requestUpdate();
  }

  set hideValueInspector(value: boolean) {
    this.#hideValueInspector = value;
    void this.requestUpdate();
  }

  get hideValueInspector(): boolean {
    return this.#hideValueInspector;
  }

  override performUpdate(): void {
    const {start, end} = getPageRangeForAddress(this.#address, this.#numBytesPerPage, this.#outerMemoryLength);

    if (start < this.#memoryOffset || end > this.#memoryOffset + this.#memory.length) {
      this.contentElement.dispatchEvent(new MemoryRequestEvent(start, end, this.#address));
      return;
    }

    if (this.#address < this.#memoryOffset || this.#address > this.#memoryOffset + this.#memory.length ||
        this.#address < 0) {
      throw new Error('Address is out of bounds.');
    }

    if (this.#highlightInfo) {
      if (this.#highlightInfo.size < 0) {
        this.#highlightInfo = undefined;
        throw new Error('Object size has to be greater than or equal to zero');
      }
      if (this.#highlightInfo.startAddress < 0 || this.#highlightInfo.startAddress >= this.#outerMemoryLength) {
        this.#highlightInfo = undefined;
        throw new Error('Object start address is out of bounds.');
      }
    }

    const viewInput: ViewInput = {
      memory: this.#memory,
      address: this.#address,
      memoryOffset: this.#memoryOffset,
      outerMemoryLength: this.#outerMemoryLength,
      valueTypes: this.#valueTypes,
      valueTypeModes: this.#valueTypeModes,
      endianness: this.#endianness,
      highlightInfo: this.#highlightInfo,
      hideValueInspector: this.#hideValueInspector,
      currentNavigatorMode: this.#currentNavigatorMode,
      currentNavigatorAddressLine: this.#currentNavigatorAddressLine,
      canGoBackInHistory: this.#history.canRollback(),
      canGoForwardInHistory: this.#history.canRollover(),
      onRefreshRequest: this.#onRefreshRequest.bind(this),
      onAddressChange: this.#onAddressChange.bind(this),
      onNavigatePage: this.#navigatePage.bind(this),
      onNavigateHistory: this.#navigateHistory.bind(this),
      onJumpToAddress: this.#onJumpToAddress.bind(this),
      onByteSelected: this.#onByteSelected.bind(this),
      onResize: this.#resize.bind(this),
      onValueTypeToggled: this.#onValueTypeToggled.bind(this),
      onValueTypeModeChanged: this.#onValueTypeModeChanged.bind(this),
      onEndiannessChanged: this.#onEndiannessChanged.bind(this),
      memorySlice: this.#memory.slice(start - this.#memoryOffset, end - this.#memoryOffset),
      viewerStart: start,
    };
    this.#view(viewInput, {}, this.contentElement);
  }

  #onJumpToAddress(e: JumpToPointerAddressEvent|JumpToHighlightedMemoryEvent): void {
    // Stop event from bubbling up, since no element further up needs the event.
    e.stopPropagation();
    this.#currentNavigatorMode = Mode.SUBMITTED;
    const addressInRange = Math.max(0, Math.min(e.data, this.#outerMemoryLength - 1));
    this.#jumpToAddress(addressInRange);
  }

  #onRefreshRequest(): void {
    const {start, end} = getPageRangeForAddress(this.#address, this.#numBytesPerPage, this.#outerMemoryLength);
    this.contentElement.dispatchEvent(new MemoryRequestEvent(start, end, this.#address));
  }

  #onByteSelected(e: ByteSelectedEvent): void {
    this.#currentNavigatorMode = Mode.SUBMITTED;
    const addressInRange = Math.max(0, Math.min(e.data, this.#outerMemoryLength - 1));
    this.#jumpToAddress(addressInRange);
  }

  #createSettings(): Settings {
    return {valueTypes: this.#valueTypes, modes: this.#valueTypeModes, endianness: this.#endianness};
  }

  #onEndiannessChanged(e: EndiannessChangedEvent): void {
    this.#endianness = e.data;
    this.contentElement.dispatchEvent(new SettingsChangedEvent(this.#createSettings()));
    void this.requestUpdate();
  }

  #onAddressChange(e: AddressInputChangedEvent): void {
    const {address, mode} = e.data;
    const isValid = isValidAddress(address, this.#outerMemoryLength);
    const newAddress = parseAddress(address);
    this.#currentNavigatorAddressLine = address;

    if (newAddress !== undefined && isValid) {
      this.#currentNavigatorMode = mode;
      this.#jumpToAddress(newAddress);
      return;
    }

    if (mode === Mode.SUBMITTED && !isValid) {
      this.#currentNavigatorMode = Mode.INVALID_SUBMIT;
    } else {
      this.#currentNavigatorMode = Mode.EDIT;
    }

    void this.requestUpdate();
  }

  #onValueTypeToggled(e: ValueTypeToggledEvent): void {
    const {type, checked} = e.data;
    if (checked) {
      this.#valueTypes.add(type);
    } else {
      this.#valueTypes.delete(type);
    }
    this.contentElement.dispatchEvent(new SettingsChangedEvent(this.#createSettings()));
    void this.requestUpdate();
  }

  #onValueTypeModeChanged(e: ValueTypeModeChangedEvent): void {
    e.stopImmediatePropagation();
    const {type, mode} = e.data;
    this.#valueTypeModes.set(type, mode);
    this.contentElement.dispatchEvent(new SettingsChangedEvent(this.#createSettings()));
    void this.requestUpdate();
  }

  #navigateHistory(e: HistoryNavigationEvent): boolean {
    return e.data === Navigation.FORWARD ? this.#history.rollover() : this.#history.rollback();
  }

  #navigatePage(e: PageNavigationEvent): void {
    const newAddress =
        e.data === Navigation.FORWARD ? this.#address + this.#numBytesPerPage : this.#address - this.#numBytesPerPage;
    const addressInRange = Math.max(0, Math.min(newAddress, this.#outerMemoryLength - 1));
    this.#jumpToAddress(addressInRange);
  }

  #jumpToAddress(address: number): void {
    if (address < 0 || address >= this.#outerMemoryLength) {
      console.warn(`Specified address is out of bounds: ${address}`);
      return;
    }
    this.address = address;
    void this.requestUpdate();
  }

  #resize(event: ResizeEvent): void {
    this.#numBytesPerPage = event.data;
    void this.requestUpdate();
  }

  set address(address: number) {
    // If we are already showing the address that is requested, no need to act upon it.
    if (this.#address === address) {
      return;
    }
    const historyEntry = new AddressHistoryEntry(address, () => this.#jumpToAddress(address));
    this.#history.push(historyEntry);
    this.#address = address;
    this.contentElement.dispatchEvent(new AddressChangedEvent(this.#address));
    void this.requestUpdate();
  }
}

declare global {
  interface HTMLElementEventMap {
    memoryrequest: MemoryRequestEvent;
    addresschanged: AddressChangedEvent;
    settingschanged: SettingsChangedEvent;
    deletememoryhighlight: DeleteMemoryHighlightEvent;
  }
}
