// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/components/node_text/node_text.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import queryContainerStyles from './queryContainer.css.js';
const { render, html } = Lit;
const { PhysicalAxis, QueryAxis } = SDK.CSSContainerQuery;
export class QueriedSizeRequestedEvent extends Event {
    static eventName = 'queriedsizerequested';
    constructor() {
        super(QueriedSizeRequestedEvent.eventName, {});
    }
}
export class QueryContainer extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #queryName;
    #container;
    #onContainerLinkClick;
    #isContainerLinkHovered = false;
    #queriedSizeDetails;
    set data(data) {
        this.#queryName = data.queryName;
        this.#container = data.container;
        this.#onContainerLinkClick = data.onContainerLinkClick;
        this.#render();
    }
    updateContainerQueriedSizeDetails(details) {
        this.#queriedSizeDetails = details;
        this.#render();
    }
    async #onContainerLinkMouseEnter() {
        this.#container?.highlightNode('container-outline');
        this.#isContainerLinkHovered = true;
        this.dispatchEvent(new QueriedSizeRequestedEvent());
    }
    #onContainerLinkMouseLeave() {
        this.#container?.clearHighlight();
        this.#isContainerLinkHovered = false;
        this.#render();
    }
    #render() {
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
        // eslint-disable-next-line @devtools/no-a-tags-in-lit
        render(html `
      <style>${queryContainerStyles}</style>
      →
      <a href="#" draggable=false class="container-link"
         jslog=${VisualLogging.cssRuleHeader('container-query').track({ click: true })}
         @click=${this.#onContainerLinkClick}
         @mouseenter=${this.#onContainerLinkMouseEnter}
         @mouseleave=${this.#onContainerLinkMouseLeave}>
        <devtools-node-text data-node-title=${nodeTitle} .data=${{
            nodeTitle,
            nodeId: idToDisplay,
            nodeClasses: classesToDisplay,
        }}>
        </devtools-node-text>
      </a>
      ${this.#isContainerLinkHovered ? this.#renderQueriedSizeDetails() : Lit.nothing}
    `, this.#shadow, {
            host: this,
        });
        // clang-format on
    }
    #renderQueriedSizeDetails() {
        if (!this.#queriedSizeDetails || this.#queriedSizeDetails.queryAxis === "" /* QueryAxis.NONE */) {
            return Lit.nothing;
        }
        const areBothAxesQueried = this.#queriedSizeDetails.queryAxis === "size" /* QueryAxis.BOTH */;
        const axisIconClasses = Lit.Directives.classMap({
            'axis-icon': true,
            hidden: areBothAxesQueried,
            vertical: this.#queriedSizeDetails.physicalAxis === "Vertical" /* PhysicalAxis.VERTICAL */,
        });
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
      <span class="queried-size-details">
        (${this.#queriedSizeDetails.queryAxis}
        <devtools-icon
          class=${axisIconClasses} name="width"></devtools-icon>
        ) ${areBothAxesQueried && this.#queriedSizeDetails.width ? ' width: ' : Lit.nothing}
        ${this.#queriedSizeDetails.width || Lit.nothing}
        ${areBothAxesQueried && this.#queriedSizeDetails.height ? ' height: ' : Lit.nothing}
        ${this.#queriedSizeDetails.height || Lit.nothing}
      </span>
    `;
        // clang-format on
    }
}
customElements.define('devtools-query-container', QueryContainer);
//# sourceMappingURL=QueryContainer.js.map