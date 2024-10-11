// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as RequestLinkIcon from '../../ui/components/request_link_icon/request_link_icon.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
// eslint-disable-next-line rulesdir/es_modules_import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {format, updateStyle} from './ConsoleFormat.js';
import consoleViewStyles from './consoleView.css.js';
import type {ConsoleViewportElement} from './ConsoleViewport.js';
import {augmentErrorStackWithScriptIds, parseSourcePositionsFromErrorStack} from './ErrorStackParser.js';

const UIStrings = {
  /**
   * @description Message element text content in Console View Message of the Console panel. Shown
   * when the user tried to run console.clear() but the 'Preserve log' option is enabled, which stops
   * the log from being cleared.
   */
  consoleclearWasPreventedDueTo: '`console.clear()` was prevented due to \'Preserve log\'',
  /**
   * @description Text shown in the Console panel after the user has cleared the console, which
   * removes all messages from the console so that it is empty.
   */
  consoleWasCleared: 'Console was cleared',
  /**
   *@description Message element title in Console View Message of the Console panel
   *@example {Ctrl+L} PH1
   */
  clearAllMessagesWithS: 'Clear all messages with {PH1}',
  /**
   *@description Message prefix in Console View Message of the Console panel
   */
  assertionFailed: 'Assertion failed: ',
  /**
   *@description Message text in Console View Message of the Console panel
   *@example {console.log(1)} PH1
   */
  violationS: '`[Violation]` {PH1}',
  /**
   *@description Message text in Console View Message of the Console panel
   *@example {console.log(1)} PH1
   */
  interventionS: '`[Intervention]` {PH1}',
  /**
   *@description Message text in Console View Message of the Console panel
   *@example {console.log(1)} PH1
   */
  deprecationS: '`[Deprecation]` {PH1}',
  /**
   *@description Note title in Console View Message of the Console panel
   */
  thisValueWillNotBeCollectedUntil: 'This value will not be collected until console is cleared.',
  /**
   *@description Note title in Console View Message of the Console panel
   */
  thisValueWasEvaluatedUponFirst: 'This value was evaluated upon first expanding. It may have changed since then.',
  /**
   *@description Note title in Console View Message of the Console panel
   */
  functionWasResolvedFromBound: 'Function was resolved from bound function.',
  /**
   * @description Shown in the Console panel when an exception is thrown when trying to access a
   * property on an object. Should be translated.
   */
  exception: '<exception>',
  /**
   *@description Text to indicate an item is a warning
   */
  warning: 'Warning',
  /**
   *@description Text for errors
   */
  error: 'Error',
  /**
   * @description Accessible label for an icon. The icon is used to mark console messages that
   * originate from a logpoint. Logpoints are special breakpoints that log a user-provided JavaScript
   * expression to the DevTools console.
   */
  logpoint: 'Logpoint',
  /**
   * @description Accessible label for an icon. The icon is used to mark console messages that
   * originate from conditional breakpoints.
   */
  cndBreakpoint: 'Conditional Breakpoint',
  /**
   * @description Announced by the screen reader to indicate how many times a particular message in
   * the console was repeated.
   */
  repeatS: '{n, plural, =1 {Repeated # time} other {Repeated # times}}',
  /**
   * @description Announced by the screen reader to indicate how many times a particular warning
   * message in the console was repeated.
   */
  warningS: '{n, plural, =1 {Warning, Repeated # time} other {Warning, Repeated # times}}',
  /**
   * @description Announced by the screen reader to indicate how many times a particular error
   * message in the console was repeated.
   */
  errorS: '{n, plural, =1 {Error, Repeated # time} other {Error, Repeated # times}}',
  /**
   *@description Text appended to grouped console messages that are related to URL requests
   */
  url: '<URL>',
  /**
   *@description Text appended to grouped console messages about tasks that took longer than N ms
   */
  tookNms: 'took <N>ms',
  /**
   *@description Text appended to grouped console messages about tasks that are related to some DOM event
   */
  someEvent: '<some> event',
  /**
   *@description Text appended to grouped console messages about tasks that are related to a particular milestone
   */
  Mxx: ' M<XX>',
  /**
   *@description Text appended to grouped console messages about tasks that are related to autofill completions
   */
  attribute: '<attribute>',
  /**
   *@description Text for the index of something
   */
  index: '(index)',
  /**
   *@description Text for the value of something
   */
  value: 'Value',
  /**
   *@description Title of the Console tool
   */
  console: 'Console',
  /**
   *@description Message to indicate a console message with a stack table is expanded
   */
  stackMessageExpanded: 'Stack table expanded',
  /**
   *@description Message to indicate a console message with a stack table is collapsed
   */
  stackMessageCollapsed: 'Stack table collapsed',
  /**
   *@description Message to offer insights for a console error message
   */
  explainThisError: 'Understand this error',
  /**
   *@description Message to offer insights for a console warning message
   */
  explainThisWarning: 'Understand this warning',
  /**
   *@description Message to offer insights for a console message
   */
  explainThisMessage: 'Understand this message',
  /**
   *@description Message to offer insights for a console error message
   */
  explainThisErrorWithAI: 'Understand this error. Powered by AI.',
  /**
   *@description Message to offer insights for a console warning message
   */
  explainThisWarningWithAI: 'Understand this warning. Powered by AI.',
  /**
   *@description Message to offer insights for a console message
   */
  explainThisMessageWithAI: 'Understand this message. Powered by AI',
};
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsoleViewMessage.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const elementToMessage = new WeakMap<Element, ConsoleViewMessage>();

export const getMessageForElement = (element: Element): ConsoleViewMessage|undefined => {
  return elementToMessage.get(element);
};

// This value reflects the 18px min-height of .console-message, plus the
// 1px border of .console-message-wrapper. Keep in sync with consoleView.css.
const defaultConsoleRowHeight = 19;

const parameterToRemoteObject = (runtimeModel: SDK.RuntimeModel.RuntimeModel|null):
    (parameter?: SDK.RemoteObject.RemoteObject|Protocol.Runtime.RemoteObject|string) => SDK.RemoteObject.RemoteObject =>
        (parameter?: string|SDK.RemoteObject.RemoteObject|Protocol.Runtime.RemoteObject) => {
          if (parameter instanceof SDK.RemoteObject.RemoteObject) {
            return parameter;
          }
          if (!runtimeModel) {
            return SDK.RemoteObject.RemoteObject.fromLocalObject(parameter);
          }
          if (typeof parameter === 'object') {
            return runtimeModel.createRemoteObject(parameter);
          }
          return runtimeModel.createRemoteObjectFromPrimitiveValue(parameter);
        };

const EXPLAIN_HOVER_ACTION_ID = 'explain.console-message.hover';
const EXPLAIN_CONTEXT_ERROR_ACTION_ID = 'explain.console-message.context.error';
const EXPLAIN_CONTEXT_WARNING_ACTION_ID = 'explain.console-message.context.warning';
const EXPLAIN_CONTEXT_OTHER_ACTION_ID = 'explain.console-message.context.other';

const hoverButtonObserver = new IntersectionObserver(results => {
  for (const result of results) {
    if (result.intersectionRatio > 0) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightHoverButtonShown);
    }
  }
});

export class ConsoleViewMessage implements ConsoleViewportElement {
  protected message: SDK.ConsoleModel.ConsoleMessage;
  private readonly linkifier: Components.Linkifier.Linkifier;
  private repeatCountInternal: number;
  private closeGroupDecorationCount: number;
  private consoleGroupInternal: ConsoleGroupViewMessage|null;
  private selectableChildren: {
    element: HTMLElement,
    forceSelect: () => void,
  }[];
  private readonly messageResized: (arg0: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>) => void;
  // The wrapper that contains consoleRowWrapper and other elements in a column.
  protected elementInternal: HTMLElement|null;
  // The element that wraps console message elements in a row.
  protected consoleRowWrapper: HTMLElement|null = null;
  private readonly previewFormatter: ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter;
  private searchRegexInternal: RegExp|null;
  protected messageIcon: IconButton.Icon.Icon|null;
  private traceExpanded: boolean;
  private expandTrace: ((arg0: boolean) => void)|null;
  protected anchorElement: HTMLElement|null;
  protected contentElementInternal: HTMLElement|null;
  private nestingLevelMarkers: HTMLElement[]|null;
  private searchHighlightNodes: Element[];
  private searchHighlightNodeChanges: UI.UIUtils.HighlightChange[];
  private isVisibleInternal: boolean;
  private cachedHeight: number;
  private messagePrefix: string;
  private timestampElement: HTMLElement|null;
  private inSimilarGroup: boolean;
  private similarGroupMarker: HTMLElement|null;
  private lastInSimilarGroup: boolean;
  private groupKeyInternal: string;
  protected repeatCountElement: UI.UIUtils.DevToolsSmallBubble|null;
  private requestResolver: Logs.RequestResolver.RequestResolver;
  private issueResolver: IssuesManager.IssueResolver.IssueResolver;
  #adjacentUserCommandResult: boolean = false;

  /** Formatting Error#stack is asynchronous. Allow tests to wait for the result */
  #formatErrorStackPromiseForTest = Promise.resolve();

  constructor(
      consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier,
      requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver,
      onResize: (arg0: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>) => void) {
    this.message = consoleMessage;
    this.linkifier = linkifier;
    this.requestResolver = requestResolver;
    this.issueResolver = issueResolver;
    this.repeatCountInternal = 1;
    this.closeGroupDecorationCount = 0;
    this.selectableChildren = [];
    this.messageResized = onResize;
    this.elementInternal = null;

    this.previewFormatter = new ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
    this.searchRegexInternal = null;
    this.messageIcon = null;
    this.traceExpanded = false;
    this.expandTrace = null;
    this.anchorElement = null;
    this.contentElementInternal = null;
    this.nestingLevelMarkers = null;
    this.searchHighlightNodes = [];
    this.searchHighlightNodeChanges = [];
    this.isVisibleInternal = false;
    this.cachedHeight = 0;
    this.messagePrefix = '';
    this.timestampElement = null;
    this.inSimilarGroup = false;
    this.similarGroupMarker = null;
    this.lastInSimilarGroup = false;
    this.groupKeyInternal = '';
    this.repeatCountElement = null;
    this.consoleGroupInternal = null;
  }

