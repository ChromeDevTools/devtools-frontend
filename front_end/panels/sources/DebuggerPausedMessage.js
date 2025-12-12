// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';
import { getLocalizedBreakpointName } from './CategorizedBreakpointL10n.js';
import debuggerPausedMessageStyles from './debuggerPausedMessage.css.js';
const { html, render, nothing, Directives: { ifDefined } } = Lit;
const UIStrings = {
    /**
     * @description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit
     * @example {conditional breakpoint} PH1
     */
    pausedOnS: 'Paused on {PH1}',
    /**
     * @description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit because a child is added to the subtree
     * @example {node} PH1
     */
    childSAdded: 'Child {PH1} added',
    /**
     * @description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit because a descendant is added
     * @example {node} PH1
     */
    descendantSAdded: 'Descendant {PH1} added',
    /**
     * @description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit because a descendant is removed
     * @example {node} PH1
     */
    descendantSRemoved: 'Descendant {PH1} removed',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    pausedOnEventListener: 'Paused on event listener',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    pausedOnXhrOrFetch: 'Paused on XHR or fetch',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    pausedOnException: 'Paused on exception',
    /**
     * @description We pause exactly when the promise rejection is happening, so that the user can see where in the code it comes from.
     * A Promise is a Web API object (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
     * that will either be 'fulfilled' or 'rejected' at some unknown time in the future.
     * The subject of the term is omited but it is "Execution", that is, "Execution was paused on <event>".
     */
    pausedOnPromiseRejection: 'Paused on `promise` rejection',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    pausedOnAssertion: 'Paused on assertion',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    pausedOnDebuggedFunction: 'Paused on debugged function',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    pausedBeforePotentialOutofmemory: 'Paused before potential out-of-memory crash',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    pausedOnCspViolation: 'Paused on CSP violation',
    /**
     * @description Text in Debugger Paused Message of the Sources panel specifying cause of break
     */
    trustedTypeSinkViolation: '`Trusted Type` Sink Violation',
    /**
     * @description Text in Debugger Paused Message of the Sources panel specifying cause of break
     */
    trustedTypePolicyViolation: '`Trusted Type` Policy Violation',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    pausedOnBreakpoint: 'Paused on breakpoint',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    debuggerPaused: 'Debugger paused',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    subtreeModifications: 'subtree modifications',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    attributeModifications: 'attribute modifications',
    /**
     * @description Text in Debugger Paused Message of the Sources panel
     */
    nodeRemoval: 'node removal',
    /**
     * @description Error message text
     * @example {Snag Error} PH1
     */
    webglErrorFiredS: 'WebGL Error Fired ({PH1})',
    /**
     * @description Text in DOMDebugger Model
     * @example {"script-src 'self'"} PH1
     */
    scriptBlockedDueToContent: 'Script blocked due to Content Security Policy directive: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/DebuggerPausedMessage.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
function domBreakpointSubtext(data) {
    let messageElement;
    if (data.targetNode) {
        const targetNodeLink = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(data.targetNode);
        if (data.insertion) {
            if (data.targetNode === data.node) {
                messageElement = uiI18n.getFormatLocalizedString(str_, UIStrings.childSAdded, { PH1: targetNodeLink });
            }
            else {
                messageElement = uiI18n.getFormatLocalizedString(str_, UIStrings.descendantSAdded, { PH1: targetNodeLink });
            }
        }
        else {
            messageElement = uiI18n.getFormatLocalizedString(str_, UIStrings.descendantSRemoved, { PH1: targetNodeLink });
        }
    }
    return html `
      ${PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(data.node)}
      ${data.targetNode ? html `<br/>${messageElement}` : nothing}
  `;
}
const DEFAULT_VIEW = (input, _output, target) => {
    render(html `
    <style>${debuggerPausedMessageStyles}</style>
    <div aria-live="polite" ?hidden=${!input}>${input ?
        html `
      <div class="paused-status ${input.errorLike ? 'error-reason' : ''}">
        <span>
          <div class="status-main">
            <devtools-icon name=${input.errorLike ? 'cross-circle-filled' : 'info'} class="medium"></devtools-icon>
            ${input.mainText}
          </div>
          ${input.subText || input.domBreakpointData ?
            html `
            <div class="status-sub monospace" title=${ifDefined(input.title ?? input.subText)}>${input.domBreakpointData ? domBreakpointSubtext(input.domBreakpointData) : input.subText}</div>
          ` :
            nothing}
        </span>
      </div>` :
        nothing}
    </div>
  `, target);
};
export class DebuggerPausedMessage extends UI.Widget.Widget {
    view;
    #viewInput = null;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, {
            jslog: `${VisualLogging.dialog('debugger-paused')}`,
            classes: ['paused-message', 'flex-none'],
            useShadowDom: true,
        });
        this.view = view;
    }
    static descriptionWithoutStack(description) {
        const firstCallFrame = /^\s+at\s/m.exec(description);
        return firstCallFrame ? description.substring(0, firstCallFrame.index - 1) :
            description.substring(0, description.lastIndexOf('\n'));
    }
    static async createDOMBreakpointHitMessageDetails(details) {
        const domDebuggerModel = details.debuggerModel.target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
        if (!details.auxData || !domDebuggerModel) {
            return null;
        }
        const domBreakpointData = domDebuggerModel.resolveDOMBreakpointData(details.auxData);
        if (!domBreakpointData) {
            return null;
        }
        const breakpointType = BreakpointTypeNouns.get(domBreakpointData.type);
        return {
            mainText: i18nString(UIStrings.pausedOnS, { PH1: breakpointType ? breakpointType() : String(null) }),
            domBreakpointData,
            errorLike: false,
        };
    }
    static #findEventNameForUi(detailsAuxData) {
        if (!detailsAuxData) {
            return '';
        }
        const { eventName, webglErrorName, directiveText, targetName } = detailsAuxData;
        if (eventName === 'instrumentation:webglErrorFired' && webglErrorName) {
            // If there is a hex code of the error, display only this.
            const errorName = webglErrorName.replace(/^.*(0x[0-9a-f]+).*$/i, '$1');
            return i18nString(UIStrings.webglErrorFiredS, { PH1: errorName });
        }
        if (eventName === 'instrumentation:scriptBlockedByCSP' && directiveText) {
            return i18nString(UIStrings.scriptBlockedDueToContent, { PH1: directiveText });
        }
        let breakpoint = SDK.EventBreakpointsModel.EventBreakpointsManager.instance().resolveEventListenerBreakpoint(detailsAuxData);
        if (breakpoint) {
            // EventBreakpointsManager breakpoints are the only ones with localized names.
            return getLocalizedBreakpointName(breakpoint.name);
        }
        breakpoint = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().resolveEventListenerBreakpoint(detailsAuxData);
        if (breakpoint && targetName) {
            // For standard DOM event listeners we prepend the target of the event.
            return targetName + '.' + breakpoint.name;
        }
        return breakpoint?.name ?? '';
    }
    async render(details, debuggerWorkspaceBinding, breakpointManager) {
        if (!details) {
            this.#viewInput = null;
            this.requestUpdate();
            return;
        }
        const errorLike = details.reason === "exception" /* Protocol.Debugger.PausedEventReason.Exception */ ||
            details.reason === "promiseRejection" /* Protocol.Debugger.PausedEventReason.PromiseRejection */ ||
            details.reason === "assert" /* Protocol.Debugger.PausedEventReason.Assert */ ||
            details.reason === "OOM" /* Protocol.Debugger.PausedEventReason.OOM */;
        if (details.reason === "DOM" /* Protocol.Debugger.PausedEventReason.DOM */) {
            this.#viewInput = await DebuggerPausedMessage.createDOMBreakpointHitMessageDetails(details);
        }
        else if (details.reason === "EventListener" /* Protocol.Debugger.PausedEventReason.EventListener */) {
            const eventNameForUI = DebuggerPausedMessage.#findEventNameForUi(details.auxData);
            this.#viewInput = { mainText: i18nString(UIStrings.pausedOnEventListener), subText: eventNameForUI, errorLike };
        }
        else if (details.reason === "XHR" /* Protocol.Debugger.PausedEventReason.XHR */) {
            const auxData = details.auxData;
            this.#viewInput = { mainText: i18nString(UIStrings.pausedOnXhrOrFetch), subText: auxData.url || '', errorLike };
        }
        else if (details.reason === "exception" /* Protocol.Debugger.PausedEventReason.Exception */) {
            const auxData = details.auxData;
            const description = auxData.description || auxData.value || '';
            const descriptionWithoutStack = DebuggerPausedMessage.descriptionWithoutStack(description);
            this.#viewInput = {
                mainText: i18nString(UIStrings.pausedOnException),
                subText: descriptionWithoutStack,
                title: description,
                errorLike,
            };
        }
        else if (details.reason === "promiseRejection" /* Protocol.Debugger.PausedEventReason.PromiseRejection */) {
            const auxData = details.auxData;
            const description = auxData.description || auxData.value || '';
            const descriptionWithoutStack = DebuggerPausedMessage.descriptionWithoutStack(description);
            this.#viewInput = {
                mainText: i18nString(UIStrings.pausedOnPromiseRejection),
                subText: descriptionWithoutStack,
                title: description,
                errorLike,
            };
        }
        else if (details.reason === "assert" /* Protocol.Debugger.PausedEventReason.Assert */) {
            this.#viewInput = { mainText: i18nString(UIStrings.pausedOnAssertion), errorLike };
        }
        else if (details.reason === "debugCommand" /* Protocol.Debugger.PausedEventReason.DebugCommand */) {
            this.#viewInput = { mainText: i18nString(UIStrings.pausedOnDebuggedFunction), errorLike };
        }
        else if (details.reason === "OOM" /* Protocol.Debugger.PausedEventReason.OOM */) {
            this.#viewInput = { mainText: i18nString(UIStrings.pausedBeforePotentialOutofmemory), errorLike };
        }
        else if (details.reason === "CSPViolation" /* Protocol.Debugger.PausedEventReason.CSPViolation */ && details.auxData?.['violationType']) {
            const text = details.auxData['violationType'];
            if (text === "trustedtype-sink-violation" /* Protocol.DOMDebugger.CSPViolationType.TrustedtypeSinkViolation */) {
                this.#viewInput = {
                    mainText: i18nString(UIStrings.pausedOnCspViolation),
                    subText: i18nString(UIStrings.trustedTypeSinkViolation),
                    errorLike,
                };
            }
            else if (text === "trustedtype-policy-violation" /* Protocol.DOMDebugger.CSPViolationType.TrustedtypePolicyViolation */) {
                this.#viewInput = {
                    mainText: i18nString(UIStrings.pausedOnCspViolation),
                    subText: i18nString(UIStrings.trustedTypePolicyViolation),
                    errorLike,
                };
            }
        }
        else if (details.callFrames.length) {
            const uiLocation = await debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location());
            const breakpoint = uiLocation ? breakpointManager.findBreakpoint(uiLocation) : null;
            const defaultText = breakpoint ? i18nString(UIStrings.pausedOnBreakpoint) : i18nString(UIStrings.debuggerPaused);
            this.#viewInput = { mainText: defaultText, errorLike };
        }
        else {
            this.#viewInput = null;
            console.warn('ScriptsPanel paused, but callFrames.length is zero.'); // TODO remove this once we understand this case better
        }
        this.requestUpdate();
    }
    performUpdate() {
        this.view(this.#viewInput, undefined, this.contentElement);
    }
}
export const BreakpointTypeNouns = new Map([
    ["subtree-modified" /* Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified */, i18nLazyString(UIStrings.subtreeModifications)],
    ["attribute-modified" /* Protocol.DOMDebugger.DOMBreakpointType.AttributeModified */, i18nLazyString(UIStrings.attributeModifications)],
    ["node-removed" /* Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved */, i18nLazyString(UIStrings.nodeRemoval)],
]);
//# sourceMappingURL=DebuggerPausedMessage.js.map