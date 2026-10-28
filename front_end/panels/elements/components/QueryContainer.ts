// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/kit/kit.js';
import '../../../ui/components/node_text/node_text.js';

import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import queryContainerStyles from './queryContainer.css.js';

const {render, html} = Lit;
const {PhysicalAxis, QueryAxis} = SDK.CSSContainerQuery;

export class QueriedSizeRequestedEvent extends Event {
  static readonly eventName = 'queriedsizerequested';
  constructor() {
    super(QueriedSizeRequestedEvent.eventName, {});
  }
}

export interface QueryContainerData {
  container: SDK.DOMModel.DOMNode;
  queryName?: string;
  onContainerLinkClick: () => void;
}

export interface ViewInput {
  nodeTitle: string;
  idToDisplay?: string;
  classesToDisplay?: string[];
  onContainerLinkClick?: () => void;
  onContainerLinkMouseEnter: () => void;
  onContainerLinkMouseLeave: () => void;
  isContainerLinkHovered: boolean;
  queriedSizeDetails?: SDK.CSSContainerQuery.ContainerQueriedSizeDetails;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const renderQueriedSizeDetails = (): Lit.LitTemplate => {
    if (!input.queriedSizeDetails || input.queriedSizeDetails.queryAxis === QueryAxis.NONE) {
      return Lit.nothing;
    }

    const areBothAxesQueried = input.queriedSizeDetails.queryAxis === QueryAxis.BOTH;

    const axisIconClasses = Lit.Directives.classMap({
      'axis-icon': true,
      hidden: areBothAxesQueried,
      vertical: input.queriedSizeDetails.physicalAxis === PhysicalAxis.VERTICAL,
    });

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <span class="queried-size-details">
        (${input.queriedSizeDetails.queryAxis}
        <devtools-icon
          class=${axisIconClasses} name="width"></devtools-icon>
        ) ${areBothAxesQueried && input.queriedSizeDetails.width ? ' width: ' : Lit.nothing}
        ${input.queriedSizeDetails.width || Lit.nothing}
        ${areBothAxesQueried && input.queriedSizeDetails.height ? ' height: ' : Lit.nothing}
        ${input.queriedSizeDetails.height || Lit.nothing}
      </span>
    `;
    // clang-format on
  };

  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  // eslint-disable-next-line @devtools/no-a-tags-in-lit
  render(html`
    <style>${queryContainerStyles}</style>
    \u2192
    <a href="#" draggable=false class="container-link"
       jslog=${VisualLogging.cssRuleHeader('container-query').track({click: true})}
       @click=${(event: Event) => {
         event.preventDefault();
         input.onContainerLinkClick?.();
       }}
       @mouseenter=${input.onContainerLinkMouseEnter}
       @mouseleave=${input.onContainerLinkMouseLeave}>
      <devtools-node-text data-node-title=${input.nodeTitle} .data=${{
        nodeTitle: input.nodeTitle,
        nodeId: input.idToDisplay,
        nodeClasses: input.classesToDisplay,
      }}>
      </devtools-node-text>
    </a>
    ${input.isContainerLinkHovered ? renderQueriedSizeDetails() : Lit.nothing}
  `, target);
  // clang-format on
};

export class QueryContainer extends UI.Widget.Widget {
  #view: View;
  #queryName?: string;
  #container?: SDK.DOMModel.DOMNode;
  #onContainerLinkClick?: () => void;
  #isContainerLinkHovered = false;
  #queriedSizeDetails?: SDK.CSSContainerQuery.ContainerQueriedSizeDetails;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set data(data: QueryContainerData) {
    this.#queryName = data.queryName;
    this.#container = data.container;
    this.#onContainerLinkClick = data.onContainerLinkClick;
    this.performUpdate();
  }

  updateContainerQueriedSizeDetails(details: SDK.CSSContainerQuery.ContainerQueriedSizeDetails): void {
    this.#queriedSizeDetails = details;
    this.performUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.performUpdate();
  }

  #onContainerLinkMouseEnter = (): void => {
    this.#container?.highlight('container-outline');
    this.#isContainerLinkHovered = true;
    this.dispatchDOMEvent(new QueriedSizeRequestedEvent());
  };

  #onContainerLinkMouseLeave = (): void => {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
    this.#isContainerLinkHovered = false;
    this.performUpdate();
  };

  override performUpdate(): void {
    if (!this.#container) {
      return;
    }

    let idToDisplay, classesToDisplay;
    if (!this.#queryName) {
      idToDisplay = this.#container.getAttribute('id');
      classesToDisplay = this.#container.getAttribute('class')?.split(/\s+/).filter(Boolean);
    }

    const nodeTitle = this.#queryName || this.#container.nodeNameInCorrectCase();

    this.#view({
      nodeTitle,
      idToDisplay,
      classesToDisplay,
      onContainerLinkClick: this.#onContainerLinkClick,
      onContainerLinkMouseEnter: this.#onContainerLinkMouseEnter,
      onContainerLinkMouseLeave: this.#onContainerLinkMouseLeave,
      isContainerLinkHovered: this.#isContainerLinkHovered,
      queriedSizeDetails: this.#queriedSizeDetails,
    },
               undefined, this.contentElement);
  }
}