  setInsight(insight: HTMLElement): void {
    this.elementInternal?.querySelector('devtools-console-insight')?.remove();
    this.elementInternal?.append(insight);
    this.elementInternal?.classList.toggle('has-insight', true);
    insight.addEventListener('close', () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightClosed);
      this.elementInternal?.classList.toggle('has-insight', false);
      this.elementInternal?.removeChild(insight);
    }, {once: true});
  }

  element(): HTMLElement {
    return this.toMessageElement();
  }

  wasShown(): void {
    this.isVisibleInternal = true;
  }

  onResize(): void {
  }

  willHide(): void {
    this.isVisibleInternal = false;
    this.cachedHeight = this.element().offsetHeight;
  }

  isVisible(): boolean {
    return this.isVisibleInternal;
  }

  fastHeight(): number {
    if (this.cachedHeight) {
      return this.cachedHeight;
    }
    return this.approximateFastHeight();
  }

  approximateFastHeight(): number {
    return defaultConsoleRowHeight;
  }

  consoleMessage(): SDK.ConsoleModel.ConsoleMessage {
    return this.message;
  }

  formatErrorStackPromiseForTest(): Promise<void> {
    return this.#formatErrorStackPromiseForTest;
  }

  protected buildMessage(): HTMLElement {
    let messageElement;
    let messageText: Common.UIString.LocalizedString|string = this.message.messageText;
    if (this.message.source === Common.Console.FrontendMessageSource.ConsoleAPI) {
      switch (this.message.type) {
        case Protocol.Runtime.ConsoleAPICalledEventType.Trace:
          messageElement = this.format(this.message.parameters || ['console.trace']);
          break;
        case Protocol.Runtime.ConsoleAPICalledEventType.Clear:
          messageElement = document.createElement('span');
          messageElement.classList.add('console-info');
          if (Common.Settings.Settings.instance().moduleSetting('preserve-console-log').get()) {
            messageElement.textContent = i18nString(UIStrings.consoleclearWasPreventedDueTo);
          } else {
            messageElement.textContent = i18nString(UIStrings.consoleWasCleared);
          }
          UI.Tooltip.Tooltip.install(
              messageElement, i18nString(UIStrings.clearAllMessagesWithS, {
                PH1: String(UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction('console.clear')),
              }));
          break;
        case Protocol.Runtime.ConsoleAPICalledEventType.Dir: {
          const obj = this.message.parameters ? this.message.parameters[0] : undefined;
          const args = ['%O', obj];
          messageElement = this.format(args);
          break;
        }
        case Protocol.Runtime.ConsoleAPICalledEventType.Profile:
        case Protocol.Runtime.ConsoleAPICalledEventType.ProfileEnd:
          messageElement = this.format([messageText]);
          break;
        default: {
          if (this.message.type === Protocol.Runtime.ConsoleAPICalledEventType.Assert) {
            this.messagePrefix = i18nString(UIStrings.assertionFailed);
          }
          if (this.message.parameters && this.message.parameters.length === 1) {
            const parameter = this.message.parameters[0];
            if (typeof parameter !== 'string' && parameter.type === 'string') {
              messageElement = this.tryFormatAsError((parameter.value as string));
            }
          }
          const args = this.message.parameters || [messageText];
          messageElement = messageElement || this.format(args);
        }
      }
    } else {
      if (this.message.source === Protocol.Log.LogEntrySource.Network) {
        messageElement = this.formatAsNetworkRequest() || this.format([messageText]);
      } else {
        const messageInParameters = this.message.parameters && messageText === (this.message.parameters[0] as string);
        // These terms are locked because the console message will not be translated anyway.
        if (this.message.source === Protocol.Log.LogEntrySource.Violation) {
          messageText = i18nString(UIStrings.violationS, {PH1: messageText});
        } else if (this.message.source === Protocol.Log.LogEntrySource.Intervention) {
          messageText = i18nString(UIStrings.interventionS, {PH1: messageText});
        } else if (this.message.source === Protocol.Log.LogEntrySource.Deprecation) {
          messageText = i18nString(UIStrings.deprecationS, {PH1: messageText});
        }
        const args = this.message.parameters || [messageText];
        if (messageInParameters) {
          args[0] = messageText;
        }
        messageElement = this.format(args);
      }
    }
    messageElement.classList.add('console-message-text');

    const formattedMessage = document.createElement('span');
    formattedMessage.classList.add('source-code');
    this.anchorElement = this.buildMessageAnchor();
    if (this.anchorElement) {
      formattedMessage.appendChild(this.anchorElement);
    }
    formattedMessage.appendChild(messageElement);
    return formattedMessage;
  }

  private formatAsNetworkRequest(): HTMLElement|null {
    const request = Logs.NetworkLog.NetworkLog.requestForConsoleMessage(this.message);
    if (!request) {
      return null;
    }
    const messageElement = document.createElement('span');
    if (this.message.level === Protocol.Log.LogEntryLevel.Error) {
      UI.UIUtils.createTextChild(messageElement, request.requestMethod + ' ');
      const linkElement = Components.Linkifier.Linkifier.linkifyRevealable(
          request, request.url(), request.url(), undefined, undefined, 'network-request');
      // Focus is handled by the viewport.
      linkElement.tabIndex = -1;
      this.selectableChildren.push({element: linkElement, forceSelect: () => linkElement.focus()});
      messageElement.appendChild(linkElement);
      if (request.failed) {
        UI.UIUtils.createTextChildren(messageElement, ' ', request.localizedFailDescription || '');
      }
      if (request.statusCode !== 0) {
        UI.UIUtils.createTextChildren(messageElement, ' ', String(request.statusCode));
      }
      const statusText = request.getInferredStatusText();
      if (statusText) {
        UI.UIUtils.createTextChildren(messageElement, ' (', statusText, ')');
      }
    } else {
      const messageText = this.message.messageText;
      const fragment = this.linkifyWithCustomLinkifier(messageText, (text, url, lineNumber, columnNumber) => {
        const linkElement = url === request.url() ?
            Components.Linkifier.Linkifier.linkifyRevealable(
                (request as SDK.NetworkRequest.NetworkRequest), url, request.url(), undefined, undefined,
                'network-request') :
            Components.Linkifier.Linkifier.linkifyURL(
                url, ({text, lineNumber, columnNumber} as Components.Linkifier.LinkifyURLOptions));
        linkElement.tabIndex = -1;
        this.selectableChildren.push({element: linkElement, forceSelect: () => linkElement.focus()});
        return linkElement;
      });
      messageElement.appendChild(fragment);
    }
    return messageElement;
  }

  private createAffectedResourceLinks(): HTMLElement[] {
    const elements = [];
    const requestId = this.message.getAffectedResources()?.requestId;
    if (requestId) {
      const icon = new RequestLinkIcon.RequestLinkIcon.RequestLinkIcon();
      icon.classList.add('resource-links');
      icon.data = {
        affectedRequest: {requestId},
        requestResolver: this.requestResolver,
        displayURL: false,
      };
      elements.push(icon);
    }
    const issueId = this.message.getAffectedResources()?.issueId;
    if (issueId) {
      const icon = new IssueCounter.IssueLinkIcon.IssueLinkIcon();
      icon.classList.add('resource-links');
      icon.data = {issueId, issueResolver: this.issueResolver};
      elements.push(icon);
    }
    return elements;
  }

  #getLinkifierMetric(): Host.UserMetrics.Action|undefined {
    const request = Logs.NetworkLog.NetworkLog.requestForConsoleMessage(this.message);
    if (request?.resourceType().isStyleSheet()) {
      return Host.UserMetrics.Action.StyleSheetInitiatorLinkClicked;
    }
    return undefined;
  }

  protected buildMessageAnchor(): HTMLElement|null {
    const runtimeModel = this.message.runtimeModel();
    if (!runtimeModel) {
      return null;
    }

    const linkify = ({stackFrameWithBreakpoint, scriptId, stackTrace, url, line, column}:
                         SDK.ConsoleModel.ConsoleMessage): HTMLElement|null => {
      const userMetric = this.#getLinkifierMetric();
      if (stackFrameWithBreakpoint) {
        return this.linkifier.maybeLinkifyConsoleCallFrame(runtimeModel.target(), stackFrameWithBreakpoint, {
          inlineFrameIndex: 0,
          revealBreakpoint: true,
          userMetric,
        });
      }
      if (scriptId) {
        return this.linkifier.linkifyScriptLocation(
            runtimeModel.target(), scriptId, url || Platform.DevToolsPath.EmptyUrlString, line,
            {columnNumber: column, inlineFrameIndex: 0, userMetric});
      }
      if (stackTrace && stackTrace.callFrames.length) {
        return this.linkifier.linkifyStackTraceTopFrame(runtimeModel.target(), stackTrace);
      }
      if (url && url !== 'undefined') {
        return this.linkifier.linkifyScriptLocation(
            runtimeModel.target(), /* scriptId */ null, url, line,
            {columnNumber: column, inlineFrameIndex: 0, userMetric});
      }
      return null;
    };
    const anchorElement = linkify(this.message);
    // Append a space to prevent the anchor text from being glued to the console message when the user selects and copies the console messages.
    if (anchorElement) {
      anchorElement.tabIndex = -1;
      this.selectableChildren.push({
        element: anchorElement,
        forceSelect: () => anchorElement.focus(),
      });
      const anchorWrapperElement = document.createElement('span');
      anchorWrapperElement.classList.add('console-message-anchor');
      anchorWrapperElement.appendChild(anchorElement);

      for (const element of this.createAffectedResourceLinks()) {
        UI.UIUtils.createTextChild(anchorWrapperElement, ' ');
        anchorWrapperElement.append(element);
      }

      UI.UIUtils.createTextChild(anchorWrapperElement, ' ');
      return anchorWrapperElement;
    }
    return null;
  }

  private buildMessageWithStackTrace(runtimeModel: SDK.RuntimeModel.RuntimeModel): HTMLElement {
    const icon = IconButton.Icon.create('triangle-right', 'console-message-expand-icon');
    const {stackTraceElement, contentElement, messageElement, clickableElement, toggleElement} =
        this.buildMessageHelper(runtimeModel.target(), this.message.stackTrace, icon);
    // We debounce the trace expansion metric in case this was accidental.
    const DEBOUNCE_MS = 300;
    let debounce: number|undefined;
    this.expandTrace = (expand: boolean) => {
      if (expand) {
        debounce = window.setTimeout(() => {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.TraceExpanded);
        }, DEBOUNCE_MS);
      } else {
        clearTimeout(debounce);
      }
      icon.name = expand ? 'triangle-down' : 'triangle-right';
      stackTraceElement.classList.toggle('hidden-stack-trace', !expand);
      const stackTableState =
          expand ? i18nString(UIStrings.stackMessageExpanded) : i18nString(UIStrings.stackMessageCollapsed);
      UI.ARIAUtils.setLabel(contentElement, `${messageElement.textContent} ${stackTableState}`);
      UI.ARIAUtils.alert(stackTableState);
      UI.ARIAUtils.setExpanded(clickableElement, expand);
      this.traceExpanded = expand;
    };

    const toggleStackTrace = (event: Event): void => {
      if (UI.UIUtils.isEditing() || contentElement.hasSelection()) {
        return;
      }
      this.expandTrace && this.expandTrace(stackTraceElement.classList.contains('hidden-stack-trace'));
      event.consume();
    };

    clickableElement.addEventListener('click', toggleStackTrace, false);
    if (this.message.type === Protocol.Runtime.ConsoleAPICalledEventType.Trace &&
        Common.Settings.Settings.instance().moduleSetting('console-trace-expand').get()) {
      this.expandTrace(true);
    }

    // @ts-ignore
    toggleElement._expandStackTraceForTest = this.expandTrace.bind(this, true);
    return toggleElement;
  }

  private buildMessageWithIgnoreLinks(): HTMLElement {
    const {toggleElement} = this.buildMessageHelper(null, undefined, null);
    return toggleElement;
  }

  private buildMessageHelper(
      target: SDK.Target.Target|null, stackTrace: Protocol.Runtime.StackTrace|undefined,
      icon: IconButton.Icon.Icon|null): {
    stackTraceElement: HTMLElement,
    contentElement: HTMLElement,
    messageElement: HTMLElement,
    clickableElement: HTMLElement,
    toggleElement: HTMLElement,
  } {
    const toggleElement = document.createElement('div');
    toggleElement.classList.add('console-message-stack-trace-toggle');
    const contentElement = toggleElement.createChild('div', 'console-message-stack-trace-wrapper');

    const messageElement = this.buildMessage();
    const clickableElement = contentElement.createChild('div');
    UI.ARIAUtils.setExpanded(clickableElement, false);
    if (icon) {
      clickableElement.appendChild(icon);
    }
    // Intercept focus to avoid highlight on click.
    clickableElement.tabIndex = -1;
    clickableElement.appendChild(messageElement);
    const stackTraceElement = contentElement.createChild('div');
    const stackTracePreview = Components.JSPresentationUtils.buildStackTracePreviewContents(
        target, this.linkifier, {stackTrace, tabStops: undefined, widthConstrained: true});
    stackTraceElement.appendChild(stackTracePreview.element);
    for (const linkElement of stackTracePreview.links) {
      this.selectableChildren.push({element: linkElement, forceSelect: () => linkElement.focus()});
    }
    stackTraceElement.classList.add('hidden-stack-trace');
    UI.ARIAUtils.setLabel(
        contentElement, `${messageElement.textContent} ${i18nString(UIStrings.stackMessageCollapsed)}`);
    UI.ARIAUtils.markAsGroup(stackTraceElement);

    return {stackTraceElement, contentElement, messageElement, clickableElement, toggleElement};
  }

  private format(rawParameters: (string|SDK.RemoteObject.RemoteObject|Protocol.Runtime.RemoteObject|undefined)[]):
      HTMLElement {
    // This node is used like a Builder. Values are continually appended onto it.
    const formattedResult = document.createElement('span');
    if (this.messagePrefix) {
      formattedResult.createChild('span').textContent = this.messagePrefix;
    }
    if (!rawParameters.length) {
      return formattedResult;
    }

    // Formatting code below assumes that parameters are all wrappers whereas frontend console
    // API allows passing arbitrary values as messages (strings, numbers, etc.). Wrap them here.
    // FIXME: Only pass runtime wrappers here.
    let parameters = rawParameters.map(parameterToRemoteObject(this.message.runtimeModel()));

    // There can be string log and string eval result. We distinguish between them based on message type.
    const shouldFormatMessage =
        SDK.RemoteObject.RemoteObject.type((parameters as SDK.RemoteObject.RemoteObject[])[0]) === 'string' &&
        (this.message.type !== SDK.ConsoleModel.FrontendMessageType.Result ||
         this.message.level === Protocol.Log.LogEntryLevel.Error);

    // Multiple parameters with the first being a format string. Save unused substitutions.
    if (shouldFormatMessage) {
      parameters = this.formatWithSubstitutionString(
          (parameters[0].description as string), parameters.slice(1), formattedResult);
      if (parameters.length) {
        UI.UIUtils.createTextChild(formattedResult, ' ');
      }
    }

    // Single parameter, or unused substitutions from above.
    for (let i = 0; i < parameters.length; ++i) {
      // Inline strings when formatting.
      if (shouldFormatMessage && parameters[i].type === 'string') {
        formattedResult.appendChild(this.linkifyStringAsFragment(parameters[i].description || ''));
      } else {
        formattedResult.appendChild(this.formatParameter(parameters[i], false, true));
      }
      if (i < parameters.length - 1) {
        UI.UIUtils.createTextChild(formattedResult, ' ');
      }
    }
    return formattedResult;
  }

  protected formatParameter(
      output: SDK.RemoteObject.RemoteObject, forceObjectFormat?: boolean, includePreview?: boolean): HTMLElement {
    if (output.customPreview()) {
      return new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(output).element as HTMLElement;
    }

    const outputType = forceObjectFormat ? 'object' : (output.subtype || output.type);
    let element;
    switch (outputType) {
      case 'error':
        element = this.formatParameterAsError(output);
        break;
      case 'function':
        element = this.formatParameterAsFunction(output, includePreview);
        break;
      case 'array':
      case 'arraybuffer':
      case 'blob':
      case 'dataview':
      case 'generator':
      case 'iterator':
      case 'map':
      case 'object':
      case 'promise':
      case 'proxy':
      case 'set':
      case 'typedarray':
      case 'wasmvalue':
      case 'weakmap':
      case 'weakset':
      case 'webassemblymemory':
        element = this.formatParameterAsObject(output, includePreview);
        break;
      case 'node':
        element = output.isNode() ? this.formatParameterAsNode(output) : this.formatParameterAsObject(output, false);
        break;
      case 'trustedtype':
        element = this.formatParameterAsObject(output, false);
        break;
      case 'string':
        element = this.formatParameterAsString(output);
        break;
      case 'boolean':
      case 'date':
      case 'null':
      case 'number':
      case 'regexp':
      case 'symbol':
      case 'undefined':
      case 'bigint':
        element = this.formatParameterAsValue(output);
        break;
      default:
        element = this.formatParameterAsValue(output);
        console.error(`Tried to format remote object of unknown type ${outputType}.`);
    }
    element.classList.add(`object-value-${outputType}`);
    element.classList.add('source-code');
    return element;
  }

  private formatParameterAsValue(obj: SDK.RemoteObject.RemoteObject): HTMLElement {
    const result = document.createElement('span');
    const description = obj.description || '';
    if (description.length > getMaxTokenizableStringLength()) {
      const propertyValue = new ObjectUI.ObjectPropertiesSection.ExpandableTextPropertyValue(
          document.createElement('span'), description, getLongStringVisibleLength());
      result.appendChild(propertyValue.element);
    } else {
      UI.UIUtils.createTextChild(result, description);
    }
    result.addEventListener('contextmenu', this.contextMenuEventFired.bind(this, obj), false);
    return result;
  }

  private formatParameterAsTrustedType(obj: SDK.RemoteObject.RemoteObject): HTMLElement {
    const result = document.createElement('span');
    const trustedContentSpan = document.createElement('span');
    trustedContentSpan.appendChild(this.formatParameterAsString(obj));
    trustedContentSpan.classList.add('object-value-string');
    UI.UIUtils.createTextChild(result, `${obj.className} `);
    result.appendChild(trustedContentSpan);
    return result;
  }

  private formatParameterAsObject(obj: SDK.RemoteObject.RemoteObject, includePreview?: boolean): HTMLElement {
    const titleElement = document.createElement('span');
    titleElement.classList.add('console-object');
    if (includePreview && obj.preview) {
      titleElement.classList.add('console-object-preview');
      this.previewFormatter.appendObjectPreview(titleElement, obj.preview, false /* isEntry */);
      ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.appendMemoryIcon(titleElement, obj);
    } else if (obj.type === 'function') {
      const functionElement = titleElement.createChild('span');
      void ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.formatObjectAsFunction(obj, functionElement, false);
      titleElement.classList.add('object-value-function');
    } else if (obj.subtype === 'trustedtype') {
      titleElement.appendChild(this.formatParameterAsTrustedType(obj));
    } else {
      UI.UIUtils.createTextChild(titleElement, obj.description || '');
    }

    if (!obj.hasChildren || obj.customPreview()) {
      return titleElement;
    }

    const note = titleElement.createChild('span', 'object-state-note info-note');
    if (this.message.type === SDK.ConsoleModel.FrontendMessageType.QueryObjectResult) {
      UI.Tooltip.Tooltip.install(note, i18nString(UIStrings.thisValueWillNotBeCollectedUntil));
    } else {
      UI.Tooltip.Tooltip.install(note, i18nString(UIStrings.thisValueWasEvaluatedUponFirst));
    }

    const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection(obj, titleElement, this.linkifier);
    section.element.classList.add('console-view-object-properties-section');
    section.enableContextMenu();
    section.setShowSelectionOnKeyboardFocus(true, true);
    this.selectableChildren.push(section);
    section.addEventListener(UI.TreeOutline.Events.ElementAttached, this.messageResized);
    section.addEventListener(UI.TreeOutline.Events.ElementExpanded, this.messageResized);
    section.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this.messageResized);
    return section.element;
  }

  private formatParameterAsFunction(originalFunction: SDK.RemoteObject.RemoteObject, includePreview?: boolean):
      HTMLElement {
    const result = document.createElement('span');
    void SDK.RemoteObject.RemoteFunction.objectAsFunction(originalFunction)
        .targetFunction()
        .then(formatTargetFunction.bind(this));
    return result;

    function formatTargetFunction(this: ConsoleViewMessage, targetFunction: SDK.RemoteObject.RemoteObject): void {
      const functionElement = document.createElement('span');
      const promise = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.formatObjectAsFunction(
          targetFunction, functionElement, true, includePreview);
      result.appendChild(functionElement);
      if (targetFunction !== originalFunction) {
        const note = result.createChild('span', 'object-state-note info-note');
        UI.Tooltip.Tooltip.install(note, i18nString(UIStrings.functionWasResolvedFromBound));
      }
      result.addEventListener('contextmenu', this.contextMenuEventFired.bind(this, originalFunction), false);
      void promise.then(() => this.formattedParameterAsFunctionForTest());
    }
  }

  private formattedParameterAsFunctionForTest(): void {
  }

  private contextMenuEventFired(obj: SDK.RemoteObject.RemoteObject, event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(obj);
    void contextMenu.show();
  }

  protected renderPropertyPreviewOrAccessor(
      object: SDK.RemoteObject.RemoteObject|null, property: Protocol.Runtime.PropertyPreview, propertyPath: {
        name: (string|symbol),
      }[]): HTMLElement {
    if (property.type === 'accessor') {
      return this.formatAsAccessorProperty(object, propertyPath.map(property => property.name.toString()), false);
    }
    return this.previewFormatter.renderPropertyPreview(
        property.type, 'subtype' in property ? property.subtype : undefined, null, property.value);
  }

  private formatParameterAsNode(remoteObject: SDK.RemoteObject.RemoteObject): HTMLElement {
    const result = document.createElement('span');

    const domModel = remoteObject.runtimeModel().target().model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return result;
    }
    void domModel.pushObjectAsNodeToFrontend(remoteObject).then(async (node: SDK.DOMModel.DOMNode|null) => {
      if (!node) {
        result.appendChild(this.formatParameterAsObject(remoteObject, false));
        return;
      }
      const renderResult = await UI.UIUtils.Renderer.render((node as Object));
      if (renderResult) {
        if (renderResult.tree) {
          this.selectableChildren.push(renderResult.tree);
          renderResult.tree.addEventListener(UI.TreeOutline.Events.ElementAttached, this.messageResized);
          renderResult.tree.addEventListener(UI.TreeOutline.Events.ElementExpanded, this.messageResized);
          renderResult.tree.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this.messageResized);
        }
        result.appendChild(renderResult.node);
      } else {
        result.appendChild(this.formatParameterAsObject(remoteObject, false));
      }
      this.formattedParameterAsNodeForTest();
    });

    return result;
  }

  private formattedParameterAsNodeForTest(): void {
  }

  private formatParameterAsString(output: SDK.RemoteObject.RemoteObject): HTMLElement {
    const description = output.description ?? '';
    const text = Platform.StringUtilities.formatAsJSLiteral(description);
    const result = document.createElement('span');
    result.addEventListener('contextmenu', this.contextMenuEventFired.bind(this, output), false);
    result.appendChild(this.linkifyStringAsFragment(text));
    return result;
  }

  private formatParameterAsError(output: SDK.RemoteObject.RemoteObject): HTMLElement {
    const result = document.createElement('span');

    // Combine the ExceptionDetails for this error object with the parsed Error#stack.
    // The Exceptiondetails include script IDs for stack frames, which allows more accurate
    // linking.
    const formatErrorStack =
        async(errorObj: SDK.RemoteObject.RemoteObject, includeCausedByPrefix: boolean): Promise<void> => {
      const error = SDK.RemoteObject.RemoteError.objectAsError(errorObj);
      const [details, cause] = await Promise.all([error.exceptionDetails(), error.cause()]);
      const errorElementType = includeCausedByPrefix ? 'div' : 'span';
      const errorElement = this.tryFormatAsError(error.errorStack, details, errorElementType) ??
          this.linkifyStringAsFragment(error.errorStack);
      if (includeCausedByPrefix) {
        errorElement.prepend('Caused by: ');
      }
      result.appendChild(errorElement);

      if (cause && cause.subtype === 'error') {
        await formatErrorStack(cause, /* includeCausedByPrefix */ true);
      } else if (cause && cause.type === 'string') {
        result.append(`Caused by: ${cause.value}`);
      }
    };

    this.#formatErrorStackPromiseForTest = formatErrorStack(output, /* includeCausedByPrefix */ false);

    return result;
  }

  private formatAsArrayEntry(output: SDK.RemoteObject.RemoteObject): HTMLElement {
    return this.previewFormatter.renderPropertyPreview(
        output.type, output.subtype, output.className, output.description);
  }

  private formatAsAccessorProperty(
      object: SDK.RemoteObject.RemoteObject|null, propertyPath: string[], isArrayEntry: boolean): HTMLElement {
    const rootElement =
        ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(
            object, propertyPath, onInvokeGetterClick.bind(this));

    function onInvokeGetterClick(this: ConsoleViewMessage, result: SDK.RemoteObject.CallFunctionResult): void {
      const wasThrown = result.wasThrown;
      const object = result.object;
      if (!object) {
        return;
      }
      rootElement.removeChildren();
      if (wasThrown) {
        const element = rootElement.createChild('span');
        element.textContent = i18nString(UIStrings.exception);
        UI.Tooltip.Tooltip.install(element, (object.description as string));
      } else if (isArrayEntry) {
        rootElement.appendChild(this.formatAsArrayEntry(object));
      } else {
        // Make a PropertyPreview from the RemoteObject similar to the backend logic.
        const maxLength = 100;
        const type = object.type;
        const subtype = object.subtype;
        let description = '';
        if (type !== 'function' && object.description) {
          if (type === 'string' || subtype === 'regexp' || subtype === 'trustedtype') {
            description = Platform.StringUtilities.trimMiddle(object.description, maxLength);
          } else {
            description = Platform.StringUtilities.trimEndWithMaxLength(object.description, maxLength);
          }
        }
        rootElement.appendChild(
            this.previewFormatter.renderPropertyPreview(type, subtype, object.className, description));
      }
    }

    return rootElement;
  }

  private formatWithSubstitutionString(
      formatString: string, parameters: SDK.RemoteObject.RemoteObject[],
      formattedResult: HTMLElement): SDK.RemoteObject.RemoteObject[] {
    const currentStyle = new Map();
    const {tokens, args} = format(formatString, parameters);
    for (const token of tokens) {
      switch (token.type) {
        case 'generic': {
          formattedResult.append(this.formatParameter(token.value, true /* force */, false /* includePreview */));
          break;
        }
        case 'optimal': {
          formattedResult.append(this.formatParameter(token.value, false /* force */, true /* includePreview */));
          break;
        }
        case 'string': {
          if (currentStyle.size === 0) {
            formattedResult.append(this.linkifyStringAsFragment(token.value));
          } else {
            const lines = token.value.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (i > 0) {
                formattedResult.append(document.createElement('br'));
              }
              const wrapper = document.createElement('span');
              wrapper.style.setProperty('contain', 'paint');
              wrapper.style.setProperty('display', 'inline-block');
              wrapper.style.setProperty('max-width', '100%');
              wrapper.appendChild(this.linkifyStringAsFragment(lines[i]));
              for (const [property, {value, priority}] of currentStyle) {
                wrapper.style.setProperty(property, value, priority);
              }
              formattedResult.append(wrapper);
            }
          }
          break;
        }
        case 'style':
          // Make sure that allowed properties do not interfere with link visibility.
          updateStyle(currentStyle, token.value);
          break;
      }
    }
    return args;
  }

  matchesFilterRegex(regexObject: RegExp): boolean {
    regexObject.lastIndex = 0;
    const contentElement = this.contentElement();
    const anchorText = this.anchorElement ? this.anchorElement.deepTextContent() : '';
    return (Boolean(anchorText) && regexObject.test(anchorText.trim())) ||
        regexObject.test(contentElement.deepTextContent().slice(anchorText.length));
  }

  matchesFilterText(filter: string): boolean {
    const text = this.contentElement().deepTextContent();
    return text.toLowerCase().includes(filter.toLowerCase());
  }

  updateTimestamp(): void {
    if (!this.contentElementInternal) {
      return;
    }

    if (Common.Settings.Settings.instance().moduleSetting('console-timestamps-enabled').get()) {
      if (!this.timestampElement) {
        this.timestampElement = document.createElement('span');
        this.timestampElement.classList.add('console-timestamp');
      }
      this.timestampElement.textContent = UI.UIUtils.formatTimestamp(this.message.timestamp, false) + ' ';
      UI.Tooltip.Tooltip.install(this.timestampElement, UI.UIUtils.formatTimestamp(this.message.timestamp, true));
      this.contentElementInternal.insertBefore(this.timestampElement, this.contentElementInternal.firstChild);
    } else if (this.timestampElement) {
      this.timestampElement.remove();
      this.timestampElement = null;
    }
  }

  nestingLevel(): number {
    let nestingLevel = 0;
    for (let group = this.consoleGroup(); group !== null; group = group.consoleGroup()) {
      nestingLevel++;
    }
    return nestingLevel;
  }

  setConsoleGroup(group: ConsoleGroupViewMessage): void {
    // TODO(crbug.com/1477675): Figure out why `this.consoleGroupInternal` is
    //     not null here and add an assertion.
    this.consoleGroupInternal = group;
  }

  clearConsoleGroup(): void {
    this.consoleGroupInternal = null;
  }

  consoleGroup(): ConsoleGroupViewMessage|null {
    return this.consoleGroupInternal;
  }

  setInSimilarGroup(inSimilarGroup: boolean, isLast?: boolean): void {
    this.inSimilarGroup = inSimilarGroup;
    this.lastInSimilarGroup = inSimilarGroup && Boolean(isLast);
    if (this.similarGroupMarker && !inSimilarGroup) {
      this.similarGroupMarker.remove();
      this.similarGroupMarker = null;
    } else if (this.elementInternal && !this.similarGroupMarker && inSimilarGroup) {
      this.similarGroupMarker = document.createElement('div');
      this.similarGroupMarker.classList.add('nesting-level-marker');
      this.consoleRowWrapper?.insertBefore(this.similarGroupMarker, this.consoleRowWrapper.firstChild);
      this.similarGroupMarker.classList.toggle('group-closed', this.lastInSimilarGroup);
    }
  }

  isLastInSimilarGroup(): boolean {
    return Boolean(this.inSimilarGroup) && Boolean(this.lastInSimilarGroup);
  }

  resetCloseGroupDecorationCount(): void {
    if (!this.closeGroupDecorationCount) {
      return;
    }
    this.closeGroupDecorationCount = 0;
    this.updateCloseGroupDecorations();
  }

  incrementCloseGroupDecorationCount(): void {
    ++this.closeGroupDecorationCount;
    this.updateCloseGroupDecorations();
  }

  private updateCloseGroupDecorations(): void {
    if (!this.nestingLevelMarkers) {
      return;
    }
    for (let i = 0, n = this.nestingLevelMarkers.length; i < n; ++i) {
      const marker = this.nestingLevelMarkers[i];
      marker.classList.toggle('group-closed', n - i <= this.closeGroupDecorationCount);
    }
  }

  protected focusedChildIndex(): number {
    if (!this.selectableChildren.length) {
      return -1;
    }
    return this.selectableChildren.findIndex(child => child.element.hasFocus());
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (UI.UIUtils.isEditing() || !this.elementInternal || !this.elementInternal.hasFocus() ||
        this.elementInternal.hasSelection()) {
      return;
    }
    if (this.maybeHandleOnKeyDown(event)) {
      event.consume(true);
    }
  }

  maybeHandleOnKeyDown(event: KeyboardEvent): boolean {
    // Handle trace expansion.
    const focusedChildIndex = this.focusedChildIndex();
    const isWrapperFocused = focusedChildIndex === -1;
    if (this.expandTrace && isWrapperFocused) {
      if ((event.key === 'ArrowLeft' && this.traceExpanded) || (event.key === 'ArrowRight' && !this.traceExpanded)) {
        this.expandTrace(!this.traceExpanded);
        return true;
      }
    }
    if (!this.selectableChildren.length) {
      return false;
    }

    if (event.key === 'ArrowLeft') {
      this.elementInternal && this.elementInternal.focus();
      return true;
    }
    if (event.key === 'ArrowRight') {
      if (isWrapperFocused && this.selectNearestVisibleChild(0)) {
        return true;
      }
    }
    if (event.key === 'ArrowUp') {
      const firstVisibleChild = this.nearestVisibleChild(0);
      if (this.selectableChildren[focusedChildIndex] === firstVisibleChild && firstVisibleChild) {
        this.elementInternal && this.elementInternal.focus();
        return true;
      }
      if (this.selectNearestVisibleChild(focusedChildIndex - 1, true /* backwards */)) {
        return true;
      }
    }
    if (event.key === 'ArrowDown') {
      if (isWrapperFocused && this.selectNearestVisibleChild(0)) {
        return true;
      }
      if (!isWrapperFocused && this.selectNearestVisibleChild(focusedChildIndex + 1)) {
        return true;
      }
    }
    return false;
  }

  private selectNearestVisibleChild(fromIndex: number, backwards?: boolean): boolean {
    const nearestChild = this.nearestVisibleChild(fromIndex, backwards);
    if (nearestChild) {
      nearestChild.forceSelect();
      return true;
    }
    return false;
  }

  private nearestVisibleChild(fromIndex: number, backwards?: boolean): {
    element: Element,
    forceSelect: () => void,
  }|null {
    const childCount = this.selectableChildren.length;
    if (fromIndex < 0 || fromIndex >= childCount) {
      return null;
    }
    const direction = backwards ? -1 : 1;
    let index = fromIndex;

    while (!this.selectableChildren[index].element.offsetParent) {
      index += direction;
      if (index < 0 || index >= childCount) {
        return null;
      }
    }
    return this.selectableChildren[index];
  }

  focusLastChildOrSelf(): void {
    if (this.elementInternal &&
        !this.selectNearestVisibleChild(this.selectableChildren.length - 1, true /* backwards */)) {
      this.elementInternal.focus();
    }
  }

  setContentElement(element: HTMLElement): void {
    console.assert(!this.contentElementInternal, 'Cannot set content element twice');
    this.contentElementInternal = element;
  }

  getContentElement(): HTMLElement|null {
    return this.contentElementInternal;
  }

  contentElement(): HTMLElement {
    if (this.contentElementInternal) {
      return this.contentElementInternal;
    }

    const contentElement = document.createElement('div');
    contentElement.classList.add('console-message');
    if (this.messageIcon) {
      contentElement.appendChild(this.messageIcon);
    }
    this.contentElementInternal = contentElement;

    const runtimeModel = this.message.runtimeModel();
    let formattedMessage;
    const shouldIncludeTrace = Boolean(this.message.stackTrace) &&
        (this.message.source === Protocol.Log.LogEntrySource.Network ||
         this.message.source === Protocol.Log.LogEntrySource.Violation ||
         this.message.level === Protocol.Log.LogEntryLevel.Error ||
         this.message.level === Protocol.Log.LogEntryLevel.Warning ||
         this.message.type === Protocol.Runtime.ConsoleAPICalledEventType.Trace);
    if (runtimeModel && shouldIncludeTrace) {
      formattedMessage = this.buildMessageWithStackTrace(runtimeModel);
    } else {
      formattedMessage = this.buildMessageWithIgnoreLinks();
    }
    contentElement.appendChild(formattedMessage);

    this.updateTimestamp();
    return this.contentElementInternal;
  }

  toMessageElement(): HTMLElement {
    if (this.elementInternal) {
      return this.elementInternal;
    }
    this.elementInternal = document.createElement('div');
    this.elementInternal.tabIndex = -1;
    this.elementInternal.addEventListener('keydown', (this.onKeyDown.bind(this) as EventListener));
    this.updateMessageElement();
    this.elementInternal.classList.toggle('console-adjacent-user-command-result', this.#adjacentUserCommandResult);
    return this.elementInternal;
  }

  updateMessageElement(): void {
    if (!this.elementInternal) {
      return;
    }

    this.elementInternal.className = 'console-message-wrapper';
    this.elementInternal.setAttribute('jslog', `${VisualLogging.item('console-message').track({
                                        click: true,
                                        keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|Space|Home|End',
                                      })}`);
    this.elementInternal.removeChildren();
    this.consoleRowWrapper = this.elementInternal.createChild('div');
    this.consoleRowWrapper.classList.add('console-row-wrapper');
    if (this.message.isGroupStartMessage()) {
      this.elementInternal.classList.add('console-group-title');
    }
    if (this.message.source === Common.Console.FrontendMessageSource.ConsoleAPI) {
      this.elementInternal.classList.add('console-from-api');
    }
    if (this.inSimilarGroup) {
      this.similarGroupMarker = (this.consoleRowWrapper.createChild('div', 'nesting-level-marker') as HTMLElement);
      this.similarGroupMarker.classList.toggle('group-closed', this.lastInSimilarGroup);
    }

    this.nestingLevelMarkers = [];
    for (let i = 0; i < this.nestingLevel(); ++i) {
      this.nestingLevelMarkers.push(this.consoleRowWrapper.createChild('div', 'nesting-level-marker'));
    }
    this.updateCloseGroupDecorations();
    elementToMessage.set(this.elementInternal, this);

    switch (this.message.level) {
      case Protocol.Log.LogEntryLevel.Verbose:
        this.elementInternal.classList.add('console-verbose-level');
        UI.ARIAUtils.setLabel(this.elementInternal, this.text);
        break;
      case Protocol.Log.LogEntryLevel.Info:
        this.elementInternal.classList.add('console-info-level');
        if (this.message.type === SDK.ConsoleModel.FrontendMessageType.System) {
          this.elementInternal.classList.add('console-system-type');
        }
        UI.ARIAUtils.setLabel(this.elementInternal, this.text);
        break;
      case Protocol.Log.LogEntryLevel.Warning:
        this.elementInternal.classList.add('console-warning-level');
        this.elementInternal.role = 'log';
        UI.ARIAUtils.setLabel(this.elementInternal, this.text);
        break;
      case Protocol.Log.LogEntryLevel.Error:
        this.elementInternal.classList.add('console-error-level');
        this.elementInternal.role = 'log';
        UI.ARIAUtils.setLabel(this.elementInternal, this.text);
        break;
    }
    this.updateMessageIcon();
    if (this.shouldRenderAsWarning()) {
      this.elementInternal.classList.add('console-warning-level');
    }

    this.consoleRowWrapper.appendChild(this.contentElement());

    if (UI.ActionRegistry.ActionRegistry.instance().hasAction(EXPLAIN_HOVER_ACTION_ID) && this.shouldShowInsights()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightConsoleMessageShown);
      this.consoleRowWrapper.append(this.#createHoverButton());
    }

    if (this.repeatCountInternal > 1) {
      this.showRepeatCountElement();
    }
  }

  shouldShowInsights(): boolean {
    if (this.message.source === Common.Console.FrontendMessageSource.ConsoleAPI &&
        this.message.stackTrace?.callFrames[0]?.url === '') {
      // Do not show insights for direct calls to Console APIs from within DevTools Console.
      return false;
    }
    if (this.message.messageText === '' || this.message.source === Common.Console.FrontendMessageSource.SELF_XSS) {
      return false;
    }
    return this.message.level === Protocol.Log.LogEntryLevel.Error ||
        this.message.level === Protocol.Log.LogEntryLevel.Warning;
  }

  getExplainLabel(): string {
    if (this.message.level === Protocol.Log.LogEntryLevel.Error) {
      return i18nString(UIStrings.explainThisError);
    }
    if (this.message.level === Protocol.Log.LogEntryLevel.Warning) {
      return i18nString(UIStrings.explainThisWarning);
    }
    return i18nString(UIStrings.explainThisMessage);
  }

  #getExplainAriaLabel(): string {
    if (this.message.level === Protocol.Log.LogEntryLevel.Error) {
      return i18nString(UIStrings.explainThisErrorWithAI);
    }
    if (this.message.level === Protocol.Log.LogEntryLevel.Warning) {
      return i18nString(UIStrings.explainThisWarningWithAI);
    }
    return i18nString(UIStrings.explainThisMessageWithAI);
  }

  getExplainActionId(): string {
    if (this.message.level === Protocol.Log.LogEntryLevel.Error) {
      return EXPLAIN_CONTEXT_ERROR_ACTION_ID;
    }
    if (this.message.level === Protocol.Log.LogEntryLevel.Warning) {
      return EXPLAIN_CONTEXT_WARNING_ACTION_ID;
    }
    return EXPLAIN_CONTEXT_OTHER_ACTION_ID;
  }

  #createHoverButton(): HTMLButtonElement {
    const icon = new IconButton.Icon.Icon();
    icon.data = {
      iconName: 'lightbulb-spark',
      color: 'var(--sys-color-on-surface-subtle)',
      width: '16px',
      height: '16px',
    };
    const button = document.createElement('button');
    button.append(icon);
    button.onclick = (event: Event) => {
      event.stopPropagation();
      UI.Context.Context.instance().setFlavor(ConsoleViewMessage, this);
      const action = UI.ActionRegistry.ActionRegistry.instance().getAction(EXPLAIN_HOVER_ACTION_ID);
      void action.execute();
    };
    const label = document.createElement('div');
    label.classList.add('button-label');
    const text = document.createElement('div');
    text.innerText = this.getExplainLabel();
    label.append(text);
    const badge = document.createElement('div');
    badge.classList.add('badge');
    badge.innerText = i18n.i18n.lockedString('AI');
    label.append(badge);
    button.append(label);
    button.classList.add('hover-button');
    button.ariaLabel = this.#getExplainAriaLabel();
    button.tabIndex = 0;
    button.setAttribute('jslog', `${VisualLogging.action(EXPLAIN_HOVER_ACTION_ID).track({click: true})}`);
    hoverButtonObserver.observe(button);
    return button;
  }

  private shouldRenderAsWarning(): boolean {
    return (this.message.level === Protocol.Log.LogEntryLevel.Verbose ||
            this.message.level === Protocol.Log.LogEntryLevel.Info) &&
        (this.message.source === Protocol.Log.LogEntrySource.Violation ||
         this.message.source === Protocol.Log.LogEntrySource.Deprecation ||
         this.message.source === Protocol.Log.LogEntrySource.Intervention ||
         this.message.source === Protocol.Log.LogEntrySource.Recommendation);
  }

  private updateMessageIcon(): void {
    if (this.messageIcon) {
      // Instead of updating the existing icon, we simply re-render. This happens only for
      // revoked exceptions so it doesn't need to be terribly efficient.
      this.messageIcon.remove();
      this.messageIcon = null;
    }

    let color = '';
    let iconName = '';
    let accessibleName = '';
    if (this.message.level === Protocol.Log.LogEntryLevel.Warning) {
      color = 'var(--icon-warning)';
      iconName = 'warning-filled';
      accessibleName = i18nString(UIStrings.warning);
    } else if (this.message.level === Protocol.Log.LogEntryLevel.Error) {
      color = 'var(--icon-error)';
      iconName = 'cross-circle-filled';
      accessibleName = i18nString(UIStrings.error);
    } else if (this.message.originatesFromLogpoint) {
      iconName = 'console-logpoint';
      accessibleName = i18nString(UIStrings.logpoint);
    } else if (this.message.originatesFromConditionalBreakpoint) {
      iconName = 'console-conditional-breakpoint';
      accessibleName = i18nString(UIStrings.cndBreakpoint);
    }
    if (!iconName) {
      return;
    }

    this.messageIcon = new IconButton.Icon.Icon();
    this.messageIcon.data = {
      iconName,
      color,
      width: '14px',
      height: '14px',
    };
    this.messageIcon.classList.add('message-level-icon');
    if (this.contentElementInternal) {
      this.contentElementInternal.insertBefore(this.messageIcon, this.contentElementInternal.firstChild);
    }
    UI.ARIAUtils.setLabel(this.messageIcon, accessibleName);
  }

  setAdjacentUserCommandResult(adjacentUserCommandResult: boolean): void {
    this.#adjacentUserCommandResult = adjacentUserCommandResult;
    this.elementInternal?.classList.toggle('console-adjacent-user-command-result', this.#adjacentUserCommandResult);
  }

  repeatCount(): number {
    return this.repeatCountInternal || 1;
  }

  resetIncrementRepeatCount(): void {
    this.repeatCountInternal = 1;
    if (!this.repeatCountElement) {
      return;
    }

    this.repeatCountElement.remove();
    if (this.contentElementInternal) {
      this.contentElementInternal.classList.remove('repeated-message');
    }
    this.repeatCountElement = null;
  }

  incrementRepeatCount(): void {
    this.repeatCountInternal++;
    this.showRepeatCountElement();
  }

  setRepeatCount(repeatCount: number): void {
    this.repeatCountInternal = repeatCount;
    this.showRepeatCountElement();
  }

  showRepeatCountElement(): void {
    if (!this.elementInternal) {
      return;
    }

    if (!this.repeatCountElement) {
      this.repeatCountElement =
          (document.createElement('span', {is: 'dt-small-bubble'}) as UI.UIUtils.DevToolsSmallBubble);
      this.repeatCountElement.classList.add('console-message-repeat-count');
      switch (this.message.level) {
        case Protocol.Log.LogEntryLevel.Warning:
          this.repeatCountElement.type = 'warning';
          break;
        case Protocol.Log.LogEntryLevel.Error:
          this.repeatCountElement.type = 'error';
          break;
        case Protocol.Log.LogEntryLevel.Verbose:
          this.repeatCountElement.type = 'verbose';
          break;
        default:
          this.repeatCountElement.type = 'info';
      }
      if (this.shouldRenderAsWarning()) {
        this.repeatCountElement.type = 'warning';
      }

      this.consoleRowWrapper?.insertBefore(this.repeatCountElement, this.contentElementInternal);
      this.contentElement().classList.add('repeated-message');
    }
    this.repeatCountElement.textContent = `${this.repeatCountInternal}`;

    let accessibleName;
    if (this.message.level === Protocol.Log.LogEntryLevel.Warning) {
      accessibleName = i18nString(UIStrings.warningS, {n: this.repeatCountInternal});
    } else if (this.message.level === Protocol.Log.LogEntryLevel.Error) {
      accessibleName = i18nString(UIStrings.errorS, {n: this.repeatCountInternal});
    } else {
      accessibleName = i18nString(UIStrings.repeatS, {n: this.repeatCountInternal});
    }
    UI.ARIAUtils.setLabel(this.repeatCountElement, accessibleName);
  }

  get text(): string {
    return this.message.messageText;
  }

  toExportString(): string {
    const lines = [];
    const nodes = this.contentElement().childTextNodes();
    const messageContent = nodes.map(Components.Linkifier.Linkifier.untruncatedNodeText).join('');
    for (let i = 0; i < this.repeatCount(); ++i) {
      lines.push(messageContent);
    }
    return lines.join('\n');
  }

  toMessageTextString(): string {
    const root = this.contentElement();
    const consoleText = root.querySelector('.console-message-text');
    if (consoleText) {
      return consoleText.deepTextContent().trim();
    }
    // Fallback to SDK's message text.
    return this.consoleMessage().messageText;
  }

  setSearchRegex(regex: RegExp|null): void {
    if (this.searchHighlightNodeChanges && this.searchHighlightNodeChanges.length) {
      UI.UIUtils.revertDomChanges(this.searchHighlightNodeChanges);
    }
    this.searchRegexInternal = regex;
    this.searchHighlightNodes = [];
    this.searchHighlightNodeChanges = [];
    if (!this.searchRegexInternal) {
      return;
    }

    const text = this.contentElement().deepTextContent();
    let match;
    this.searchRegexInternal.lastIndex = 0;
    const sourceRanges = [];
    while ((match = this.searchRegexInternal.exec(text)) && match[0]) {
      sourceRanges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
    }

    if (sourceRanges.length) {
      this.searchHighlightNodes =
          UI.UIUtils.highlightSearchResults(this.contentElement(), sourceRanges, this.searchHighlightNodeChanges);
    }
  }

  searchRegex(): RegExp|null {
    return this.searchRegexInternal;
  }

  searchCount(): number {
    return this.searchHighlightNodes.length;
  }

  searchHighlightNode(index: number): Element {
    return this.searchHighlightNodes[index];
  }

  private async getInlineFrames(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, url: Platform.DevToolsPath.UrlString,
      lineNumber: number|undefined, columnNumber: number|undefined): Promise<{frames: Chrome.DevTools.FunctionInfo[]}> {
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    const projects = Workspace.Workspace.WorkspaceImpl.instance().projects();
    const uiSourceCodes = projects.map(project => project.uiSourceCodeForURL(url)).flat().filter(f => Boolean(f)) as
        Workspace.UISourceCode.UISourceCode[];
    const scripts =
        uiSourceCodes.map(uiSourceCode => debuggerWorkspaceBinding.scriptsForUISourceCode(uiSourceCode)).flat();
    if (scripts.length) {
      const location =
          new SDK.DebuggerModel.Location(debuggerModel, scripts[0].scriptId, lineNumber || 0, columnNumber);
      const functionInfo = await debuggerWorkspaceBinding.pluginManager.getFunctionInfo(scripts[0], location);
      return functionInfo && 'frames' in functionInfo ? functionInfo : {frames: []};
    }

    return {frames: []};
  }

  // Expand inline stack frames in the formatted error in the stackTrace element, inserting new elements before the
  // insertBefore anchor.
  private async expandInlineStackFrames(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, prefix: string, suffix: string,
      url: Platform.DevToolsPath.UrlString, lineNumber: number|undefined, columnNumber: number|undefined,
      stackTrace: HTMLElement, insertBefore: HTMLElement): Promise<boolean> {
    const {frames} = await this.getInlineFrames(debuggerModel, url, lineNumber, columnNumber);
    if (!frames.length) {
      return false;
    }

    for (let f = 0; f < frames.length; ++f) {
      const {name} = frames[f];
      const formattedLine = document.createElement('span');
      formattedLine.appendChild(this.linkifyStringAsFragment(`${prefix} ${name} (`));
      const scriptLocationLink = this.linkifier.linkifyScriptLocation(
          debuggerModel.target(), null, url, lineNumber, {columnNumber, inlineFrameIndex: f});
      scriptLocationLink.tabIndex = -1;
      this.selectableChildren.push({element: scriptLocationLink, forceSelect: () => scriptLocationLink.focus()});
      formattedLine.appendChild(scriptLocationLink);
      formattedLine.appendChild(this.linkifyStringAsFragment(suffix));
      formattedLine.classList.add('formatted-stack-frame');
      stackTrace.insertBefore(formattedLine, insertBefore);
    }
    return true;
  }

  private createScriptLocationLinkForSyntaxError(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, exceptionDetails: Protocol.Runtime.ExceptionDetails): HTMLElement
      |undefined {
    const {scriptId, lineNumber, columnNumber} = exceptionDetails;
    if (!scriptId) {
      return;
    }

    // SyntaxErrors might not populate the URL field. Try to resolve it via scriptId.
    const url =
        exceptionDetails.url as Platform.DevToolsPath.UrlString || debuggerModel.scriptForId(scriptId)?.sourceURL;
    if (!url) {
      return;
    }

    const scriptLocationLink = this.linkifier.linkifyScriptLocation(
        debuggerModel.target(), exceptionDetails.scriptId || null, url, lineNumber, {
          columnNumber,
          inlineFrameIndex: 0,
          showColumnNumber: true,
        });
    scriptLocationLink.tabIndex = -1;
    return scriptLocationLink;
  }

  private tryFormatAsError(
      string: string, exceptionDetails?: Protocol.Runtime.ExceptionDetails,
      formattedResultType: 'div'|'span' = 'span'): HTMLElement|null {
    const runtimeModel = this.message.runtimeModel();
    if (!runtimeModel) {
      return null;
    }

    const linkInfos = parseSourcePositionsFromErrorStack(runtimeModel, string);
    if (!linkInfos?.length) {
      return null;
    }
    if (exceptionDetails?.stackTrace) {
      augmentErrorStackWithScriptIds(linkInfos, exceptionDetails.stackTrace);
    }

    const debuggerModel = runtimeModel.debuggerModel();
    const formattedResult = document.createElement(formattedResultType);

    for (let i = 0; i < linkInfos.length; ++i) {
      const newline = i < linkInfos.length - 1 ? '\n' : '';
      const {line, link} = linkInfos[i];
      // Syntax errors don't have a stack frame that points to the source position
      // where the error occurred. We use the source location from the
      // exceptionDetails and append it to the end of the message instead.
      if (!link && exceptionDetails && line.startsWith('SyntaxError')) {
        formattedResult.appendChild(this.linkifyStringAsFragment(line));
        const maybeScriptLocation = this.createScriptLocationLinkForSyntaxError(debuggerModel, exceptionDetails);
        if (maybeScriptLocation) {
          formattedResult.append(' (at ');
          formattedResult.appendChild(maybeScriptLocation);
          formattedResult.append(')');
        }
        formattedResult.append(newline);
        continue;
      }
      if (!link) {
        formattedResult.appendChild(this.linkifyStringAsFragment(`${line}${newline}`));
        continue;
      }
      const formattedLine = document.createElement('span');
      const suffix = `${link.suffix}${newline}`;
      formattedLine.appendChild(this.linkifyStringAsFragment(link.prefix));
      const scriptLocationLink = this.linkifier.linkifyScriptLocation(
          debuggerModel.target(), link.scriptId || null, link.url, link.lineNumber, {
            columnNumber: link.columnNumber,
            inlineFrameIndex: 0,
            showColumnNumber: true,
          });
      scriptLocationLink.tabIndex = -1;
      this.selectableChildren.push({element: scriptLocationLink, forceSelect: () => scriptLocationLink.focus()});
      formattedLine.appendChild(scriptLocationLink);
      formattedLine.appendChild(this.linkifyStringAsFragment(suffix));
      formattedLine.classList.add('formatted-stack-frame');
      formattedResult.appendChild(formattedLine);

      if (!link.enclosedInBraces) {
        continue;
      }

      const prefixWithoutFunction = link.prefix.substring(0, link.prefix.lastIndexOf(' ', link.prefix.length - 3));

      // If we were able to parse the function name from the stack trace line, try to replace it with an expansion of
      // any inline frames.
      const selectableChildIndex = this.selectableChildren.length - 1;
      void this
          .expandInlineStackFrames(
              debuggerModel, prefixWithoutFunction, suffix, link.url, link.lineNumber, link.columnNumber,
              formattedResult, formattedLine)
          .then(modified => {
            if (modified) {
              formattedResult.removeChild(formattedLine);
              this.selectableChildren.splice(selectableChildIndex, 1);
            }
          });
    }

    return formattedResult;
  }

  private linkifyWithCustomLinkifier(
      string: string,
      linkifier: (arg0: string, arg1: Platform.DevToolsPath.UrlString, arg2?: number, arg3?: number) => Node):
      DocumentFragment {
    if (string.length > getMaxTokenizableStringLength()) {
      const propertyValue = new ObjectUI.ObjectPropertiesSection.ExpandableTextPropertyValue(
          document.createElement('span'), string, getLongStringVisibleLength());
      const fragment = document.createDocumentFragment();
      fragment.appendChild(propertyValue.element);
      return fragment;
    }
    const container = document.createDocumentFragment();
    const tokens = ConsoleViewMessage.tokenizeMessageText(string);
    let isBlob = false;
    for (const token of tokens) {
      if (!token.text) {
        continue;
      }
      if (isBlob) {
        token.text = `blob:${token.text}`;
        isBlob = !isBlob;
      }
      if (token.text === '\'blob:' && token === tokens[0]) {
        isBlob = true;
        token.text = '\'';
      }
      switch (token.type) {
        case 'url': {
          const realURL = (token.text.startsWith('www.') ? 'http://' + token.text : token.text);
          const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(realURL);
          const sourceURL = Common.ParsedURL.ParsedURL.removeWasmFunctionInfoFromURL(splitResult.url);
          let linkNode;
          if (splitResult) {
            linkNode = linkifier(token.text, sourceURL, splitResult.lineNumber, splitResult.columnNumber);
          } else {
            linkNode = linkifier(token.text, Platform.DevToolsPath.EmptyUrlString);
          }
          container.appendChild(linkNode);
          break;
        }
        default:
          container.appendChild(document.createTextNode(token.text));
          break;
      }
    }
    return container;
  }

  private linkifyStringAsFragment(string: string): DocumentFragment {
    return this.linkifyWithCustomLinkifier(string, (text, url, lineNumber, columnNumber) => {
      const options = {text, lineNumber, columnNumber};
      const linkElement =
          Components.Linkifier.Linkifier.linkifyURL(url, (options as Components.Linkifier.LinkifyURLOptions));
      linkElement.tabIndex = -1;
      this.selectableChildren.push({element: linkElement, forceSelect: () => linkElement.focus()});
      return linkElement;
    });
  }

  private static tokenizeMessageText(string: string): {
    type?: string, text: string,
  }[] {
    const {tokenizerRegexes, tokenizerTypes} = getOrCreateTokenizers();
    if (string.length > getMaxTokenizableStringLength()) {
      return [{text: string, type: undefined}];
    }
    const results = TextUtils.TextUtils.Utils.splitStringByRegexes(string, tokenizerRegexes);
    return results.map(result => ({text: result.value, type: tokenizerTypes[result.regexIndex]}));
  }

  groupKey(): string {
    if (!this.groupKeyInternal) {
      this.groupKeyInternal = this.message.groupCategoryKey() + ':' + this.groupTitle();
    }
    return this.groupKeyInternal;
  }

  groupTitle(): string {
    const tokens = ConsoleViewMessage.tokenizeMessageText(this.message.messageText);
    const result = tokens.reduce((acc, token) => {
      let text: Common.UIString.LocalizedString|string = token.text;
      if (token.type === 'url') {
        text = i18nString(UIStrings.url);
      } else if (token.type === 'time') {
        text = i18nString(UIStrings.tookNms);
      } else if (token.type === 'event') {
        text = i18nString(UIStrings.someEvent);
      } else if (token.type === 'milestone') {
        text = i18nString(UIStrings.Mxx);
      } else if (token.type === 'autofill') {
        text = i18nString(UIStrings.attribute);
      }
      return acc + text;
    }, '');
    return result.replace(/[%]o/g, '');
  }
}

