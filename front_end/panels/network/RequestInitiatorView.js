// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Logs from '../../models/logs/logs.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import requestInitiatorViewStyles from './requestInitiatorView.css.js';
import requestInitiatorViewTreeStyles from './requestInitiatorViewTree.css.js';
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
    const hasInitiatorData = input.initiatorGraph.initiators.size > 1 || input.initiatorGraph.initiated.size > 1 || input.stackTrace;
    if (!hasInitiatorData) {
        render(html `
      <div class="empty-view" style="display: flex; justify-content: center; align-items: center; height: 100%; color: var(--sys-color-token-subtle);">
        ${i18nString(UIStrings.noInitiator)}
      </div>
    `, target);
        return;
    }
    const renderStackTraceSection = () => {
        if (!input.stackTrace) {
            return html `${nothing}`;
        }
        return html `
      <li role="treeitem" class="request-initiator-view-section-title" aria-expanded="true" open>
        ${i18nString(UIStrings.requestCallStack)}
        <ul role="group">
          <li role="treeitem">
            <devtools-widget .widgetConfig=${widgetConfig(Components.JSPresentationUtils.StackTracePreviewContent, {
            options: { tabStops: true },
            stackTrace: input.stackTrace,
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
        const hasFurtherInitiatedNodes = index + 1 < initiators.length;
        const renderedChildren = isCurrentRequest ? renderInitiatedNodes(initiated, request, visited) : nothing;
        // clang-format off
        return html `
          <li role="treeitem" ?selected=${isCurrentRequest} aria-expanded="true" open>
            <span style=${isCurrentRequest ? 'font-weight: bold' : ''}>${request.url()}</span>
            ${hasFurtherInitiatedNodes || renderedChildren !== nothing ? html `
              <ul role="group">
                ${renderInitiatorNodes(initiators, index + 1, initiated, visited)}
                ${renderedChildren}
              </ul>` : nothing}
          </li>`;
        // clang-format on
    };
    const renderInitiatedNodes = (initiated, parentRequest, visited) => {
        const children = [];
        for (const [request, initiator] of initiated) {
            if (initiator === parentRequest) {
                children.push(request);
            }
        }
        if (children.length === 0) {
            return nothing;
        }
        return html `
      ${children.map(child => {
            const shouldRecurse = !visited.has(child);
            if (shouldRecurse) {
                visited.add(child);
            }
            const renderedChildren = shouldRecurse ? renderInitiatedNodes(initiated, child, visited) : nothing;
            return html `
        <li role="treeitem" aria-expanded="true" open>
          <span>${child.url()}</span>
          ${renderedChildren !== nothing ? html `<ul role="group">${renderedChildren}</ul>` : nothing}
        </li>
      `;
        })}
    `;
    };
    const renderInitiatorChain = (initiatorGraph) => {
        const initiators = Array.from(initiatorGraph.initiators).reverse();
        const visited = new Set();
        visited.add(input.request);
        const hasInitiatorChain = initiators.length > 0;
        // clang-format off
        return html `
      <li role="treeitem" class="request-initiator-view-section-title" aria-expanded="true" open>
        ${i18nString(UIStrings.requestInitiatorChain)}
        ${hasInitiatorChain ? html `
          <ul role="group">
            ${renderInitiatorNodes(initiators, 0, initiatorGraph.initiated, visited)}
          </ul>` : nothing}
      </li>`;
        // clang-format on
    };
    const hasInitiatorChain = input.initiatorGraph.initiators.size > 1 || input.initiatorGraph.initiated.size > 1;
    // clang-format off
    render(html `
    <div class="request-initiator-view-tree" jslog=${VisualLogging.tree('initiator-tree')}>
      <devtools-tree .template=${html `
        <style>${requestInitiatorViewTreeStyles}</style>
        ${input.stackTrace || hasInitiatorChain ? html `
          <ul role="tree">
            ${renderStackTraceSection()}
            ${hasInitiatorChain ? renderInitiatorChain(input.initiatorGraph) : nothing}
          </ul>` : nothing}
      `}></devtools-tree>
    </div>
  `, target);
    // clang-format on
};
export class RequestInitiatorView extends UI.Widget.VBox {
    request;
    #view;
    constructor(request, view = DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.pane('initiator').track({ resize: true })}` });
        this.element.classList.add('request-initiator-view');
        this.request = request;
        this.#view = view;
    }
    static async createStackTracePreview(request, linkifier, focusableLink) {
        const initiator = request.initiator();
        if (!initiator?.stack) {
            return null;
        }
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
        const target = networkManager?.target() ?? targetManager.primaryPageTarget() ?? targetManager.rootTarget();
        let stackTrace = null;
        const preview = new Components.JSPresentationUtils.StackTracePreviewContent();
        preview.options = { tabStops: focusableLink };
        if (target) {
            stackTrace = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                .createStackTraceFromProtocolRuntime(initiator.stack, target);
            preview.stackTrace = stackTrace;
        }
        return { preview, stackTrace };
    }
    async performUpdate() {
        const initiatorGraph = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this.request);
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const networkManager = SDK.NetworkManager.NetworkManager.forRequest(this.request);
        const target = networkManager?.target() ?? targetManager.primaryPageTarget() ?? targetManager.rootTarget();
        const rawStack = this.request.initiator()?.stack;
        let stackTrace = null;
        if (rawStack && target) {
            stackTrace = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                .createStackTraceFromProtocolRuntime(rawStack, target);
        }
        const viewInput = {
            initiatorGraph,
            stackTrace,
            request: this.request,
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