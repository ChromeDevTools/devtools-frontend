// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as NodeText from '../../../ui/components/node_text/node_text.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {type DOMNode} from './Helper.js';
import queryContainerStyles from './queryContainer.css.js';

const {render, html} = LitHtml;
const {PhysicalAxis, QueryAxis} = SDK.CSSContainerQuery;

export class QueriedSizeRequestedEvent extends Event {
  static readonly eventName = 'queriedsizerequested';
  constructor() {
    super(QueriedSizeRequestedEvent.eventName, {});
  }
}

export interface QueryContainerData {
  container: DOMNode;
  queryName?: string;
  onContainerLinkClick: (event: Event) => void;
}

export class QueryContainer extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-query-container`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #queryName?: string;
  #container?: DOMNode;
  #onContainerLinkClick?: (event: Event) => void;
  #isContainerLinkHovered = false;
  #queriedSizeDetails?: SDK.CSSContainerQuery.ContainerQueriedSizeDetails;

  set data(data: QueryContainerData) {
    this.#queryName = data.queryName;
    this.#container = data.container;
    this.#onContainerLinkClick = data.onContainerLinkClick;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [queryContainerStyles];
  }

  updateContainerQueriedSizeDetails(details: SDK.CSSContainerQuery.ContainerQueriedSizeDetails): void {
    this.#queriedSizeDetails = details;
    this.#render();
  }

  async #onContainerLinkMouseEnter(): Promise<void> {
    this.#container?.highlightNode('container-outline');
    this.#isContainerLinkHovered = true;
    this.dispatchEvent(new QueriedSizeRequestedEvent());
  }

  #onContainerLinkMouseLeave(): void {
    this.#container?.clearHighlight();
    this.#isContainerLinkHovered = false;
    this.#render();
  }

  #render(): void {
    if (!this.#container) {
      return;
    }

    let idToDisplay, classesToDisplay;
    if (!this.#queryName) {
      idToDisplay = this.#container.getAttribute('id');
      classesToDisplay = this.#container.getAttribute('class')?.split(/\s+/).filter(Boolean);
    }

    const nodeTitle = this.#queryName || this.#container.nodeNameNicelyCased;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    // eslint-disable-next-line rulesdir/ban_a_tags_in_lit_html
    render(html`
      →
      <a href="#"
        draggable=false
        class="container-link"
        @click=${this.#onContainerLinkClick}
        @mouseenter=${this.#onContainerLinkMouseEnter}
        @mouseleave=${this.#onContainerLinkMouseLeave}
      ><${NodeText.NodeText.NodeText.litTagName}
          data-node-title=${nodeTitle}
          .data=${{
        nodeTitle,
        nodeId: idToDisplay,
        nodeClasses: classesToDisplay,
      } as NodeText.NodeText.NodeTextData}></${NodeText.NodeText.NodeText.litTagName}></a>
      ${this.#isContainerLinkHovered ? this.#renderQueriedSizeDetails() : LitHtml.nothing}
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }

  #renderQueriedSizeDetails(): LitHtml.LitTemplate {
    if (!this.#queriedSizeDetails || this.#queriedSizeDetails.queryAxis === QueryAxis.None) {
      return LitHtml.nothing;
    }

    const areBothAxesQueried = this.#queriedSizeDetails.queryAxis === QueryAxis.Both;

    const axisIconClasses = LitHtml.Directives.classMap({
      'axis-icon': true,
      'hidden': areBothAxesQueried,
      'vertical': this.#queriedSizeDetails.physicalAxis === PhysicalAxis.Vertical,
    });

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <span class="queried-size-details">
        (${this.#queriedSizeDetails.queryAxis}<${IconButton.Icon.Icon.litTagName}
          class=${axisIconClasses} .data=${{
            iconName: 'width',
            color: 'var(--icon-default)',
          } as IconButton.Icon.IconData}></${IconButton.Icon.Icon.litTagName}>)
        ${areBothAxesQueried && this.#queriedSizeDetails.width ? 'width:' : LitHtml.nothing}
        ${this.#queriedSizeDetails.width || LitHtml.nothing}
        ${areBothAxesQueried && this.#queriedSizeDetails.height ? 'height:' : LitHtml.nothing}
        ${this.#queriedSizeDetails.height || LitHtml.nothing}
      </span>
    `;
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
