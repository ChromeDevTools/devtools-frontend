// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';  // eslint-disable-line no-unused-vars
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit
  *@example {conditional breakpoint} PH1
  */
  pausedOnS: 'Paused on {PH1}',
  /**
  *@description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit because a child is added to the subtree
  *@example {node} PH1
  */
  childSAdded: 'Child {PH1} added',
  /**
  *@description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit because a descendant is added
  *@example {node} PH1
  */
  descendantSAdded: 'Descendant {PH1} added',
  /**
  *@description Text in the JavaScript Debugging pane of the Sources pane when a DOM breakpoint is hit because a descendant is removed
  *@example {node} PH1
  */
  descendantSRemoved: 'Descendant {PH1} removed',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  pausedOnEventListener: 'Paused on event listener',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  pausedOnXhrOrFetch: 'Paused on XHR or fetch',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  pausedOnException: 'Paused on exception',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  pausedOnPromiseRejection: 'Paused on promise rejection',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  pausedOnAssertion: 'Paused on assertion',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  pausedOnDebuggedFunction: 'Paused on debugged function',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  pausedBeforePotentialOutofmemory: 'Paused before potential out-of-memory crash',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  pausedOnCspViolation: 'Paused on CSP violation',
  /**
  *@description Text in Debugger Paused Message of the Sources panel specifying cause of break
  */
  trustedTypeSinkViolation: '`Trusted Type` Sink Violation',
  /**
  *@description Text in Debugger Paused Message of the Sources panel specifying cause of break
  */
  trustedTypePolicyViolation: '`Trusted Type` Policy Violation',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  pausedOnBreakpoint: 'Paused on breakpoint',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  debuggerPaused: 'Debugger paused',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  subtreeModifications: 'subtree modifications',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  attributeModifications: 'attribute modifications',
  /**
  *@description Text in Debugger Paused Message of the Sources panel
  */
  nodeRemoval: 'node removal',
};
const str_ = i18n.i18n.registerUIStrings('sources/DebuggerPausedMessage.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class DebuggerPausedMessage {
  constructor() {
    this._element = document.createElement('div');
    this._element.classList.add('paused-message');
    this._element.classList.add('flex-none');
    const root = UI.Utils.createShadowRootWithCoreStyles(
        this._element,
        {cssFile: 'sources/debuggerPausedMessage.css', enableLegacyPatching: true, delegatesFocus: undefined});
    /** @type {!HTMLElement} */
    this._contentElement = /** @type {!HTMLElement} */ (root.createChild('div'));
    UI.ARIAUtils.markAsPoliteLiveRegion(this._element, false);
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._element;
  }

  /**
   * @param {string} description
   */
  static _descriptionWithoutStack(description) {
    const firstCallFrame = /^\s+at\s/m.exec(description);
    return firstCallFrame ? description.substring(0, firstCallFrame.index - 1) :
                            description.substring(0, description.lastIndexOf('\n'));
  }

  /**
   * @param {!SDK.DebuggerModel.DebuggerPausedDetails} details
   * @return {!Promise<!Element>}
   */
  static async _createDOMBreakpointHitMessage(details) {
    const messageWrapper = document.createElement('span');
    const domDebuggerModel = details.debuggerModel.target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    if (!details.auxData || !domDebuggerModel) {
      return messageWrapper;
    }
    const data = domDebuggerModel.resolveDOMBreakpointData(
        /** @type {!{type: !Protocol.DOMDebugger.DOMBreakpointType, nodeId: !Protocol.DOM.NodeId, targetNodeId: !Protocol.DOM.NodeId, insertion: boolean}} */
        (details.auxData));
    if (!data) {
      return messageWrapper;
    }

    const mainElement = messageWrapper.createChild('div', 'status-main');
    mainElement.appendChild(UI.Icon.Icon.create('smallicon-info', 'status-icon'));
    const breakpointType = BreakpointTypeNouns.get(data.type);
    mainElement.appendChild(
        document.createTextNode(i18nString(UIStrings.pausedOnS, {PH1: breakpointType ? breakpointType() : null})));

    const subElement = messageWrapper.createChild('div', 'status-sub monospace');
    const linkifiedNode = await Common.Linkifier.Linkifier.linkify(data.node);
    subElement.appendChild(linkifiedNode);

    if (data.targetNode) {
      const targetNodeLink = await Common.Linkifier.Linkifier.linkify(data.targetNode);
      let messageElement;
      if (data.insertion) {
        if (data.targetNode === data.node) {
          messageElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.childSAdded, {PH1: targetNodeLink});
        } else {
          messageElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.descendantSAdded, {PH1: targetNodeLink});
        }
      } else {
        messageElement = i18n.i18n.getFormatLocalizedString(str_, UIStrings.descendantSRemoved, {PH1: targetNodeLink});
      }
      subElement.appendChild(document.createElement('br'));
      subElement.appendChild(messageElement);
    }
    return messageWrapper;
  }

  /**
   * @param {?SDK.DebuggerModel.DebuggerPausedDetails} details
   * @param {!Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   * @param {!Bindings.BreakpointManager.BreakpointManager} breakpointManager
   * @return {!Promise<void>}
   */
  async render(details, debuggerWorkspaceBinding, breakpointManager) {
    this._contentElement.removeChildren();
    this._contentElement.hidden = !details;
    if (!details) {
      return;
    }

    const status = this._contentElement.createChild('div', 'paused-status');

    const errorLike = details.reason === Protocol.Debugger.PausedEventReason.Exception ||
        details.reason === Protocol.Debugger.PausedEventReason.PromiseRejection ||
        details.reason === Protocol.Debugger.PausedEventReason.Assert ||
        details.reason === Protocol.Debugger.PausedEventReason.OOM;
    let messageWrapper;
    if (details.reason === Protocol.Debugger.PausedEventReason.DOM) {
      messageWrapper = await DebuggerPausedMessage._createDOMBreakpointHitMessage(details);
    } else if (details.reason === Protocol.Debugger.PausedEventReason.EventListener) {
      let eventNameForUI = '';
      if (details.auxData) {
        eventNameForUI = SDK.DOMDebuggerModel.DOMDebuggerManager.instance().resolveEventListenerBreakpointTitle(
            /** @type {!{directiveText: string, eventName: string, targetName: string, webglErrorName: string}} */ (
                details.auxData));
      }
      messageWrapper = buildWrapper(i18nString(UIStrings.pausedOnEventListener), eventNameForUI);
    } else if (details.reason === Protocol.Debugger.PausedEventReason.XHR) {
      const auxData = /** @type {!PausedDetailsAuxData} */ (details.auxData);
      messageWrapper = buildWrapper(i18nString(UIStrings.pausedOnXhrOrFetch), auxData.url || '');
    } else if (details.reason === Protocol.Debugger.PausedEventReason.Exception) {
      const auxData = /** @type {!PausedDetailsAuxData} */ (details.auxData);
      const description = auxData.description || auxData.value || '';
      const descriptionWithoutStack = DebuggerPausedMessage._descriptionWithoutStack(description);
      messageWrapper = buildWrapper(i18nString(UIStrings.pausedOnException), descriptionWithoutStack, description);
    } else if (details.reason === Protocol.Debugger.PausedEventReason.PromiseRejection) {
      const auxData = /** @type {!PausedDetailsAuxData} */ (details.auxData);
      const description = auxData.description || auxData.value || '';
      const descriptionWithoutStack = DebuggerPausedMessage._descriptionWithoutStack(description);
      messageWrapper =
          buildWrapper(i18nString(UIStrings.pausedOnPromiseRejection), descriptionWithoutStack, description);
    } else if (details.reason === Protocol.Debugger.PausedEventReason.Assert) {
      messageWrapper = buildWrapper(i18nString(UIStrings.pausedOnAssertion));
    } else if (details.reason === Protocol.Debugger.PausedEventReason.DebugCommand) {
      messageWrapper = buildWrapper(i18nString(UIStrings.pausedOnDebuggedFunction));
    } else if (details.reason === Protocol.Debugger.PausedEventReason.OOM) {
      messageWrapper = buildWrapper(i18nString(UIStrings.pausedBeforePotentialOutofmemory));
    } else if (
        details.reason === Protocol.Debugger.PausedEventReason.CSPViolation && details.auxData &&
        details.auxData['violationType']) {
      const text = /** @type {string} */ (details.auxData['violationType']);
      if (text === Protocol.DOMDebugger.CSPViolationType.TrustedtypeSinkViolation) {
        messageWrapper =
            buildWrapper(i18nString(UIStrings.pausedOnCspViolation), i18nString(UIStrings.trustedTypeSinkViolation));
      } else if (text === Protocol.DOMDebugger.CSPViolationType.TrustedtypePolicyViolation) {
        messageWrapper =
            buildWrapper(i18nString(UIStrings.pausedOnCspViolation), i18nString(UIStrings.trustedTypePolicyViolation));
      }
    } else if (details.callFrames.length) {
      const uiLocation = await debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location());
      const breakpoint = uiLocation ? breakpointManager.findBreakpoint(uiLocation) : null;
      const defaultText = breakpoint ? i18nString(UIStrings.pausedOnBreakpoint) : i18nString(UIStrings.debuggerPaused);
      messageWrapper = buildWrapper(defaultText);
    } else {
      console.warn(
          'ScriptsPanel paused, but callFrames.length is zero.');  // TODO remove this once we understand this case better
    }

    status.classList.toggle('error-reason', errorLike);
    if (messageWrapper) {
      status.appendChild(messageWrapper);
    }

    /**
     * @param  {string} mainText
     * @param  {string=} subText
     * @param  {string=} title
     * @return {!Element}
     */
    function buildWrapper(mainText, subText, title) {
      const messageWrapper = document.createElement('span');
      const mainElement = messageWrapper.createChild('div', 'status-main');
      const icon = UI.Icon.Icon.create(errorLike ? 'smallicon-error' : 'smallicon-info', 'status-icon');
      mainElement.appendChild(icon);
      mainElement.appendChild(document.createTextNode(mainText));
      if (subText) {
        const subElement = messageWrapper.createChild('div', 'status-sub monospace');
        subElement.textContent = subText;
        UI.Tooltip.Tooltip.install(subElement, title || subText);
      }
      return messageWrapper;
    }
  }
}

export const BreakpointTypeNouns = new Map([
  [Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified, i18nLazyString(UIStrings.subtreeModifications)],
  [Protocol.DOMDebugger.DOMBreakpointType.AttributeModified, i18nLazyString(UIStrings.attributeModifications)],
  [Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved, i18nLazyString(UIStrings.nodeRemoval)],
]);

/**
 * @typedef {{
 *   description: (string|undefined),
 *   url: (string|undefined),
 *   value: (string|undefined),
 * }}
 */
let PausedDetailsAuxData;  // eslint-disable-line no-unused-vars
