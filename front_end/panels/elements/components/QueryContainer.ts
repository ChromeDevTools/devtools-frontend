// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import type {DOMNode} from './Helper.js';
import {NodeText} from './NodeText.js';
import type {NodeTextData} from './NodeText.js';
import queryContainerStyles from './queryContainer.css.js';

const {render, html} = LitHtml;
export interface QueryContainerData {
  container: DOMNode;
  queryName?: string;
  onContainerLinkClick: (event: Event) => void;
}

export class QueryContainer extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-query-container`;

  private readonly shadow = this.attachShadow({mode: 'open'});
  private queryName?: string;
  private container?: DOMNode;
  private onContainerLinkClick?: (event: Event) => void;

  set data(data: QueryContainerData) {
    this.queryName = data.queryName;
    this.container = data.container;
    this.onContainerLinkClick = data.onContainerLinkClick;
    this.render();
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [queryContainerStyles];
  }

  private onContainerLinkMouseEnter(): void {
    this.container?.highlightNode('container-outline');
  }

  private onContainerLinkMouseLeave(): void {
    this.container?.clearHighlight();
  }

  private render(): void {
    if (!this.container) {
      return;
    }

    let idToDisplay, classesToDisplay;
    if (!this.queryName) {
      idToDisplay = this.container.getAttribute('id');
      classesToDisplay = this.container.getAttribute('class')?.split(/\s+/).filter(Boolean);
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <a href="#"
        draggable=false
        class="container-link"
        @click=${this.onContainerLinkClick}
        @mouseenter=${this.onContainerLinkMouseEnter}
        @mouseleave=${this.onContainerLinkMouseLeave}
      ><${NodeText.litTagName}
          data-node-title=${this.queryName}
          .data=${{
        nodeTitle: this.queryName,
        nodeId: idToDisplay,
        nodeClasses: classesToDisplay,
      } as NodeTextData}></${NodeText.litTagName}></a>
    `, this.shadow, {
      host: this,
    });
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-query-container', QueryContainer);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-query-container': QueryContainer;
  }
}
