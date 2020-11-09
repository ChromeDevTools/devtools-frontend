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
import {LinearMemoryValueInterpreterData} from './LinearMemoryValueInterpreter.js';
import {ByteSelectedEvent, LinearMemoryViewer, LinearMemoryViewerData} from './LinearMemoryViewer.js';
import {VALUE_INTEPRETER_MAX_NUM_BYTES, ValueType, Endianness} from './ValueInterpreterDisplayUtils.js';

export interface LinearMemoryInspectorData {
  memory: Uint8Array;
  address: number;
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

export class LinearMemoryInspector extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private readonly history = new Common.SimpleHistoryManager.SimpleHistoryManager(10);
  private memory = new Uint8Array();
  private address = 0;

  set data(data: LinearMemoryInspectorData) {
    this.memory = data.memory;
    this.address = data.address;
    this.render();
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        :host {
          flex: auto;
          display: flex;
        }

        .memory-inspector {
          width: 100%;
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
          .data=${{memory: this.memory, address: this.address} as LinearMemoryViewerData}
          @byte-selected=${(e: ByteSelectedEvent) => this.jumpToAddress(e.data)}></devtools-linear-memory-inspector-viewer>
      </div>
        <devtools-linear-memory-inspector-interpreter .data=${{
            value: this.memory.slice(this.address, this.address + VALUE_INTEPRETER_MAX_NUM_BYTES).buffer,
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
    const viewer = this.shadow.querySelector<LinearMemoryViewer>('devtools-linear-memory-inspector-viewer');
    if (!viewer) {
      return;
    }

    const newAddress = e.data === Navigation.Forward ?
        Math.min(this.address + viewer.getNumBytesPerPage(), this.memory.length - 1) :
        Math.max(this.address - viewer.getNumBytesPerPage(), 0);
    this.jumpToAddress(newAddress);
  }

  private jumpToAddress(address: number) {
    const historyEntry = new AddressHistoryEntry(address, x => this.jumpToAddress(x));
    this.history.push(historyEntry);

    this.address = address;
    this.render();
  }
}

customElements.define('devtools-linear-memory-inspector-inspector', LinearMemoryInspector);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-inspector': LinearMemoryInspector;
  }
}
