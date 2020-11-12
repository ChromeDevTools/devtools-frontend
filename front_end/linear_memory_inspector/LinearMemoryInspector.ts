// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './LinearMemoryNavigator.js';
import './LinearMemoryValueInterpreter.js';
import './LinearMemoryViewer.js';

import * as Common from '../common/common.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

const {render, html} = LitHtml;

import {HistoryNavigationEvent, LinearMemoryNavigatorData, Navigation, PageNavigationEvent} from './LinearMemoryNavigator.js';
import type {LinearMemoryValueInterpreterData} from './LinearMemoryValueInterpreter.js';
import type {ByteSelectedEvent, LinearMemoryViewerData, ResizeEvent} from './LinearMemoryViewer.js';
import {VALUE_INTEPRETER_MAX_NUM_BYTES, ValueType, Endianness} from './ValueInterpreterDisplayUtils.js';

export interface LinearMemoryInspectorData {
  memory: Uint8Array;
  address: number;
  memoryOffset: number;
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

  valid() {
    return true;
  }

  reveal() {
    this.callback(this.address);
  }
}

export class MemoryRequestEvent extends Event {
  data: {start: number, end: number, address: number};

  constructor(start: number, end: number, address: number) {
    super('memoryRequest');
    this.data = {start, end, address};
  }
}

export class LinearMemoryInspector extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private readonly history = new Common.SimpleHistoryManager.SimpleHistoryManager(10);
  private memory = new Uint8Array();
  private memoryOffset = 0;
  private address = 0;
  private numBytesPerPage = 4;

  set data(data: LinearMemoryInspectorData) {
    if (data.address < data.memoryOffset || data.address > data.memoryOffset + data.memory.length || data.address < 0) {
      throw new Error('Address is out of bounds.');
    }

    if (data.memoryOffset < 0) {
      throw new Error('Memory offset has to be greater or equal to zero.');
    }

    this.memory = data.memory;
    this.address = data.address;
    this.memoryOffset = data.memoryOffset;
    this.render();
  }

  private render() {
    const {start, end} = this.getPageRangeForAddress(this.address, this.numBytesPerPage);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        :host {
          flex: auto;
          display: flex;
        }

        .memory-inspector {
          display: flex;
          flex: auto;
          flex-direction: column;
          font-family: monospace;
          padding: 9px 12px 9px 7px;
        }

        devtools-linear-memory-inspector-navigator + devtools-linear-memory-inspector-viewer {
          margin-top: 12px;
        }
      </style>
      <div class="memory-inspector">
        <devtools-linear-memory-inspector-navigator
          .data=${{address: this.address} as LinearMemoryNavigatorData}
          @page-navigation=${this.navigatePage}
          @history-navigation=${this.navigateHistory}></devtools-linear-memory-inspector-navigator>
        <devtools-linear-memory-inspector-viewer
          .data=${{memory: this.memory.slice(start - this.memoryOffset, end - this.memoryOffset), address: this.address, memoryOffset: start} as LinearMemoryViewerData}
          @byte-selected=${(e: ByteSelectedEvent) => this.jumpToAddress(e.data)}
          @resize=${this.resize}>
        </devtools-linear-memory-inspector-viewer>
      </div>
      <devtools-linear-memory-inspector-interpreter .data=${{
        value: this.memory.slice(this.address - this.memoryOffset, this.address + VALUE_INTEPRETER_MAX_NUM_BYTES).buffer,
        valueTypes: [ValueType.Int8, ValueType.Int16, ValueType.Int64],
        endianness: Endianness.Little } as LinearMemoryValueInterpreterData}>
      </devtools-linear-memory-inspector-interpreter/>
      `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }

  private navigateHistory(e: HistoryNavigationEvent) {
    return e.data === Navigation.Forward ? this.history.rollover() : this.history.rollback();
  }

  private navigatePage(e: PageNavigationEvent) {
    const newAddress = e.data === Navigation.Forward ? this.address + this.numBytesPerPage :
                                                       Math.max(this.address - this.numBytesPerPage, 0);
    this.jumpToAddress(newAddress);
  }

  private jumpToAddress(address: number) {
    const historyEntry = new AddressHistoryEntry(address, x => this.jumpToAddress(x));
    this.history.push(historyEntry);
    this.address = address;
    this.update();
  }

  private getPageRangeForAddress(address: number, numBytesPerPage: number) {
    const pageNumber = Math.floor(address / numBytesPerPage);
    const pageStartAddress = pageNumber * numBytesPerPage;
    return {start: pageStartAddress, end: pageStartAddress + numBytesPerPage};
  }

  private resize(event: ResizeEvent) {
    this.numBytesPerPage = event.data;
    this.update();
  }

  private update() {
    const {start, end} = this.getPageRangeForAddress(this.address, this.numBytesPerPage);
    if (start < this.memoryOffset || end > this.memoryOffset + this.memory.length) {
      this.dispatchEvent(new MemoryRequestEvent(start, end, this.address));
    } else {
      this.render();
    }
  }
}

customElements.define('devtools-linear-memory-inspector-inspector', LinearMemoryInspector);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-inspector': LinearMemoryInspector;
  }
}
