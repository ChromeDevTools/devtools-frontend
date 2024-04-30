// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as Bindings from '../../models/bindings/bindings.js';
import type * as BreakpointManager from '../../models/breakpoints/breakpoints.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';

import {getLocalizedBreakpointName} from './CategorizedBreakpointL10n.js';
import debuggerPausedMessageStyles from './debuggerPausedMessage.css.js';

const UIStrings = {
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
   *@description We pause exactly when the promise rejection is happening, so that the user can see where in the code it comes from.
   * A Promise is a Web API object (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
   * that will either be 'fulfilled' or 'rejected' at some unknown time in the future.
   * The subject of the term is omited but it is "Execution", that is, "Execution was paused on <event>".
   */
  pausedOnPromiseRejection: 'Paused on `promise` rejection',
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
  /**
   *@description Error message text
   *@example {Snag Error} PH1
   */
  webglErrorFiredS: 'WebGL Error Fired ({PH1})',
  /**
   *@description Text in DOMDebugger Model
   *@example {"script-src 'self'"} PH1
   */
  scriptBlockedDueToContent: 'Script blocked due to Content Security Policy directive: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/DebuggerPausedMessage.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class DebuggerPausedMessage {
  private readonly elementInternal: HTMLDivElement;
  private contentElement: HTMLElement;
  constructor() {
    this.elementInternal = document.createElement('div');
    this.elementInternal.classList.add('paused-message');
    this.elementInternal.classList.add('flex-none');
    const root = UI.Utils.createShadowRootWithCoreStyles(
        this.elementInternal, {cssFile: [debuggerPausedMessageStyles], delegatesFocus: undefined});
    this.contentElement = (root.createChild('div') as HTMLElement);
    UI.ARIAUtils.markAsPoliteLiveRegion(this.elementInternal, false);
  }

  element(): Element {
    return this.elementInternal;
  }

  private static descriptionWithoutStack(description: string): string {
    const firstCallFrame = /^\s+at\s/m.exec(description);
    return firstCallFrame ? description.substring(0, firstCallFrame.index - 1) :
                            description.substring(0, description.lastIndexOf('\n'));
  }

  private static async createDOMBreakpointHitMessage(details: SDK.DebuggerModel.DebuggerPausedDetails):
      Promise<Element> {
    const messageWrapper = document.createElement('span');
    const domDebuggerModel = details.debuggerModel.target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    if (!details.auxData || !domDebuggerModel) {
      return messageWrapper;
    }
    const data = domDebuggerModel.resolveDOMBreakpointData((details.auxData as {
      type: Protocol.DOMDebugger.DOMBreakpointType,
      nodeId: Protocol.DOM.NodeId,
      targetNodeId: Protocol.DOM.NodeId,
      insertion: boolean,
    }));
    if (!data) {
      return messageWrapper;
    }

    const mainElement = messageWrapper.createChild('div', 'status-main');
    const mainIcon = new IconButton.Icon.Icon();
    mainIcon.data = {
      iconName: 'info',
      color: 'var(--sys-color-on-yellow-container)',
      width: '16px',
      height: '16px',
    };
    mainElement.appendChild(mainIcon);
    const breakpointType = BreakpointTypeNouns.get(data.type);
    mainElement.appendChild(document.createTextNode(
        i18nString(UIStrings.pausedOnS, {PH1: breakpointType ? breakpointType() : String(null)})));

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

  static #findEventNameForUi(detailsAuxData?: SDK.DebuggerModel.EventListenerPausedDetailsAuxData): string {
    if (!detailsAuxData) {
      return '';
    }
    const {eventName, webglErrorName, directiveText, targetName} = detailsAuxData;

    if (eventName === 'instrumentation:webglErrorFired' && webglErrorName) {
      // If there is a hex code of the error, display only this.
      const errorName = webglErrorName.replace(/^.*(0x[0-9a-f]+).*$/i, '$1');
      return i18nString(UIStrings.webglErrorFiredS, {PH1: errorName});
    }
    if (eventName === 'instrumentation:scriptBlockedByCSP' && directiveText) {
      return i18nString(UIStrings.scriptBlockedDueToContent, {PH1: directiveText});
    }

    let breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint|null =
        SDK.EventBreakpointsModel.EventBreakpointsManager.instance().resolveEventListenerBreakpoint(detailsAuxData);
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

  async render(
      details: SDK.DebuggerModel.DebuggerPausedDetails|null,
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding,
      breakpointManager: BreakpointManager.BreakpointManager.BreakpointManager): Promise<void> {
    this.contentElement.removeChildren();
    this.contentElement.hidden = !details;
    if (!details) {
      return;
    }

    const status = this.contentElement.createChild('div', 'paused-status');

    const errorLike = details.reason === Protocol.Debugger.PausedEventReason.Exception ||
        details.reason === Protocol.Debugger.PausedEventReason.PromiseRejection ||
        details.reason === Protocol.Debugger.PausedEventReason.Assert ||
        details.reason === Protocol.Debugger.PausedEventReason.OOM;
    let messageWrapper;
    if (details.reason === Protocol.Debugger.PausedEventReason.DOM) {
      messageWrapper = await DebuggerPausedMessage.createDOMBreakpointHitMessage(details);
    } else if (details.reason === Protocol.Debugger.PausedEventReason.EventListener) {
      const eventNameForUI = DebuggerPausedMessage.#findEventNameForUi(
          details.auxData as SDK.DebuggerModel.EventListenerPausedDetailsAuxData);
      messageWrapper = buildWrapper(i18nString(UIStrings.pausedOnEventListener), eventNameForUI);
    } else if (details.reason === Protocol.Debugger.PausedEventReason.XHR) {
      const auxData = (details.auxData as PausedDetailsAuxData);
      messageWrapper = buildWrapper(i18nString(UIStrings.pausedOnXhrOrFetch), auxData.url || '');
    } else if (details.reason === Protocol.Debugger.PausedEventReason.Exception) {
      const auxData = (details.auxData as PausedDetailsAuxData);
      const description = auxData.description || auxData.value || '';
      const descriptionWithoutStack = DebuggerPausedMessage.descriptionWithoutStack(description);
      messageWrapper = buildWrapper(i18nString(UIStrings.pausedOnException), descriptionWithoutStack, description);
    } else if (details.reason === Protocol.Debugger.PausedEventReason.PromiseRejection) {
      const auxData = (details.auxData as PausedDetailsAuxData);
      const description = auxData.description || auxData.value || '';
      const descriptionWithoutStack = DebuggerPausedMessage.descriptionWithoutStack(description);
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
      const text = (details.auxData['violationType'] as string);
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

    function buildWrapper(mainText: string, subText?: string, title?: string): Element {
      const messageWrapper = document.createElement('span');
      const mainElement = messageWrapper.createChild('div', 'status-main');
      const mainIcon = new IconButton.Icon.Icon();
      mainIcon.data = {
        iconName: errorLike ? 'cross-circle-filled' : 'info',
        color: errorLike ? 'var(--icon-error)' : 'var(--sys-color-on-yellow-container)',
        width: '16px',
        height: '16px',
      };
      mainElement.appendChild(mainIcon);
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
interface PausedDetailsAuxData {
  description?: string;
  url?: Platform.DevToolsPath.UrlString;
  value?: string;
}
