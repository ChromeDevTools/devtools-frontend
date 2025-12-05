// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import requestInitiatorViewStyles from './requestInitiatorView.css.js';
import requestInitiatorViewTreeStyles from './requestInitiatorViewTree.css.js';
const { html, render, nothing } = Lit;
const { widgetConfig } = UI.Widget;
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
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestInitiatorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    const hasInitiatorData = input.initiatorGraph.initiators.size > 1 || input.initiatorGraph.initiated.size > 1 || input.hasStackTrace;
    if (!hasInitiatorData) {
        render(html `
      <div class="empty-view" style="display: flex; justify-content: center; align-items: center; height: 100%; color: var(--sys-color-token-subtle);">
        ${i18nString(UIStrings.noInitiator)}
      </div>
    `, target);
        return;
    }
    const renderStackTraceSection = () => {
        return html `
      <li role="treeitem" class="request-initiator-view-section-title" aria-expanded="true">
        ${i18nString(UIStrings.requestCallStack)}
        <ul role="group">
          <li role="treeitem">
            <devtools-widget .widgetConfig=${widgetConfig(Components.JSPresentationUtils.StackTracePreviewContent, {
            target: input.target,
            linkifier: input.linkifier,
            options: { runtimeStackTrace: input.request.initiator()?.stack, tabStops: true }
        })}></devtools-widget>
          </li>
        </ul>
      </li>
    `;
    };
    const renderInitiatorNodes = (initiators, index, initiated, visited) => {
        if (index >= initiators.length) {
            return html `${nothing}`;
        }
        const request = initiators[index];
        const isCurrentRequest = (index === initiators.length - 1);
        return html `
      <li role="treeitem" ?selected=${isCurrentRequest} aria-expanded="true">
        <span style=${isCurrentRequest ? 'font-weight: bold' : ''}>${request.url()}</span>
        <ul role="group">
          ${renderInitiatorNodes(initiators, index + 1, initiated, visited)}
          ${isCurrentRequest ? renderInitiatedNodes(initiated, request, visited) : nothing}
        </ul>
      </li>
    `;
    };
    const renderInitiatedNodes = (initiated, parentRequest, visited) => {
        const children = [];
        for (const [request, initiator] of initiated) {
            if (initiator === parentRequest) {
                children.push(request);
            }
        }
        if (children.length === 0) {
            return html `${nothing}`;
        }
        return html `
      ${children.map(child => {
            const shouldRecurse = !visited.has(child);
            if (shouldRecurse) {
                visited.add(child);
            }
            return html `
        <li role="treeitem" aria-expanded="true">
          <span>${child.url()}</span>
          ${shouldRecurse ? html `<ul>${renderInitiatedNodes(initiated, child, visited)}</ul>` : nothing}
        </li>
      `;
        })}
    `;
    };
    const renderInitiatorChain = (initiatorGraph) => {
        const initiators = Array.from(initiatorGraph.initiators).reverse();
        const visited = new Set();
        visited.add(input.request);
        return html `
      <li role="treeitem" class="request-initiator-view-section-title" aria-expanded="true">
        ${i18nString(UIStrings.requestInitiatorChain)}
        <ul role="group">
          ${renderInitiatorNodes(initiators, 0, initiatorGraph.initiated, visited)}
        </ul>
      </li>
    `;
    };
    render(html `
    <div class="request-initiator-view-tree" jslog=${VisualLogging.tree('initiator-tree')}>
      <devtools-tree .template=${html `
        <style>
          ${requestInitiatorViewTreeStyles}
        </style>
        <ul role="tree">
           ${input.hasStackTrace ? renderStackTraceSection() : Lit.nothing}
           ${(input.initiatorGraph.initiators.size > 1 || input.initiatorGraph.initiated.size > 1) ?
        renderInitiatorChain(input.initiatorGraph) :
        Lit.nothing}
        </ul>
      `}></devtools-tree>
    </div>
  `, target);
};
export class RequestInitiatorView extends UI.Widget.VBox {
    linkifier;
    request;
    #view;
    constructor(request, view = DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.pane('initiator').track({ resize: true })}` });
        this.element.classList.add('request-initiator-view');
        this.linkifier = new Components.Linkifier.Linkifier();
        this.request = request;
        this.#view = view;
    }
    static createStackTracePreview(request, linkifier, focusableLink) {
        const initiator = request.initiator();
        if (!initiator?.stack) {
            return null;
        }
        const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
        const target = networkManager ? networkManager.target() : undefined;
        return new Components.JSPresentationUtils.StackTracePreviewContent(undefined, target, linkifier, { runtimeStackTrace: initiator.stack, tabStops: focusableLink });
    }
    performUpdate() {
        const initiatorGraph = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this.request);
        const hasStackTrace = !!this.request.initiator()?.stack;
        const networkManager = SDK.NetworkManager.NetworkManager.forRequest(this.request);
        const target = networkManager ? networkManager.target() : undefined;
        const viewInput = {
            initiatorGraph,
            hasStackTrace,
            request: this.request,
            linkifier: this.linkifier,
            target: target || undefined,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    wasShown() {
        super.wasShown();
        this.registerRequiredCSS(requestInitiatorViewStyles);
        this.requestUpdate();
    }
}
//# sourceMappingURL=RequestInitiatorView.js.map