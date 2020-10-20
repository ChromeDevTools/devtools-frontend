// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './LinearMemoryNavigator.js';

import * as LitHtml from '../third_party/lit-html/lit-html.js';

const {render, html} = LitHtml;

import type {LinearMemoryNavigatorData} from './LinearMemoryNavigator.js';

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
        .memory-inspector {
          font-family: monospace;
          padding: 9px 12px 9px 7px;
        }
      </style>
      <div class="memory-inspector">
        <devtools-linear-memory-inspector-navigator .data=${{address: this.address} as LinearMemoryNavigatorData}></devtools-linear-memory-inspector-navigator>
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