let tokenizerRegexes: RegExp[]|null = null;
let tokenizerTypes: string[]|null = null;

function getOrCreateTokenizers(): {
  tokenizerRegexes: Array<RegExp>,
  tokenizerTypes: Array<string>,
} {
  if (!tokenizerRegexes || !tokenizerTypes) {
    const controlCodes = '\\u0000-\\u0020\\u007f-\\u009f';
    const linkStringRegex = new RegExp(
        '(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s' + controlCodes + '"]{2,}[^\\s' + controlCodes +
            '"\')}\\],:;.!?]',
        'u');
    const pathLineRegex = /(?:\/[\w\.-]*)+\:[\d]+/;
    const timeRegex = /took [\d]+ms/;
    const eventRegex = /'\w+' event/;
    const milestoneRegex = /\sM[6-7]\d/;
    const autofillRegex = /\(suggested: \"[\w-]+\"\)/;
    const handlers = new Map<RegExp, string>();
    handlers.set(linkStringRegex, 'url');
    handlers.set(pathLineRegex, 'url');
    handlers.set(timeRegex, 'time');
    handlers.set(eventRegex, 'event');
    handlers.set(milestoneRegex, 'milestone');
    handlers.set(autofillRegex, 'autofill');
    tokenizerRegexes = Array.from(handlers.keys());
    tokenizerTypes = Array.from(handlers.values());
    return {tokenizerRegexes, tokenizerTypes};
  }
  return {tokenizerRegexes, tokenizerTypes};
}

export class ConsoleGroupViewMessage extends ConsoleViewMessage {
  private collapsedInternal: boolean;
  private expandGroupIcon: IconButton.Icon.Icon|null;
  private readonly onToggle: () => void;
  private groupEndMessageInternal: ConsoleViewMessage|null;

  constructor(
      consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier,
      requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver,
      onToggle: () => void, onResize: (arg0: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>) => void) {
    console.assert(consoleMessage.isGroupStartMessage());
    super(consoleMessage, linkifier, requestResolver, issueResolver, onResize);
    this.collapsedInternal = consoleMessage.type === Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed;
    this.expandGroupIcon = null;
    this.onToggle = onToggle;
    this.groupEndMessageInternal = null;
  }

  private setCollapsed(collapsed: boolean): void {
    this.collapsedInternal = collapsed;
    if (this.expandGroupIcon) {
      this.expandGroupIcon.name = this.collapsedInternal ? 'triangle-right' : 'triangle-down';
    }
    this.onToggle.call(null);
  }

  collapsed(): boolean {
    return this.collapsedInternal;
  }

  override maybeHandleOnKeyDown(event: KeyboardEvent): boolean {
    const focusedChildIndex = this.focusedChildIndex();
    if (focusedChildIndex === -1) {
      if ((event.key === 'ArrowLeft' && !this.collapsedInternal) ||
          (event.key === 'ArrowRight' && this.collapsedInternal)) {
        this.setCollapsed(!this.collapsedInternal);
        return true;
      }
    }
    return super.maybeHandleOnKeyDown(event);
  }

  override toMessageElement(): HTMLElement {
    let element: HTMLElement|null = this.elementInternal || null;
    if (!element) {
      element = super.toMessageElement();
      const iconType = this.collapsedInternal ? 'triangle-right' : 'triangle-down';
      this.expandGroupIcon = IconButton.Icon.create(iconType, 'expand-group-icon');
      // Intercept focus to avoid highlight on click.
      this.contentElement().tabIndex = -1;
      if (this.repeatCountElement) {
        this.repeatCountElement.insertBefore(this.expandGroupIcon, this.repeatCountElement.firstChild);
      } else {
        this.consoleRowWrapper?.insertBefore(this.expandGroupIcon, this.contentElementInternal);
      }
      element.addEventListener('click', () => this.setCollapsed(!this.collapsedInternal));
    }
    return element;
  }

  override showRepeatCountElement(): void {
    super.showRepeatCountElement();
    if (this.repeatCountElement && this.expandGroupIcon) {
      this.repeatCountElement.insertBefore(this.expandGroupIcon, this.repeatCountElement.firstChild);
    }
  }

  messagesHidden(): boolean {
    if (this.collapsed()) {
      return true;
    }
    const parent = this.consoleGroup();
    return Boolean(parent && parent.messagesHidden());
  }

  setGroupEnd(viewMessage: ConsoleViewMessage): void {
    if (viewMessage.consoleMessage().type !== Protocol.Runtime.ConsoleAPICalledEventType.EndGroup) {
      throw new Error('Invalid console message as group end');
    }
    if (this.groupEndMessageInternal !== null) {
      throw new Error('Console group already has an end');
    }
    this.groupEndMessageInternal = viewMessage;
  }

  groupEnd(): ConsoleViewMessage|null {
    return this.groupEndMessageInternal;
  }
}

export class ConsoleCommand extends ConsoleViewMessage {
  private formattedCommand: HTMLElement|null;

  constructor(
      consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier,
      requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver,
      onResize: (arg0: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>) => void) {
    super(consoleMessage, linkifier, requestResolver, issueResolver, onResize);
    this.formattedCommand = null;
  }

  override contentElement(): HTMLElement {
    const contentElement = this.getContentElement();
    if (contentElement) {
      return contentElement;
    }
    const newContentElement = document.createElement('div');
    this.setContentElement(newContentElement);
    newContentElement.classList.add('console-user-command');
    const userCommandIcon = new IconButton.Icon.Icon();
    userCommandIcon.data = {iconName: 'chevron-right', color: 'var(--icon-default)', width: '16px', height: '16px'};
    userCommandIcon.classList.add('command-result-icon');
    newContentElement.appendChild(userCommandIcon);

    elementToMessage.set(newContentElement, this);
    this.formattedCommand = document.createElement('span');
    this.formattedCommand.classList.add('source-code');
    this.formattedCommand.textContent = Platform.StringUtilities.replaceControlCharacters(this.text);
    newContentElement.appendChild(this.formattedCommand);

    if (this.formattedCommand.textContent.length < MaxLengthToIgnoreHighlighter) {
      void CodeHighlighter.CodeHighlighter.highlightNode(this.formattedCommand, 'text/javascript')
          .then(this.updateSearch.bind(this));
    } else {
      this.updateSearch();
    }

    this.updateTimestamp();
    return newContentElement;
  }

  private updateSearch(): void {
    this.setSearchRegex(this.searchRegex());
  }
}

export class ConsoleCommandResult extends ConsoleViewMessage {
  override contentElement(): HTMLElement {
    const element = super.contentElement();
    if (!element.classList.contains('console-user-command-result')) {
      element.classList.add('console-user-command-result');
      if (this.consoleMessage().level === Protocol.Log.LogEntryLevel.Info) {
        const icon = new IconButton.Icon.Icon();
        icon.data = {iconName: 'chevron-left-dot', color: 'var(--icon-default)', width: '16px', height: '16px'};
        icon.classList.add('command-result-icon');
        element.insertBefore(icon, element.firstChild);
      }
    }
    return element;
  }
}

export class ConsoleTableMessageView extends ConsoleViewMessage {
  private dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<unknown>|null;

  constructor(
      consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier,
      requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver,
      onResize: (arg0: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>) => void) {
    super(consoleMessage, linkifier, requestResolver, issueResolver, onResize);
    console.assert(consoleMessage.type === Protocol.Runtime.ConsoleAPICalledEventType.Table);
    this.dataGrid = null;
  }

  override wasShown(): void {
    if (this.dataGrid) {
      this.dataGrid.updateWidths();
    }
    super.wasShown();
  }

  override onResize(): void {
    if (!this.isVisible()) {
      return;
    }
    if (this.dataGrid) {
      this.dataGrid.onResize();
    }
  }

  override contentElement(): HTMLElement {
    const contentElement = this.getContentElement();
    if (contentElement) {
      return contentElement;
    }

    const newContentElement = document.createElement('div');
    newContentElement.classList.add('console-message');
    if (this.messageIcon) {
      newContentElement.appendChild(this.messageIcon);
    }
    this.setContentElement(newContentElement);

    newContentElement.appendChild(this.buildTableMessage());
    this.updateTimestamp();
    return newContentElement;
  }

  private buildTableMessage(): HTMLElement {
    const formattedMessage = document.createElement('span');
    formattedMessage.classList.add('source-code');
    this.anchorElement = this.buildMessageAnchor();
    if (this.anchorElement) {
      formattedMessage.appendChild(this.anchorElement);
    }

    const table = this.message.parameters && this.message.parameters.length ? this.message.parameters[0] : null;
    if (!table) {
      return this.buildMessage();
    }
    const actualTable = parameterToRemoteObject(this.message.runtimeModel())(table);
    if (!actualTable || !actualTable.preview) {
      return this.buildMessage();
    }

    const rawValueColumnSymbol = Symbol('rawValueColumn');
    const columnNames: (string|symbol)[] = [];
    const preview = actualTable.preview;
    const rows = [];
    for (let i = 0; i < preview.properties.length; ++i) {
      const rowProperty = preview.properties[i];
      let rowSubProperties: Protocol.Runtime.PropertyPreview[];
      if (rowProperty.valuePreview && rowProperty.valuePreview.properties.length) {
        rowSubProperties = rowProperty.valuePreview.properties;
      } else if (rowProperty.value || rowProperty.value === '') {
        rowSubProperties =
            [{name: rawValueColumnSymbol as unknown as string, type: rowProperty.type, value: rowProperty.value}];
      } else {
        continue;
      }

      const rowValue = new Map<string|symbol, HTMLElement>();
      const maxColumnsToRender = 20;
      for (let j = 0; j < rowSubProperties.length; ++j) {
        const cellProperty = rowSubProperties[j];
        let columnRendered: true|boolean = columnNames.indexOf(cellProperty.name) !== -1;
        if (!columnRendered) {
          if (columnNames.length === maxColumnsToRender) {
            continue;
          }
          columnRendered = true;
          columnNames.push(cellProperty.name);
        }

        if (columnRendered) {
          const cellElement =
              this.renderPropertyPreviewOrAccessor(actualTable, cellProperty, [rowProperty, cellProperty]);
          cellElement.classList.add('console-message-nowrap-below');
          rowValue.set(cellProperty.name, cellElement);
        }
      }
      rows.push({rowName: rowProperty.name, rowValue});
    }

    const flatValues = [];
    for (const {rowName, rowValue} of rows) {
      flatValues.push(rowName);
      for (let j = 0; j < columnNames.length; ++j) {
        flatValues.push(rowValue.get(columnNames[j]));
      }
    }
    columnNames.unshift(i18nString(UIStrings.index));
    const columnDisplayNames =
        columnNames.map(name => name === rawValueColumnSymbol ? i18nString(UIStrings.value) : name.toString());

    if (flatValues.length) {
      this.dataGrid = DataGrid.SortableDataGrid.SortableDataGrid.create(
          columnDisplayNames, flatValues, i18nString(UIStrings.console));
      if (this.dataGrid) {
        this.dataGrid.setStriped(true);
        this.dataGrid.setFocusable(false);

        const formattedResult = document.createElement('span');
        formattedResult.classList.add('console-message-text');
        const tableElement = formattedResult.createChild('div', 'console-message-formatted-table');
        const dataGridContainer = tableElement.createChild('span');
        tableElement.appendChild(this.formatParameter(actualTable, true, false));
        const shadowRoot = dataGridContainer.attachShadow({mode: 'open'});
        const dataGridWidget = this.dataGrid.asWidget();
        dataGridWidget.markAsRoot();
        dataGridWidget.show(shadowRoot as unknown as Element);
        dataGridWidget.registerCSSFiles([consoleViewStyles, objectValueStyles]);
        formattedMessage.appendChild(formattedResult);
        this.dataGrid.renderInline();
      }
    }
    return formattedMessage;
  }

  override approximateFastHeight(): number {
    const table = this.message.parameters && this.message.parameters[0];
    if (table && typeof table !== 'string' && table.preview) {
      return defaultConsoleRowHeight * table.preview.properties.length;
    }
    return defaultConsoleRowHeight;
  }
}

/**
 * The maximum length before strings are considered too long for syntax highlighting.
 * @const
 */
const MaxLengthToIgnoreHighlighter: number = 10000;

/**
 * @const
 */
export const MaxLengthForLinks: number = 40;

let maxTokenizableStringLength = 10000;
let longStringVisibleLength = 5000;

export const getMaxTokenizableStringLength = (): number => {
  return maxTokenizableStringLength;
};

export const setMaxTokenizableStringLength = (length: number): void => {
  maxTokenizableStringLength = length;
};

export const getLongStringVisibleLength = (): number => {
  return longStringVisibleLength;
};

export const setLongStringVisibleLength = (length: number): void => {
  longStringVisibleLength = length;
};
