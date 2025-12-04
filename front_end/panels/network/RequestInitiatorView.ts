// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import requestInitiatorViewStyles from './requestInitiatorView.css.js';
import requestInitiatorViewTreeStyles from './requestInitiatorViewTree.css.js';

const {html, render, nothing} = Lit;
const {widgetConfig} = UI.Widget;

const UIStrings = {
  /**
   * @description Text in Request Initiator View of the Network panel if the request has no initiator data
   */
  noInitiator: 'No initiator data',
  /**
   * @description Title of a section in Request Initiator view of the Network Panel
   */
  requestCallStack: 'Request call stack',
  /**
   * @description Title of a section in Request Initiator view of the Network Panel
   */
  requestInitiatorChain: 'Request initiator chain',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestInitiatorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestInitiatorView extends UI.Widget.VBox {
  private readonly linkifier: Components.Linkifier.Linkifier;
  private readonly request: SDK.NetworkRequest.NetworkRequest;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super({jslog: `${VisualLogging.pane('initiator').track({resize: true})}`});

    this.element.classList.add('request-initiator-view');
    this.linkifier = new Components.Linkifier.Linkifier();
    this.request = request;
  }

  static createStackTracePreview(
      request: SDK.NetworkRequest.NetworkRequest, linkifier: Components.Linkifier.Linkifier,
      focusableLink?: boolean): Components.JSPresentationUtils.StackTracePreviewContent|null {
    const initiator = request.initiator();
    if (!initiator?.stack) {
      return null;
    }
    const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
    const target = networkManager ? networkManager.target() : undefined;
    return new Components.JSPresentationUtils.StackTracePreviewContent(
        undefined, target, linkifier, {runtimeStackTrace: initiator.stack, tabStops: focusableLink});
  }

  override performUpdate(): void {
    const initiatorGraph = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this.request);
    const hasStackTrace = this.request.initiator()?.stack;
    const hasInitiatorData = initiatorGraph.initiators.size > 1 || initiatorGraph.initiated.size > 1 || hasStackTrace;

    if (!hasInitiatorData) {
      render(
          html`
        <devtools-widget .widgetConfig${widgetConfig(UI.EmptyWidget.EmptyWidget, {
            text: i18nString(UIStrings.noInitiator)
          })}>
        </devtools-widget>
      `,
          this.contentElement, {host: this});
      return;
    }

    render(
        html`
      <div class="request-initiator-view-tree" jslog=${VisualLogging.tree('initiator-tree')}>
        <devtools-tree .template=${
            html`
          <style>
            ${requestInitiatorViewTreeStyles}
          </style>
          <ul role="tree">
             ${hasStackTrace ? this.#renderStackTraceSection() : nothing}
             ${
                (initiatorGraph.initiators.size > 1 || initiatorGraph.initiated.size > 1) ?
                    this.#renderInitiatorChain(initiatorGraph) :
                    nothing}
          </ul>
        `}></devtools-tree>
      </div>
    `,
        this.contentElement, {host: this});
  }

  #renderStackTraceSection(): Lit.TemplateResult {
    const networkManager = SDK.NetworkManager.NetworkManager.forRequest(this.request);
    const target = networkManager ? networkManager.target() : undefined;
    return html`
      <li role="treeitem" class="request-initiator-view-section-title" aria-expanded="true">
        ${i18nString(UIStrings.requestCallStack)}
        <ul role="group">
          <li role="treeitem">
            <devtools-widget .widgetConfig=${widgetConfig(Components.JSPresentationUtils.StackTracePreviewContent, {
      target: target || undefined,
      linkifier: this.linkifier,
      options: {runtimeStackTrace: this.request.initiator()?.stack, tabStops: true}
    })}></devtools-widget>
          </li>
        </ul>
      </li>
    `;
  }

  #renderInitiatorChain(initiatorGraph: Logs.NetworkLog.InitiatorGraph): Lit.TemplateResult {
    const initiators = Array.from(initiatorGraph.initiators).reverse();
    const visited = new Set<SDK.NetworkRequest.NetworkRequest>();
    visited.add(this.request);
    return html`
      <li role="treeitem" class="request-initiator-view-section-title" aria-expanded="true">
        ${i18nString(UIStrings.requestInitiatorChain)}
        <ul role="group">
          ${this.#renderInitiatorNodes(initiators, 0, initiatorGraph.initiated, visited)}
        </ul>
      </li>
    `;
  }

  #renderInitiatorNodes(
      initiators: SDK.NetworkRequest.NetworkRequest[], index: number,
      initiated: Map<SDK.NetworkRequest.NetworkRequest, SDK.NetworkRequest.NetworkRequest>,
      visited: Set<SDK.NetworkRequest.NetworkRequest>): Lit.TemplateResult {
    if (index >= initiators.length) {
      return html`${nothing}`;
    }
    const request = initiators[index];
    const isCurrentRequest = (index === initiators.length - 1);

    return html`
      <li role="treeitem" ?selected=${isCurrentRequest} aria-expanded="true">
        <span style=${isCurrentRequest ? 'font-weight: bold' : ''}>${request.url()}</span>
        <ul role="group">
          ${this.#renderInitiatorNodes(initiators, index + 1, initiated, visited)}
          ${isCurrentRequest ? this.#renderInitiatedNodes(initiated, request, visited) : nothing}
        </ul>
      </li>
    `;
  }

  #renderInitiatedNodes(
      initiated: Map<SDK.NetworkRequest.NetworkRequest, SDK.NetworkRequest.NetworkRequest>,
      parentRequest: SDK.NetworkRequest.NetworkRequest,
      visited: Set<SDK.NetworkRequest.NetworkRequest>): Lit.TemplateResult {
    const children = [];
    for (const [request, initiator] of initiated) {
      if (initiator === parentRequest) {
        children.push(request);
      }
    }
    if (children.length === 0) {
      return html`${nothing}`;
    }
    return html`
      ${children.map(child => {
      const shouldRecurse = !visited.has(child);
      if (shouldRecurse) {
        visited.add(child);
      }
      return html`
        <li role="treeitem" aria-expanded="true">
          ${child.url()}
          ${
          shouldRecurse ? html`<ul role="group">${this.#renderInitiatedNodes(initiated, child, visited)}</ul>` :
                          nothing}}
        </li>
      `;
    })}
    `;
  }

  override wasShown(): void {
    super.wasShown();
    this.registerRequiredCSS(requestInitiatorViewStyles);
    this.requestUpdate();
  }
}
