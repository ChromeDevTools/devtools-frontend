// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../elements/Icon.js';

import * as Elements from '../elements/elements.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {toHexString} from './LinearMemoryInspectorUtils.js';

const {render, html} = LitHtml;

export const enum Navigation {
  Backward = 'Backward',
  Forward = 'Forward'
}

export class PageNavigationEvent extends Event {
  data: Navigation

  constructor(navigation: Navigation) {
    super('page-navigation', {});
    this.data = navigation;
  }
}

export class HistoryNavigationEvent extends Event {
  data: Navigation

  constructor(navigation: Navigation) {
    super('history-navigation', {});
    this.data = navigation;
  }
}

export class RefreshEvent extends Event {
  constructor() {
    super('refresh', {});
  }
}

export interface LinearMemoryNavigatorData {
  address: number;
}

export class LinearMemoryNavigator extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private address: number = 0;

  set data(data: LinearMemoryNavigatorData) {
    this.address = data.address;
    this.render();
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        .navigator {
          min-height: 24px;
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          overflow: hidden;
          align-items: center;
        }

        input {
          text-align: center;
        }

        .navigator-button {
          background: transparent;
          overflow: hidden;
          vertical-align: middle;
          border: none;
          padding: 0px;
        }
      </style>
      <div class="navigator">
        <div>
          ${this.createButton('ic_undo_16x16_icon', new HistoryNavigationEvent(Navigation.Backward))}
          ${this.createButton('ic_redo_16x16_icon', new HistoryNavigationEvent(Navigation.Forward))}
        </div>
        <div>
          ${this.createButton('ic_page_prev_16x16_icon', new PageNavigationEvent(Navigation.Backward))}
          <input data-input="true" contenteditable="true" value="0x${toHexString(this.address, 8)}"/>
          ${this.createButton('ic_page_next_16x16_icon', new PageNavigationEvent(Navigation.Forward))}
        </div>
        ${this.createButton('refresh_12x12_icon', new RefreshEvent())}
      </div>
      `, this.shadow, {eventContext: this});
    // clang-format on
  }

  private createButton(name: string, event: Event) {
    return html`
      <button class="navigator-button" data-button=${event.type} @click=${this.dispatchEvent.bind(this, event)}>
        <devtools-icon .data=${
        {iconName: name, color: 'rgb(110 110 110)', width: '16px'} as Elements.Icon.IconWithName}>
        </devtools-icon>
      </button>`;
  }
}

customElements.define('devtools-linear-memory-inspector-navigator', LinearMemoryNavigator);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-navigator': LinearMemoryNavigator;
  }
}
