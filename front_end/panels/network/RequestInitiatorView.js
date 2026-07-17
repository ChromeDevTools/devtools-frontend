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
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { NetworkRequestNode } from './NetworkDataGridNode.js';
import requestInitiatorViewStyles from './requestInitiatorView.css.js';
import requestInitiatorViewTreeStyles from './requestInitiatorViewTree.css.js';
const { widget } = UI.Widget;
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
    /**
     * @description Label shown in the initiator chain when a request was initiated from the Console.
     */
    console: 'Console',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestInitiatorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const MAX_URL_LENGTH = 150;
function trimUrl(url) {
    if (url.length <= MAX_URL_LENGTH) {
        return url;
    }
    // To avoid performance issues with extremely long URLs (e.g. 2MB base64 data URLs),
    // we do a fast O(1) slice instead of using the O(N) Platform.StringUtilities.trimMiddle
    // utility which instantiates Intl.Segmenter and iterates over every grapheme.
    const halfMaxLength = Math.floor(MAX_URL_LENGTH / 2);
    return url.substring(0, halfMaxLength) + '…' + url.substring(url.length - halfMaxLength);
}
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
        // clang-format off
        return html `
      <li role="treeitem" class="request-initiator-view-section-title" aria-expanded="true" open>
        ${i18nString(UIStrings.requestCallStack)}
        <ul role="group">
          <li role="treeitem">
            ${widget(Components.JSPresentationUtils.StackTracePreviewContent, {
            options: { tabStops: true },
            stackTrace: input.stackTrace,
        })}
          </li>
          ${input.isConsoleOriginated ? html `
            <li role="treeitem" class="console-origin-label">
              ${i18nString(UIStrings.console)}
            </li>
          ` : nothing}
        </ul>
      </li>
    `;
        // clang-format on
    };
    const renderInitiatorNodes = (initiators, index, initiated, visited) => {
        if (index >= initiators.length) {
            return html `${nothing}`;
        }
        const request = initiators[index];
        const isCurrentRequest = (index === initiators.length - 1);
        const hasFurtherInitiatedNodes = index + 1 < initiators.length;
        const renderedChildren = isCurrentRequest ? renderInitiatedNodes(initiated, request, visited) : nothing;
        const url = request.url();
        // To avoid layout and rendering lag from extremely long URLs (like data: URLs),
        // we only set the title/tooltip attribute if the URL is under 2000 characters.
        const title = url.length < 2000 ? url : undefined;
        // clang-format off
        return html `
          <li role="treeitem" ?selected=${isCurrentRequest} aria-expanded="true" open>
            <span style=${isCurrentRequest ? 'font-weight: bold' : ''} title=${Directives.ifDefined(title)}>
              ${trimUrl(url)}
            </span>
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
            const url = child.url();
            // To avoid layout and rendering lag from extremely long URLs (like data: URLs),
            // we only set the title/tooltip attribute if the URL is under 2000 characters.
            const title = url.length < 2000 ? url : undefined;
            return html `
        <li role="treeitem" aria-expanded="true" open>
          <span title=${Directives.ifDefined(title)}>
            ${trimUrl(url)}
          </span>
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
            ${input.isConsoleOriginated ? html `
              <li role="treeitem" aria-expanded="true" open>
                <span>${i18nString(UIStrings.console)}</span>
                <ul role="group">
                  ${renderInitiatorNodes(initiators, 0, initiatorGraph.initiated, visited)}
                </ul>
              </li>` :
            renderInitiatorNodes(initiators, 0, initiatorGraph.initiated, visited)}
          </ul>` : nothing}
      </li>`;
        // clang-format on
    };
    const hasInitiatorChain = input.initiatorGraph.initiators.size > 1 || input.initiatorGraph.initiated.size > 1 || input.isConsoleOriginated;
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
        const isConsoleOriginated = NetworkRequestNode.isConsoleOriginated(this.request);
        const viewInput = {
            initiatorGraph,
            stackTrace,
            request: this.request,
            isConsoleOriginated,
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