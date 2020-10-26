// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './LinearMemoryNavigator.js';
import './LinearMemoryViewer.js';

import * as LitHtml from '../third_party/lit-html/lit-html.js';

const {render, html} = LitHtml;

import type {LinearMemoryNavigatorData} from './LinearMemoryNavigator.js';
import {LinearMemoryViewerData} from './LinearMemoryViewer.js';

export interface LinearMemoryInspectorData {
  memory: Uint8Array;
  address: number;
}

export class LinearMemoryInspector extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
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
          display: flex;
          flex: auto;
          flex-wrap: wrap;
          flex-direction: column;
          font-family: monospace;
          padding: 9px 12px 9px 7px;
        }

        devtools-linear-memory-inspector-navigator + devtools-linear-memory-inspector-viewer {
          margin-top: 12px;
        }
      </style>
      <div class="memory-inspector">
        <devtools-linear-memory-inspector-navigator .data=${{address: this.address} as LinearMemoryNavigatorData}></devtools-linear-memory-inspector-navigator>
        <devtools-linear-memory-inspector-viewer .data=${{memory: this.memory, address: this.address} as LinearMemoryViewerData}></devtools-linear-memory-inspector-viewer>
      </div>
      `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-linear-memory-inspector-inspector', LinearMemoryInspector);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-inspector': LinearMemoryInspector;
  }
}
