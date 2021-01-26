// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './LinearMemoryNavigator.js';
import './LinearMemoryValueInterpreter.js';
import './LinearMemoryViewer.js';

import * as Common from '../common/common.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

const ls = Common.ls;
const {render, html} = LitHtml;

import {Mode, AddressInputChangedEvent, HistoryNavigationEvent, LinearMemoryNavigatorData, Navigation, PageNavigationEvent} from './LinearMemoryNavigator.js';
import type {EndiannessChangedEvent, LinearMemoryValueInterpreterData, ValueTypeToggledEvent} from './LinearMemoryValueInterpreter.js';
import type {ByteSelectedEvent, LinearMemoryViewerData, ResizeEvent} from './LinearMemoryViewer.js';
import {VALUE_INTEPRETER_MAX_NUM_BYTES, ValueType, Endianness} from './ValueInterpreterDisplayUtils.js';
import {formatAddress, parseAddress} from './LinearMemoryInspectorUtils.js';

// If the LinearMemoryInspector only receives a portion
// of the original Uint8Array to show, it requires information
// on the 1. memoryOffset (at which index this portion starts),
// and on the 2. outerMemoryLength (length of the original Uint8Array).
export interface LinearMemoryInspectorData {
  memory: Uint8Array;
  address: number;
  memoryOffset: number;
  outerMemoryLength: number;
}

class AddressHistoryEntry implements Common.SimpleHistoryManager.HistoryEntry {
  private address = 0;
  private callback;

  constructor(address: number, callback: (x: number) => void) {
    if (address < 0) {
      throw new Error('Address should be a greater or equal to zero');
    }
    this.address = address;
    this.callback = callback;
  }

  valid(): boolean {
    return true;
  }

  reveal(): void {
    this.callback(this.address);
  }
}

export class MemoryRequestEvent extends Event {
  data: {start: number, end: number, address: number};

  constructor(start: number, end: number, address: number) {
    super('memory-request');
    this.data = {start, end, address};
  }
}

export class AddressChangedEvent extends Event {
  data: number;

  constructor(address: number) {
    super('address-changed');
    this.data = address;
  }
}

export class LinearMemoryInspector extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private readonly history = new Common.SimpleHistoryManager.SimpleHistoryManager(10);

  private memory = new Uint8Array();
  private memoryOffset = 0;
  private outerMemoryLength = 0;

  private address = 0;

  private currentNavigatorMode = Mode.Submitted;
  private currentNavigatorAddressLine = `${this.address}`;

  private numBytesPerPage = 4;

  private valueTypes: Set<ValueType> = new Set([ValueType.Int8, ValueType.Float32]);
  private endianness: Endianness = Endianness.Little;

  set data(data: LinearMemoryInspectorData) {
    if (data.address < data.memoryOffset || data.address > data.memoryOffset + data.memory.length || data.address < 0) {
      throw new Error('Address is out of bounds.');
    }

    if (data.memoryOffset < 0) {
      throw new Error('Memory offset has to be greater or equal to zero.');
    }

    this.memory = data.memory;
    this.memoryOffset = data.memoryOffset;
    this.outerMemoryLength = data.outerMemoryLength;
    this.setAddress(data.address);
    this.render();
  }

  private render(): void {
    const {start, end} = this.getPageRangeForAddress(this.address, this.numBytesPerPage);

    const navigatorAddressToShow =
        this.currentNavigatorMode === Mode.Submitted ? formatAddress(this.address) : this.currentNavigatorAddressLine;
    const navigatorAddressIsValid = this.isValidAddress(navigatorAddressToShow);

    const invalidAddressMsg =
        ls`Address has to be a number between ${formatAddress(0)} and ${formatAddress(this.outerMemoryLength)}`;
    const errorMsg = navigatorAddressIsValid ? undefined : invalidAddressMsg;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        :host {
          flex: auto;
          display: flex;
        }

        .view {
          width: 100%;
          display: flex;
          flex: 1;
          flex-direction: column;
          font-family: monospace;
          padding: 9px 12px 9px 7px;
        }

        devtools-linear-memory-inspector-navigator + devtools-linear-memory-inspector-viewer {
          margin-top: 12px;
        }

        .value-interpreter {
          display: flex;
        }
      </style>
      <div class="view">
        <devtools-linear-memory-inspector-navigator
          .data=${{address: navigatorAddressToShow, valid: navigatorAddressIsValid, mode: this.currentNavigatorMode, error: errorMsg} as LinearMemoryNavigatorData}
          @refresh-requested=${this.onRefreshRequest}
          @address-input-changed=${this.onAddressChange}
          @page-navigation=${this.navigatePage}
          @history-navigation=${this.navigateHistory}></devtools-linear-memory-inspector-navigator>
        <devtools-linear-memory-inspector-viewer
          .data=${{memory: this.memory.slice(start - this.memoryOffset, end - this.memoryOffset), address: this.address, memoryOffset: start, focus: this.currentNavigatorMode === Mode.Submitted} as LinearMemoryViewerData}
          @byte-selected=${this.onByteSelected}
          @resize=${this.resize}>
        </devtools-linear-memory-inspector-viewer>
      </div>
      <div class="value-interpreter">
        <devtools-linear-memory-inspector-interpreter
          .data=${{
            value: this.memory.slice(this.address - this.memoryOffset, this.address + VALUE_INTEPRETER_MAX_NUM_BYTES).buffer,
            valueTypes: this.valueTypes,
            endianness: this.endianness } as LinearMemoryValueInterpreterData}
          @value-type-toggled=${this.onValueTypeToggled}
          @endianness-changed=${this.onEndiannessChanged}>
        </devtools-linear-memory-inspector-interpreter/>
      </div>
      `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }

  private onRefreshRequest(): void {
    const {start, end} = this.getPageRangeForAddress(this.address, this.numBytesPerPage);
    this.dispatchEvent(new MemoryRequestEvent(start, end, this.address));
  }

  private onByteSelected(e: ByteSelectedEvent): void {
    this.currentNavigatorMode = Mode.Submitted;
    const addressInRange = Math.max(0, Math.min(e.data, this.outerMemoryLength - 1));
    this.jumpToAddress(addressInRange);
  }

  private onEndiannessChanged(e: EndiannessChangedEvent): void {
    this.endianness = e.data;
    this.render();
  }

  private isValidAddress(address: string): boolean {
    const newAddress = parseAddress(address);
    return newAddress !== undefined && newAddress >= 0 && newAddress < this.outerMemoryLength;
  }

  private onAddressChange(e: AddressInputChangedEvent): void {
    const {address, mode} = e.data;
    const isValid = this.isValidAddress(address);
    const newAddress = parseAddress(address);
    this.currentNavigatorAddressLine = address;

    if (newAddress !== undefined && isValid) {
      this.currentNavigatorMode = mode;
      this.jumpToAddress(newAddress);
      return;
    }

    if (mode === Mode.Submitted && !isValid) {
      this.currentNavigatorMode = Mode.InvalidSubmit;
    } else {
      this.currentNavigatorMode = Mode.Edit;
    }

    this.render();
  }

  private onValueTypeToggled(e: ValueTypeToggledEvent): void {
    const {type, checked} = e.data;
    if (checked) {
      this.valueTypes.add(type);
    } else {
      this.valueTypes.delete(type);
    }
    this.render();
  }

  private navigateHistory(e: HistoryNavigationEvent): boolean {
    return e.data === Navigation.Forward ? this.history.rollover() : this.history.rollback();
  }

  private navigatePage(e: PageNavigationEvent): void {
    const newAddress =
        e.data === Navigation.Forward ? this.address + this.numBytesPerPage : this.address - this.numBytesPerPage;
    const addressInRange = Math.max(0, Math.min(newAddress, this.outerMemoryLength - 1));
    this.jumpToAddress(addressInRange);
  }

  private jumpToAddress(address: number): void {
    if (address < 0 || address >= this.outerMemoryLength) {
      console.warn(`Specified address is out of bounds: ${address}`);
      return;
    }
    this.setAddress(address);
    this.update();
  }

  private getPageRangeForAddress(address: number, numBytesPerPage: number): {start: number, end: number} {
    const pageNumber = Math.floor(address / numBytesPerPage);
    const pageStartAddress = pageNumber * numBytesPerPage;
    const pageEndAddress = Math.min(pageStartAddress + numBytesPerPage, this.outerMemoryLength);
    return {start: pageStartAddress, end: pageEndAddress};
  }

  private resize(event: ResizeEvent): void {
    this.numBytesPerPage = event.data;
    this.update();
  }

  private update(): void {
    const {start, end} = this.getPageRangeForAddress(this.address, this.numBytesPerPage);
    if (start < this.memoryOffset || end > this.memoryOffset + this.memory.length) {
      this.dispatchEvent(new MemoryRequestEvent(start, end, this.address));
    } else {
      this.render();
    }
  }

  private setAddress(address: number): void {
    const historyEntry = new AddressHistoryEntry(address, () => this.jumpToAddress(address));
    this.history.push(historyEntry);
    this.address = address;
    this.dispatchEvent(new AddressChangedEvent(this.address));
  }
}

customElements.define('devtools-linear-memory-inspector-inspector', LinearMemoryInspector);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-inspector': LinearMemoryInspector;
  }
}
