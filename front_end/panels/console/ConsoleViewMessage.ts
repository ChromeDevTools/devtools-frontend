// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */

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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as Highlighting from '../../ui/components/highlighting/highlighting.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as RequestLinkIcon from '../../ui/components/request_link_icon/request_link_icon.js';
import {createIcon, Icon} from '../../ui/kit/kit.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render, type TemplateResult} from '../../ui/lit/lit.js';
import * as Settings from '../../ui/settings/settings.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Elements from '../elements/elements.js';

import {format, updateStyle} from './ConsoleFormat.js';
import {ConsoleInsightTeaser} from './ConsoleInsightTeaser.js';
import consoleViewStyles from './consoleView.css.js';
import type {ConsoleViewportElement} from './ConsoleViewport.js';
import {SymbolizedErrorWidget} from './SymbolizedErrorWidget.js';

const {ifDefined, until} = Directives;
const {widget, widgetRef} = UI.Widget;

/**
 * Used with `widgetRef` to create a widget as soon as its element is rendered,
 * even if the message is not attached yet (the viewport renders lazily).
 */
function ensureWidgetCreated(): void {
}

/**
 * Marks an element that keyboard navigation inside a console message can move
 * focus to. The value is a `SelectableKind`, or empty for a focusable element.
 */
const SELECTABLE_ATTRIBUTE = 'data-console-selectable';

const enum SelectableKind {
  /** The element hosts a widget whose `linkElements` are selectable. */
  LINKS = 'links',
  /** The element hosts a `DOMTreeWidget`; selecting it selects the root node. */
  DOM_TREE = 'dom-tree',
  /** The element hosts an object properties section; selecting it focuses its tree. */
  OBJECT = 'object',
}

interface SelectableChild {
  element: HTMLElement;
  forceSelect: () => void;
}

/**
 * The order in which the parts of a message are visited: the message text, then
 * the source location anchor (which comes first in the DOM, but is shown at the
 * end of the line), then everything else, such as the stack trace.
 */
function selectableRank(element: Element): number {
  if (element.closest('.console-message-text')) {
    return 0;
  }
  if (element.closest('.console-message-anchor')) {
    return 1;
  }
  return 2;
}

function collectSelectableElements(root: Element|ShadowRoot, rank: number|undefined,
                                   result: Array<{element: HTMLElement, rank: number}>): void {
  for (const element of root.querySelectorAll<HTMLElement>('*')) {
    const elementRank = rank ?? selectableRank(element);
    if (element.hasAttribute(SELECTABLE_ATTRIBUTE)) {
      result.push({element, rank: elementRank});
    }
    if (element.shadowRoot) {
      collectSelectableElements(element.shadowRoot, elementRank, result);
    }
  }
}

function selectableChildrenOf(element: HTMLElement): SelectableChild[] {
  switch (element.getAttribute(SELECTABLE_ATTRIBUTE)) {
    case SelectableKind.LINKS: {
      const linkWidget = UI.Widget.Widget.get(element);
      if (!(linkWidget instanceof SymbolizedErrorWidget) &&
          !(linkWidget instanceof Components.JSPresentationUtils.StackTracePreviewContent)) {
        return [];
      }
      return linkWidget.linkElements.map(link => ({element: link, forceSelect: () => link.focus()}));
    }
    case SelectableKind.DOM_TREE: {
      const domTree = UI.Widget.Widget.get(element);
      const node = domTree instanceof Elements.DOMTreeWidget.DOMTreeWidget ? domTree.rootDOMNode : null;
      if (!node || !(domTree instanceof Elements.DOMTreeWidget.DOMTreeWidget)) {
        return [];
      }
      return [{element, forceSelect: () => domTree.selectDOMNode(node, /* focus= */ true)}];
    }
    case SelectableKind.OBJECT:
      return [{
        element,
        forceSelect: () => {
          const tree = element.querySelector<HTMLElement>('devtools-tree');
          tree?.focus();
          if (tree && !tree.hasFocus()) {
            tree.focus();
          }
        },
      }];
    default:
      return [{element, forceSelect: () => element.focus()}];
  }
}

/**
 * Collects what keyboard navigation can focus inside `root` from the rendered
 * DOM, so that asynchronously rendered parts (DOM trees, symbolized errors,
 * stack traces) are picked up without bookkeeping.
 */
function collectSelectableChildren(root: HTMLElement|null): SelectableChild[] {
  if (!root) {
    return [];
  }
  const elements: Array<{element: HTMLElement, rank: number}> = [];
  collectSelectableElements(root, undefined, elements);
  elements.sort((a, b) => a.rank - b.rank);
  return elements.flatMap(({element}) => selectableChildrenOf(element));
}

const UIStrings = {
  /**
   * @description Message element text content in Console view message of the Console panel. Shown
   * when the user tried to run console.clear() but the 'Keep log' option is enabled, which stops
   * the log from being cleared.
   */
  consoleclearWasPreventedDueTo: '`console.clear()` was prevented due to \'Keep log\'',
  /**
   * @description Text shown in the Console panel after the user has cleared the console, which
   * removes all messages from the console so that it is empty.
   */
  consoleWasCleared: 'Console was cleared',
  /**
   * @description Message element title in Console view message of the Console panel.
   * @example {Ctrl+L} PH1
   */
  clearAllMessagesWithS: 'Clear all messages with {PH1}',
  /**
   * @description Message prefix in Console view message of the Console panel.
   */
  assertionFailed: 'Assertion failed: ',
  /**
   * @description Message text in Console view message of the Console panel.
   * @example {console.log(1)} PH1
   */
  violationS: '`[Violation]` {PH1}',
  /**
   * @description Message text in Console view message of the Console panel.
   * @example {console.log(1)} PH1
   */
  interventionS: '`[Intervention]` {PH1}',
  /**
   * @description Message text in Console view message of the Console panel.
   * @example {console.log(1)} PH1
   */
  deprecationS: '`[Deprecation]` {PH1}',
  /**
   * @description Note title in Console view message of the Console panel.
   */
  thisValueWillNotBeCollectedUntil: 'This value won’t be collected until console is cleared',
  /**
   * @description Note title in Console view message of the Console panel.
   */
  thisValueWasEvaluatedUponFirst: 'This value was evaluated upon first expanding. It may have changed since then.',
  /**
   * @description Note title in Console view message of the Console panel.
   */
  functionWasResolvedFromBound: 'Function was resolved from bound function',
  /**
   * @description Shown in the Console panel when an exception is thrown when trying to access a
   * property on an object. Should be translated.
   */
  exception: '<exception>',
  /**
   * @description Text to indicate an item is a warning.
   */
  warning: 'Warning',
  /**
   * @description Text for errors.
   */
  error: 'Error',
  /**
   * @description Accessible label for an icon. The icon is used to mark console messages that
   * originate from a logpoint. Logpoints are special breakpoints that log a user-provided JavaScript
   * expression to the DevTools Console.
   */
  logpoint: 'Logpoint',
  /**
   * @description Accessible label for an icon. The icon is used to mark console messages that
   * originate from conditional breakpoints.
   */
  cndBreakpoint: 'Conditional breakpoint',
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
   * @description Text appended to grouped console messages that are related to URL requests.
   */
  url: '<URL>',
  /**
   * @description Text appended to grouped console messages about tasks that took longer than N ms.
   */
  tookNms: 'took <N>ms',
  /**
   * @description Text appended to grouped console messages about tasks that are related to some DOM event.
   */
  someEvent: '<some> event',
  /**
   * @description Text appended to grouped console messages about tasks that are related to a particular milestone.
   */
  Mxx: ' M<XX>',
  /**
   * @description Text appended to grouped console messages about tasks that are related to autofill completions.
   */
  attribute: '<attribute>',
  /**
   * @description Text for the index of something.
   */
  index: '(index)',
  /**
   * @description Text for the value of something.
   */
  value: 'Value',
  /**
   * @description Title of the Console tool.
   */
  console: 'Console',
  /**
   * @description Message to indicate a console message with a stack table is expanded.
   */
  stackMessageExpanded: 'Stack table expanded',
  /**
   * @description Message to indicate a console message with a stack table is collapsed.
   */
  stackMessageCollapsed: 'Stack table collapsed',
  /**
   * @description Message to offer insights for a console error message.
   */
  explainThisError: 'Understand this error',
  /**
   * @description Message to offer insights for a console warning message.
   */
  explainThisWarning: 'Understand this warning',
  /**
   * @description Message to offer insights for a console message.
   */
  explainThisMessage: 'Understand this message',
  /**
   * @description Message to offer insights for a console error message.
   */
  explainThisErrorWithAI: 'Understand this error',
  /**
   * @description Message to offer insights for a console warning message.
   */
  explainThisWarningWithAI: 'Understand this warning',
  /**
   * @description Message to offer insights for a console message.
   */
  explainThisMessageWithAI: 'Understand this message',
  /**
   * @description Element text content in Object properties section.
   */
  // eslint-disable-next-line @devtools/l10n-uistrings-text-style
  dots: '(...)',
  /**
   * @description Element title in Object properties section.
   */
  invokePropertyGetter: 'Invoke property getter',
  /**
   * @description Context menu item to copy table data.
   */
  copyTableAs: 'Copy table as',
  /**
   * @description Submenu item to copy table as Markdown.
   */
  copyAsMarkdown: 'Copy as Markdown',
  /**
   * @description Submenu item to copy table as CSV.
   */
  copyAsCsv: 'Copy as CSV',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsoleViewMessage.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const elementToMessage = new WeakMap<Element, ConsoleViewMessage>();

export const getMessageForElement = (element: Element): ConsoleViewMessage|undefined => {
  return elementToMessage.get(element);
};

// This value reflects the 18px min-height of .console-message.
// Keep in sync with consoleView.css.
const defaultConsoleRowHeight = 18;

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

function appendOrShow(parent: Element, child: DocumentFragment|UI.Widget.AnyWidget|HTMLElement): void {
  if (child instanceof UI.Widget.Widget) {
    child.show(parent, null, /* suppressOprhanWidgetError=*/ true);
  } else {
    parent.appendChild(child);
  }
}

interface NodeParamViewInput {
  node: SDK.DOMModel.DOMNode|null;
  /** Rendered instead of the DOM tree once the node turns out to be unresolvable. */
  fallback: LitTemplate|null;
  onTreeResized: () => void;
  onDOMTreeCreated: (domTree: Elements.DOMTreeWidget.DOMTreeWidget) => void;
}

type NodeParamView = (input: NodeParamViewInput, output: undefined, target: HTMLElement) => void;

export const NODE_PARAM_VIEW: NodeParamView = (input, _output, target) => {
  if (input.fallback) {
    render(input.fallback, target);
    return;
  }
  // clang-format off
  render(html`<devtools-widget
    data-console-selectable=${SelectableKind.DOM_TREE}
    ${widget((element: HTMLElement) => new Elements.DOMTreeWidget.DOMTreeWidget(element), {
      omitRootDOMNode: false,
      selectEnabled: true,
      hideGutter: true,
      deindentSingleNode: true,
      showSelectionOnKeyboardFocus: true,
      // Long lines wrap like the rest of the message.
      wrap: true,
      rootDOMNode: input.node,
      onElementsTreeUpdated: input.onTreeResized,
      onElementExpanded: input.onTreeResized,
      onElementCollapsed: input.onTreeResized,
    })}
    ${widgetRef(Elements.DOMTreeWidget.DOMTreeWidget, input.onDOMTreeCreated)}></devtools-widget>`, target);
  // clang-format on
};

/**
 * A logged DOM node. Resolves the node itself and shows it as a DOM tree, or
 * falls back to `renderFallback` if the node can't be resolved.
 */
export class ConsoleNodeParam extends UI.Widget.Widget {
  #remoteObject: SDK.RemoteObject.RemoteObject|null = null;
  #node: SDK.DOMModel.DOMNode|null = null;
  #unresolvable = false;
  #visible = false;
  #domTree: Elements.DOMTreeWidget.DOMTreeWidget|null = null;
  readonly #view: NodeParamView;
  renderFallback: (object: SDK.RemoteObject.RemoteObject) => LitTemplate = () => nothing;
  onDimensionChange: (element: HTMLElement) => void = () => {};
  onNodeResolved: () => void = () => {};

  constructor(element?: HTMLElement, view: NodeParamView = NODE_PARAM_VIEW) {
    super(element);
    this.element.classList.remove('widget');
    this.#view = view;
  }

  set remoteObject(remoteObject: SDK.RemoteObject.RemoteObject) {
    if (this.#remoteObject === remoteObject) {
      return;
    }
    this.#remoteObject = remoteObject;
    this.#node = null;
    this.#unresolvable = false;
    this.requestUpdate();
    void this.#resolveNode(remoteObject);
  }

  /**
   * Whether the message is visible. The DOM tree registers global listeners
   * while it is shown, so it only stays shown while the message is visible.
   */
  set visible(visible: boolean) {
    if (this.#visible === visible) {
      return;
    }
    this.#visible = visible;
    this.#updateDOMTreeVisibility();
  }

  async #resolveNode(remoteObject: SDK.RemoteObject.RemoteObject): Promise<void> {
    const domModel = remoteObject.runtimeModel().target().model(SDK.DOMModel.DOMModel);
    const node = domModel ? await domModel.pushObjectAsNodeToFrontend(remoteObject) : null;
    if (remoteObject !== this.#remoteObject) {
      return;
    }
    this.#node = node;
    this.#unresolvable = !node;
    this.requestUpdate();
    await this.updateComplete;
    // The node arrives asynchronously, after the message was measured.
    if (this.#domTree) {
      this.onDimensionChange(this.#domTree.element);
    }
    this.onNodeResolved();
  }

  #updateDOMTreeVisibility(): void {
    if (!this.#domTree) {
      return;
    }
    if (!this.#visible) {
      this.#domTree.hideWidget();
    } else if (this.#domTree.element.isConnected) {
      this.#domTree.showWidget();
    }
  }

  #onDOMTreeCreated = (domTree: Elements.DOMTreeWidget.DOMTreeWidget): void => {
    if (this.#domTree === domTree) {
      return;
    }
    this.#domTree = domTree;
    // @ts-expect-error used in console_test_runner
    domTree.element.domTreeWidgetForTest = domTree;
  };

  #onTreeResized = (): void => {
    if (this.#domTree) {
      this.onDimensionChange(this.#domTree.element);
    }
  };

  override performUpdate(): void {
    if (!this.#remoteObject) {
      return;
    }
    if (this.#unresolvable) {
      this.#domTree?.hideWidget();
      this.#domTree = null;
    }
    this.#view({
      node: this.#node,
      fallback: this.#unresolvable ? this.renderFallback(this.#remoteObject) : null,
      onTreeResized: this.#onTreeResized,
      onDOMTreeCreated: this.#onDOMTreeCreated,
    },
               undefined, this.contentElement);
    this.#updateDOMTreeVisibility();
  }
}

interface ErrorParamViewInput {
  error: Bindings.SymbolizedError.SymbolizedError|null;
  ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager;
}

type ErrorParamView = (input: ErrorParamViewInput, output: undefined, target: HTMLElement) => void;

export const ERROR_PARAM_VIEW: ErrorParamView = (input, _output, target) => {
  // clang-format off
  render(html`<devtools-widget
    data-console-selectable=${SelectableKind.LINKS}
    ${input.error
      ? widget(SymbolizedErrorWidget, {ignoreListManager: input.ignoreListManager, error: input.error})
      : widget(SymbolizedErrorWidget, {ignoreListManager: input.ignoreListManager})}
    ${widgetRef(SymbolizedErrorWidget, ensureWidgetCreated)}></devtools-widget>`, target);
  // clang-format on
};

/** A logged error, symbolized against its source maps before it is shown. */
export class ConsoleErrorParam extends UI.Widget.Widget {
  #remoteObject: SDK.RemoteObject.RemoteObject|null = null;
  #exceptionDetails?: Protocol.Runtime.ExceptionDetails;
  #error: Bindings.SymbolizedError.SymbolizedError|null = null;
  #symbolizeScheduled = false;
  #symbolized: Promise<void> = Promise.resolve();
  readonly #view: ErrorParamView;

  constructor(element?: HTMLElement, view: ErrorParamView = ERROR_PARAM_VIEW) {
    super(element);
    this.element.classList.remove('widget');
    this.#view = view;
  }

  set remoteObject(remoteObject: SDK.RemoteObject.RemoteObject) {
    if (this.#remoteObject === remoteObject) {
      return;
    }
    this.#remoteObject = remoteObject;
    this.#scheduleSymbolize();
  }

  set exceptionDetails(exceptionDetails: Protocol.Runtime.ExceptionDetails|undefined) {
    if (this.#exceptionDetails === exceptionDetails) {
      return;
    }
    this.#exceptionDetails = exceptionDetails;
    this.#scheduleSymbolize();
  }

  /** Resolves once the error is symbolized and rendered. */
  get symbolizedForTest(): Promise<void> {
    return this.#symbolized;
  }

  #scheduleSymbolize(): void {
    this.#error = null;
    this.requestUpdate();
    // Both properties are usually set together; symbolize once for both.
    if (this.#symbolizeScheduled) {
      return;
    }
    this.#symbolizeScheduled = true;
    this.#symbolized = Promise.resolve().then(() => {
      this.#symbolizeScheduled = false;
      return this.#symbolize();
    });
  }

  async #symbolize(): Promise<void> {
    const remoteObject = this.#remoteObject;
    if (!remoteObject) {
      return;
    }
    const error = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createSymbolizedError(
        remoteObject, this.#exceptionDetails);
    if (remoteObject !== this.#remoteObject || !error) {
      return;
    }
    this.#error = error;
    this.requestUpdate();
    await this.updateComplete;
    await UI.Widget.Widget.allUpdatesComplete;
  }

  override performUpdate(): void {
    this.#view({error: this.#error, ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager.instance()},
               undefined, this.contentElement);
  }
}

export class ConsoleViewMessage implements ConsoleViewportElement {
  protected message: SDK.ConsoleModel.ConsoleMessage;
  private readonly linkifier: Components.Linkifier.Linkifier;
  private repeatCountInternal: number;
  private closeGroupDecorationCount: number;
  private consoleGroupInternal: ConsoleGroupViewMessage|null;
  // Re-formatting reuses these, so that the rendered parameters keep their
  // identity and async content isn't requested and rendered again.
  readonly #remoteObjects = new WeakMap<Protocol.Runtime.RemoteObject, SDK.RemoteObject.RemoteObject>();
  readonly #objectFunctionTitlePromises = new WeakMap<SDK.RemoteObject.RemoteObject, Promise<LitTemplate>>();
  readonly #functionParameterPromises =
      new WeakMap<SDK.RemoteObject.RemoteObject, Map<boolean, Promise<LitTemplate>>>();
  // Stack trace previews are also root widgets and follow the message visibility.
  private readonly stackTracePreviews: Components.JSPresentationUtils.StackTracePreviewContent[] = [];
  private readonly messageResized:
      (arg0: Common.EventTarget.EventTargetEvent<HTMLElement|UI.TreeOutline.TreeElement>) => void;
  // The wrapper that contains consoleRowWrapper and other elements in a column.
  protected elementInternal: HTMLElement|null;
  // The element that wraps console message elements in a row.
  protected consoleRowWrapper: HTMLElement|null = null;
  protected readonly previewFormatter: ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter;
  private searchRegexInternal: RegExp|null;
  protected messageIcon: Icon|null;
  private traceExpanded: boolean;
  private expandTrace: ((arg0: boolean) => void)|null;
  private hasStackTrace: boolean;
  protected anchorElement: HTMLElement|null;
  protected contentElementInternal: HTMLElement|null;
  private nestingLevelMarkers: HTMLElement[]|null;
  private searchHighlightNodes: Element[];
  private searchHighlightNodeChanges: Highlighting.HighlightChange[];
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
  #adjacentUserCommandResult = false;
  #teaser: ConsoleInsightTeaser|undefined = undefined;

  /** Formatting Error#stack is asynchronous. Allow tests to wait for the result */
  #formatErrorStackPromiseForTest = Promise.resolve();

  constructor(
      consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier,
      requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver,
      onResize: (arg0: Common.EventTarget.EventTargetEvent<HTMLElement|UI.TreeOutline.TreeElement>) => void) {
    this.message = consoleMessage;
    this.linkifier = linkifier;
    this.requestResolver = requestResolver;
    this.issueResolver = issueResolver;
    this.repeatCountInternal = 1;
    this.closeGroupDecorationCount = 0;
    this.messageResized = onResize;
    this.elementInternal = null;

    this.previewFormatter = new ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
    this.searchRegexInternal = null;
    this.messageIcon = null;
    this.traceExpanded = false;
    this.expandTrace = null;
    this.hasStackTrace = false;
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

  setInsight(insight: LitTemplate): void {
    if (this.elementInternal) {
      render(insight, this.elementInternal);
      this.elementInternal.classList.toggle('has-insight', true);
      this.elementInternal.addEventListener('closeinsight', () => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightClosed);
        if (this.elementInternal) {
          this.elementInternal.classList.toggle('has-insight', false);
          render(nothing, this.elementInternal);
        }
        this.#teaser?.setInactive(false);
      }, {once: true});
      this.#teaser?.setInactive(true);
    }
  }

  element(): HTMLElement {
    return this.toMessageElement();
  }

  wasShown(): void {
    this.isVisibleInternal = true;
    for (const nodeParam of this.#nodeParams()) {
      nodeParam.visible = true;
    }
    for (const stackTracePreview of this.stackTracePreviews) {
      stackTracePreview.wasShown();
    }
    if (this.elementInternal && this.#teaser) {
      this.#teaser.show(this.elementInternal, this.consoleRowWrapper);
    }
  }

  onResize(): void {
  }

  #nodeParams(): ConsoleNodeParam[] {
    const hosts = this.elementInternal?.querySelectorAll<HTMLElement>('.console-node-param') ?? [];
    return [...hosts].map(host => UI.Widget.Widget.get(host)).filter(param => param instanceof ConsoleNodeParam);
  }

  willHide(): void {
    this.isVisibleInternal = false;
    this.cachedHeight = this.element().offsetHeight;
    for (const nodeParam of this.#nodeParams()) {
      nodeParam.visible = false;
    }
    for (const stackTracePreview of this.stackTracePreviews) {
      stackTracePreview.willHide();
    }
    if (this.#teaser) {
      const {okToRemove} = this.#teaser.abortTeaserGeneration();
      this.#teaser.detach();
      if (okToRemove) {
        this.#teaser = undefined;
      }
    }
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
          if (Common.Settings.Settings.instance().resolve(SDK.SDKSettings.preserveConsoleLogSettingDescriptor).get()) {
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
          if (this.message.parameters?.length === 1) {
            const parameter = this.message.parameters[0];
            if (typeof parameter !== 'string' && parameter.type === 'string') {
              const value = parameter.value as string;
              const runtimeModel = this.message.runtimeModel();
              if (runtimeModel && Bindings.SymbolizedError.isErrorLike(value)) {
                const remoteObj = parameter instanceof SDK.RemoteObject.RemoteObject ?
                    parameter :
                    runtimeModel.createRemoteObject(parameter);
                messageElement = document.createElement('span');
                render(this.renderSymbolizedError(remoteObj), messageElement);
              }
            }
          }
          const args = this.message.parameters || [messageText];
          messageElement = messageElement || this.format(args);
        }
      }
    } else if (this.message.source === Protocol.Log.LogEntrySource.Network) {
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
      linkElement.setAttribute(SELECTABLE_ATTRIBUTE, '');
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
      const initiatorId = (): Components.Linkifier.OpenInNewTabInitiatorId|undefined => this.initiatorId();
      const fragment =
          ConsoleViewMessage.linkifyWithCustomLinkifier(messageText, (text, url, lineNumber, columnNumber) => {
            const linkElement = url === request.url() ?
                Components.Linkifier.Linkifier.linkifyRevealable((request), url, request.url(), undefined, undefined,
                                                                 'network-request') :
                Components.Linkifier.Linkifier.linkifyURL(
                    url, ({text, lineNumber, columnNumber, initiatorId} as Components.Linkifier.LinkifyURLOptions));
            linkElement.tabIndex = -1;
            linkElement.setAttribute(SELECTABLE_ATTRIBUTE, '');
            return linkElement;
          });
      appendOrShow(messageElement, fragment);
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
          revealBreakpoint: true,
          userMetric,
        });
      }
      if (scriptId) {
        return this.linkifier.linkifyScriptLocation(runtimeModel.target(), scriptId,
                                                    url || Platform.DevToolsPath.EmptyUrlString, line,
                                                    {columnNumber: column, userMetric});
      }
      if (stackTrace?.callFrames.length) {
        return this.linkifier.linkifyStackTraceTopFrame(runtimeModel.target(), stackTrace);
      }
      if (url && url !== 'undefined') {
        return this.linkifier.linkifyScriptLocation(runtimeModel.target(), /* scriptId */ null, url, line,
                                                    {columnNumber: column, userMetric});
      }
      return null;
    };

    const anchorElement = linkify(this.message);
    // Append a space to prevent the anchor text from being glued to the console message when the user selects and copies the console messages.
    if (anchorElement) {
      anchorElement.tabIndex = -1;
      anchorElement.setAttribute(SELECTABLE_ATTRIBUTE, '');
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

    // No source location anchor exists, but there may still be affected resource links to display.
    const affectedResourceElements = this.createAffectedResourceLinks();
    if (affectedResourceElements.length) {
      const anchorWrapperElement = document.createElement('span');
      anchorWrapperElement.classList.add('console-message-anchor');
      for (const element of affectedResourceElements) {
        anchorWrapperElement.append(element);
      }
      UI.UIUtils.createTextChild(anchorWrapperElement, ' ');
      return anchorWrapperElement;
    }

    return null;
  }

  private buildMessageWithStackTrace(runtimeModel: SDK.RuntimeModel.RuntimeModel): HTMLElement {
    const icon = createIcon('triangle-right', 'console-message-expand-icon');
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
      UI.ARIAUtils.LiveAnnouncer.alert(stackTableState);
      UI.ARIAUtils.setExpanded(clickableElement, expand);
      this.traceExpanded = expand;
    };

    const toggleStackTrace = (event: Event): void => {
      if (UI.UIUtils.isEditing() || contentElement.hasSelection()) {
        return;
      }
      this.expandTrace?.(stackTraceElement.classList.contains('hidden-stack-trace'));
      event.consume();
    };

    clickableElement.addEventListener('click', toggleStackTrace, false);
    if (this.message.type === Protocol.Runtime.ConsoleAPICalledEventType.Trace &&
        Common.Settings.Settings.instance()
            .resolve(Settings.ConsoleSettings.consoleTraceExpandSettingDescriptor)
            .get()) {
      this.expandTrace(true);
    }

    this.hasStackTrace = true;

    // @ts-expect-error
    toggleElement._expandStackTraceForTest = this.expandTrace.bind(this, true);
    return toggleElement;
  }

  private buildMessageWithIgnoreLinks(): HTMLElement {
    const {toggleElement} = this.buildMessageHelper(null, undefined, null);
    return toggleElement;
  }

  private buildMessageHelper(
      target: SDK.Target.Target|null, stackTrace: Protocol.Runtime.StackTrace|undefined, icon: Icon|null): {
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
    if (stackTrace) {
      // Intercept focus to avoid highlight on click.
      clickableElement.tabIndex = -1;
    }
    clickableElement.appendChild(messageElement);
    const stackTraceElement = contentElement.createChild('div', 'hidden-stack-trace');
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const stackTraceTarget = target ?? targetManager.primaryPageTarget() ?? targetManager.rootTarget();
    const stackTracePreview = new Components.JSPresentationUtils.StackTracePreviewContent();
    stackTracePreview.options = {widthConstrained: true};
    if (stackTraceTarget && stackTrace) {
      const stackTracePromise = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
                                    .createStackTraceFromProtocolRuntime(stackTrace, stackTraceTarget)
                                    .then(stackTrace => {
                                      stackTracePreview.stackTrace = stackTrace;
                                      return stackTracePreview.updateComplete;
                                    });
      this.#formatErrorStackPromiseForTest =
          Promise.all([this.#formatErrorStackPromiseForTest, stackTracePromise]).then(() => {});
    }
    stackTracePreview.element.setAttribute(SELECTABLE_ATTRIBUTE, SelectableKind.LINKS);
    stackTracePreview.markAsRoot();
    stackTracePreview.show(stackTraceElement);
    // The stack trace preview is a root widget, so it does not learn about the
    // message visibility from the widget hierarchy. Follow the message instead
    // (see wasShown/willHide) so that the preview does not stay alive through
    // the global listeners it registers while showing.
    this.stackTracePreviews.push(stackTracePreview);
    if (!this.isVisibleInternal) {
      stackTracePreview.willHide();
    }
    UI.ARIAUtils.setLabel(
        contentElement, `${messageElement.textContent} ${i18nString(UIStrings.stackMessageCollapsed)}`);
    UI.ARIAUtils.markAsGroup(stackTraceElement);

    return {stackTraceElement, contentElement, messageElement, clickableElement, toggleElement};
  }

  private format(rawParameters: Array<string|SDK.RemoteObject.RemoteObject|Protocol.Runtime.RemoteObject|undefined>):
      HTMLElement {
    const formattedResult = document.createElement('span');
    const parts: Array<LitTemplate|Node|string> = [];
    if (this.messagePrefix) {
      parts.push(html`<span>${this.messagePrefix}</span>`);
    }
    if (!rawParameters.length) {
      if (parts.length) {
        render(html`${parts}`, formattedResult);
      }
      return formattedResult;
    }

    // Formatting code below assumes that parameters are all wrappers whereas frontend console
    // API allows passing arbitrary values as messages (strings, numbers, etc.). Wrap them here.
    let parameters = rawParameters.map(parameter => this.#parameterToRemoteObject(parameter));

    // There can be string log and string eval result. We distinguish between them based on message type.
    const shouldFormatMessage = SDK.RemoteObject.RemoteObject.type((parameters)[0]) === 'string' &&
        (this.message.type !== SDK.ConsoleModel.FrontendMessageType.Result ||
         this.message.level === Protocol.Log.LogEntryLevel.Error);

    // Multiple parameters with the first being a format string. Save unused substitutions.
    if (shouldFormatMessage) {
      parameters = this.formatWithSubstitutionString((parameters[0].description as string), parameters.slice(1), parts);
      if (parameters.length) {
        parts.push(' ');
      }
    }

    // Single parameter, or unused substitutions from above.
    for (let i = 0; i < parameters.length; ++i) {
      // Inline strings when formatting.
      if (shouldFormatMessage && parameters[i].type === 'string') {
        parts.push(this.linkifyStringAsFragment(parameters[i].description || ''));
      } else {
        parts.push(this.formatParameter(parameters[i], false, true));
      }
      if (i < parameters.length - 1) {
        parts.push(' ');
      }
    }
    render(html`${parts}`, formattedResult);
    return formattedResult;
  }

  protected formatParameter(output: SDK.RemoteObject.RemoteObject, forceObjectFormat?: boolean,
                            includePreview?: boolean): LitTemplate {
    if (output.customPreview()) {
      return html`${widget(ObjectUI.CustomPreviewComponent.CustomPreviewComponent, {object: output})}`;
    }

    const outputType = forceObjectFormat ? 'object' : (output.subtype || output.type);
    const typeClasses = `object-value-${outputType} source-code`;
    switch (outputType) {
      case 'error':
        return this.renderSymbolizedError(output, typeClasses);
      case 'function':
        return this.formatParameterAsFunction(output, includePreview, typeClasses);
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
        return this.formatParameterAsObject(output, includePreview, typeClasses);
      case 'node':
        return output.isNode() ? this.formatParameterAsNode(output, typeClasses) :
                                 this.formatParameterAsObject(output, false, typeClasses);
      case 'trustedtype':
        return this.formatParameterAsObject(output, false, typeClasses);
      case 'string':
        return this.formatParameterAsString(output, typeClasses);
      case 'boolean':
      case 'date':
      case 'null':
      case 'number':
      case 'regexp':
      case 'symbol':
      case 'undefined':
      case 'bigint':
        return this.formatParameterAsValue(output, typeClasses);
      default:
        console.error(`Tried to format remote object of unknown type ${outputType}.`);
        return this.formatParameterAsValue(output, typeClasses);
    }
  }

  private formatParameterAsValue(obj: SDK.RemoteObject.RemoteObject, extraClasses = ''): LitTemplate {
    const description = obj.description || '';
    const classes = extraClasses || undefined;
    // clang-format off
    return html`<span
      class=${ifDefined(classes)}
      @contextmenu=${this.contextMenuEventFired.bind(this, obj)}>${
      description.length > getMaxTokenizableStringLength()
        ? widget(ObjectUI.ObjectPropertiesSection.ExpandableTextPropertyValue, {
            text: description,
            maxLength: getLongStringVisibleLength(),
          })
        : description}</span>`;
    // clang-format on
  }

  private formatParameterAsTrustedType(obj: SDK.RemoteObject.RemoteObject): LitTemplate {
    return html`<span>${`${obj.className} `}<span class="object-value-string">${
        this.formatParameterAsString(obj)}</span></span>`;
  }

  private formatParameterAsObject(obj: SDK.RemoteObject.RemoteObject, includePreview?: boolean,
                                  extraClasses = ''): LitTemplate {
    const isExpandable = Boolean(obj.hasChildren && !obj.customPreview());

    const renderTitleSpan = (extraSpanClasses = '', withContextMenu = false, filterChanged = false,
                             includeNullOrUndefinedValues = true): LitTemplate => {
      const showPreview = Boolean((includePreview || filterChanged) && obj.preview);
      const spanClasses = [
        'console-object',
        showPreview ? 'console-object-preview' : '',
        !showPreview && obj.type === 'function' ? 'object-value-function' : '',
        extraSpanClasses,
      ].filter(Boolean).join(' ');
      let inner: LitTemplate|string;
      if (showPreview && obj.preview) {
        inner = html`${this.previewFormatter.renderObjectPreview(obj.preview, includeNullOrUndefinedValues)}${
            ObjectUI.ObjectPropertiesSection.getMemoryIcon(obj)}`;
      } else if (obj.type === 'function') {
        inner = html`${until(this.#getObjectFunctionTitlePromise(obj))}`;
      } else if (obj.subtype === 'trustedtype') {
        inner = this.formatParameterAsTrustedType(obj);
      } else {
        inner = obj.description || '';
      }
      // clang-format off
          return html`<span
            tabindex="-1"
            class=${spanClasses}
            @contextmenu=${withContextMenu ? this.contextMenuEventFired.bind(this, obj) : nothing}>${inner}</span>`;
      // clang-format on
    };

    if (!isExpandable) {
      return renderTitleSpan(extraClasses, true);
    }

    const noteTitle = this.message.type === SDK.ConsoleModel.FrontendMessageType.QueryObjectResult ?
        i18nString(UIStrings.thisValueWillNotBeCollectedUntil) :
        i18nString(UIStrings.thisValueWasEvaluatedUponFirst);

    const sectionTitle: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionTitle = ({
      filterChanged,
      includeNullOrUndefinedValues,
    }): TemplateResult => {
      return html`<style>${consoleViewStyles}</style>${
          renderTitleSpan('', false, filterChanged, includeNullOrUndefinedValues)}<span
          class="object-state-note info-note" title=${noteTitle}></span>`;
    };

    // clang-format off
    return html`<span class=${ifDefined(extraClasses || undefined)}><devtools-widget
      class="console-view-object-properties-section"
      data-console-selectable=${SelectableKind.OBJECT}
      ${widget(ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget, {
        root: obj,
        title: sectionTitle,
        linkifier: this.linkifier,
        onTreeResized: this.#onTreeResized,
      })}
      ${widgetRef(ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget, ensureWidgetCreated)}></devtools-widget></span>`;
    // clang-format on
  }

  private formatParameterAsFunction(originalFunction: SDK.RemoteObject.RemoteObject, includePreview?: boolean,
                                    extraClasses = ''): LitTemplate {
    const previewKey = Boolean(includePreview);
    let byPreview = this.#functionParameterPromises.get(originalFunction);
    if (!byPreview) {
      byPreview = new Map();
      this.#functionParameterPromises.set(originalFunction, byPreview);
    }
    let promise = byPreview.get(previewKey);
    if (!promise) {
      promise = SDK.RemoteObject.RemoteFunction.objectAsFunction(originalFunction)
                    .targetFunction()
                    .then(async targetFunction => {
                      const fnTemplate = await ObjectUI.ObjectPropertiesSection.formatObjectAsFunction(
                          targetFunction, true, includePreview);
                      const isBound = targetFunction !== originalFunction;
                      // clang-format off
                      return html`<span
                        @contextmenu=${this.contextMenuEventFired.bind(this, originalFunction)}>${
                        fnTemplate}${
                        isBound
                          ? html`<span
                              class="object-state-note info-note"
                              title=${i18nString(UIStrings.functionWasResolvedFromBound)}></span>`
                          : nothing}</span>`;
                      // clang-format on
                    });
      byPreview.set(previewKey, promise);
    }
    void promise.then(() => {
      queueMicrotask(() => this.formattedParameterAsFunctionForTest());
    });
    return html`<span class=${ifDefined(extraClasses || undefined)}>${until(promise)}</span>`;
  }

  // Sniffed in web_tests and unit tests.
  private formattedParameterAsFunctionForTest(): void {
  }

  #parameterToRemoteObject(parameter?: SDK.RemoteObject.RemoteObject|Protocol.Runtime.RemoteObject|
                           string): SDK.RemoteObject.RemoteObject {
    const toRemoteObject = parameterToRemoteObject(this.message.runtimeModel());
    if (typeof parameter !== 'object' || parameter instanceof SDK.RemoteObject.RemoteObject) {
      return toRemoteObject(parameter);
    }
    let remoteObject = this.#remoteObjects.get(parameter);
    if (!remoteObject) {
      remoteObject = toRemoteObject(parameter);
      this.#remoteObjects.set(parameter, remoteObject);
    }
    return remoteObject;
  }

  #getObjectFunctionTitlePromise(obj: SDK.RemoteObject.RemoteObject): Promise<LitTemplate> {
    let promise = this.#objectFunctionTitlePromises.get(obj);
    if (!promise) {
      promise = ObjectUI.ObjectPropertiesSection.formatObjectAsFunction(obj, false);
      this.#objectFunctionTitlePromises.set(obj, promise);
    }
    return promise;
  }

  readonly #onTreeResized = (element: HTMLElement|UI.TreeOutline.TreeElement): void => {
    this.messageResized({data: element} as Common.EventTarget.EventTargetEvent<HTMLElement|UI.TreeOutline.TreeElement>);
  };

  private contextMenuEventFired(obj: SDK.RemoteObject.RemoteObject, event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(obj);
    void contextMenu.show();
  }

  protected renderPropertyPreviewOrAccessor(
      object: SDK.RemoteObject.RemoteObject|null, property: Protocol.Runtime.PropertyPreview, propertyPath: Array<{
        name: (string | symbol),
      }>): DocumentFragment|HTMLElement {
    if (property.type === 'accessor') {
      return this.formatAsAccessorProperty(object, propertyPath.map(property => property.name.toString()), false);
    }
    return this.renderPropertyPreview(
        property.type, 'subtype' in property ? property.subtype : undefined, null, property.value);
  }

  private formatParameterAsNode(remoteObject: SDK.RemoteObject.RemoteObject, extraClasses = ''): LitTemplate {
    // clang-format off
    return html`<devtools-widget class=${`console-node-param ${extraClasses}`}
      ${widget(ConsoleNodeParam, {
        remoteObject,
        visible: this.isVisibleInternal,
        renderFallback: this.#renderNodeParamFallback,
        onDimensionChange: this.#onNodeParamResized,
        onNodeResolved: this.#onNodeParamResolved,
      })}
      ${widgetRef(ConsoleNodeParam, ensureWidgetCreated)}></devtools-widget>`;
    // clang-format on
  }

  readonly #renderNodeParamFallback = (object: SDK.RemoteObject.RemoteObject): LitTemplate =>
      this.formatParameterAsObject(object, false);

  readonly #onNodeParamResized = (element: HTMLElement): void => {
    this.messageResized({data: element});
  };

  readonly #onNodeParamResolved = (): void => {
    this.formattedParameterAsNodeForTest();
  };

  // Sniffed in web_tests.
  private formattedParameterAsNodeForTest(): void {
  }

  private formatParameterAsString(output: SDK.RemoteObject.RemoteObject, extraClasses = ''): LitTemplate {
    const description = output.description ?? '';
    const text = Platform.StringUtilities.formatAsJSLiteral(description);
    // clang-format off
    return html`<span
      class=${ifDefined(extraClasses || undefined)}
      @contextmenu=${this.contextMenuEventFired.bind(this, output)}>${
      this.linkifyStringAsFragment(text)}</span>`;
    // clang-format on
  }

  private renderSymbolizedError(errorRemoteObject: SDK.RemoteObject.RemoteObject, extraClasses = ''): LitTemplate {
    // clang-format off
    return html`<devtools-widget class=${ifDefined(extraClasses || undefined)}
      ${widget(ConsoleErrorParam, {exceptionDetails: this.message.exceptionDetails, remoteObject: errorRemoteObject})}
      ${widgetRef(ConsoleErrorParam, errorParam => {
        this.#formatErrorStackPromiseForTest =
            Promise.all([this.#formatErrorStackPromiseForTest, errorParam.symbolizedForTest]).then(() => {});
      })}></devtools-widget>`;
    // clang-format on
  }

  private formatAsArrayEntry(output: SDK.RemoteObject.RemoteObject): DocumentFragment {
    return this.renderPropertyPreview(output.type, output.subtype, output.className, output.description);
  }

  private renderPropertyPreview(
      type: string, subtype: string|undefined, className: string|null|undefined,
      description: string|undefined): DocumentFragment {
    const fragment = document.createDocumentFragment();

    render(this.previewFormatter.renderPropertyPreview(type, subtype, className, description), fragment);
    return fragment;
  }

  createRemoteObjectAccessorPropertySpan(
      object: SDK.RemoteObject.RemoteObject|null, propertyPath: string[],
      callback: (arg0: SDK.RemoteObject.CallFunctionResult) => void): HTMLElement {
    const rootElement = document.createElement('span');
    const element = rootElement.createChild('span');
    element.textContent = i18nString(UIStrings.dots);
    if (!object) {
      return rootElement;
    }
    element.classList.add('object-value-calculate-value-button');
    UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.invokePropertyGetter));
    element.addEventListener('click', onInvokeGetterClick, false);

    function onInvokeGetterClick(event: Event): void {
      event.consume();
      if (object) {
        void object.callFunction(invokeGetter, [{value: JSON.stringify(propertyPath)}]).then(callback);
      }
    }

    function invokeGetter(this: Object, arrayStr: string): Object {
      let result: Object = this;
      const properties = JSON.parse(arrayStr);
      for (let i = 0, n = properties.length; i < n; ++i) {
        // @ts-expect-error callFunction expects this to be a generic Object, so while this works we can't be more specific on types.
        result = result[properties[i]];
      }
      return result;
    }

    return rootElement;
  }

  private formatAsAccessorProperty(
      object: SDK.RemoteObject.RemoteObject|null, propertyPath: string[], isArrayEntry: boolean): HTMLElement {
    const rootElement =
        this.createRemoteObjectAccessorPropertySpan(object, propertyPath, onInvokeGetterClick.bind(this));

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
        rootElement.appendChild(this.renderPropertyPreview(type, subtype, object.className, description));
      }
    }

    return rootElement;
  }

  private formatWithSubstitutionString(formatString: string, parameters: SDK.RemoteObject.RemoteObject[],
                                       parts: Array<LitTemplate|Node|string>): SDK.RemoteObject.RemoteObject[] {
    const currentStyle = new Map();
    const {tokens, args} = format(formatString, parameters);
    for (const token of tokens) {
      switch (token.type) {
        case 'generic': {
          parts.push(this.formatParameter(token.value, true /* force */, false /* includePreview */));
          break;
        }
        case 'optimal': {
          parts.push(this.formatParameter(token.value, false /* force */, true /* includePreview */));
          break;
        }
        case 'string': {
          if (currentStyle.size === 0) {
            parts.push(this.linkifyStringAsFragment(token.value));
          } else {
            const lines = token.value.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (i > 0) {
                parts.push(document.createElement('br'));
              }
              const wrapper = document.createElement('span');
              wrapper.style.setProperty('contain', 'paint');
              wrapper.style.setProperty('display', 'inline-block');
              wrapper.style.setProperty('max-width', '100%');
              render(html`${this.linkifyStringAsFragment(lines[i])}`, wrapper);
              for (const [property, {value, priority}] of currentStyle) {
                wrapper.style.setProperty(property, value, priority);
              }
              parts.push(wrapper);
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
    const text = this.contentElement().deepTextContent() + this.message.messageText;
    return text.toLowerCase().includes(filter.toLowerCase());
  }

  updateTimestamp(): void {
    if (!this.contentElementInternal) {
      return;
    }

    if (Common.Settings.Settings.instance()
            .resolve(Settings.ConsoleSettings.consoleTimestampsEnabledSettingDescriptor)
            .get()) {
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

  isTraceExpanded(): boolean {
    return this.traceExpanded;
  }

  isExpandableTrace(): boolean {
    return this.hasStackTrace;
  }

  setTraceExpanded(expanded: boolean): void {
    if (this.expandTrace && this.traceExpanded !== expanded) {
      this.expandTrace(expanded);
    }
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

  private get selectableChildren(): SelectableChild[] {
    return collectSelectableChildren(this.elementInternal);
  }

  protected focusedChildIndex(): number {
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
      this.elementInternal?.focus();
      return true;
    }
    if (event.key === 'ArrowRight') {
      if (isWrapperFocused && this.selectNearestVisibleChild(0)) {
        return true;
      }
    }
    if (event.key === 'ArrowUp') {
      const firstVisibleChild = this.nearestVisibleChild(0);
      if (firstVisibleChild && this.selectableChildren[focusedChildIndex]?.element === firstVisibleChild.element) {
        this.elementInternal?.focus();
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

  private nearestVisibleChild(fromIndex: number, backwards?: boolean): SelectableChild|null {
    const children = this.selectableChildren;
    const childCount = children.length;
    if (fromIndex < 0 || fromIndex >= childCount) {
      return null;
    }
    const direction = backwards ? -1 : 1;
    let index = fromIndex;

    while (!children[index].element.offsetParent) {
      index += direction;
      if (index < 0 || index >= childCount) {
        return null;
      }
    }
    return children[index];
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

  #startTeaserGeneration(): void {
    if (!this.elementInternal) {
      return;
    }
    if (this.shouldShowTeaser()) {
      if (!this.#teaser) {
        const uuid = crypto.randomUUID();
        this.elementInternal.setAttribute('aria-details', `teaser-${uuid}`);
        this.#teaser = new ConsoleInsightTeaser(uuid, this);
        this.#teaser.show(this.elementInternal, this.consoleRowWrapper);
      }
      this.#teaser.maybeGenerateTeaser();
    } else {  // Removes teaser if preferences have changed
      this.#teaser?.detach();
      this.#teaser = undefined;
    }
  }

  #abortTeaserGeneration(): void {
    if (this.#teaser) {
      const {okToRemove} = this.#teaser.abortTeaserGeneration();
      if (okToRemove) {
        this.#teaser.detach();
        this.#teaser = undefined;
      }
    }
  }

  toMessageElement(): HTMLElement {
    if (this.elementInternal) {
      return this.elementInternal;
    }
    this.elementInternal = document.createElement('div');
    this.elementInternal.tabIndex = -1;
    this.elementInternal.addEventListener('keydown', (this.onKeyDown.bind(this) as EventListener));
    this.elementInternal.addEventListener('mouseenter', this.#startTeaserGeneration.bind(this));
    this.elementInternal.addEventListener('focusin', this.#startTeaserGeneration.bind(this));
    this.elementInternal.addEventListener('mouseleave', this.#abortTeaserGeneration.bind(this));
    this.elementInternal.addEventListener('focusout', this.#abortTeaserGeneration.bind(this));
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
                                        resize: true,
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
      this.similarGroupMarker = this.consoleRowWrapper.createChild('div', 'nesting-level-marker');
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

  shouldShowTeaser(): boolean {
    if (!this.shouldShowInsights()) {
      return false;
    }
    if (!Common.Settings.Settings.instance()
             .resolve(Settings.ConsoleSettings.consoleInsightTeasersEnabledSettingDescriptor)
             .get() ||
        !AiAssistanceModel.BuiltInAi.BuiltInAi.instance().isEventuallyAvailable()) {
      return false;
    }
    const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
    if (!devtoolsLocale.locale.startsWith('en-')) {
      return false;
    }
    return true;
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
    const icon = new Icon();
    icon.name = 'lightbulb-spark';
    icon.style.color = 'var(--devtools-icon-color)';
    icon.classList.add('medium');
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
    // We use a data attribute and a CSS pseudo-element for the button label
    // to prevent the text from being picked up by the console's custom
    // copy-to-clipboard traversal, which only collects actual text nodes.
    text.setAttribute('data-text', this.getExplainLabel());
    label.append(text);
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

    const color = '';
    let iconName = '';
    let accessibleName = '';
    if (this.message.level === Protocol.Log.LogEntryLevel.Warning) {
      iconName = 'warning-filled';
      accessibleName = i18nString(UIStrings.warning);
    } else if (this.message.level === Protocol.Log.LogEntryLevel.Error) {
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

    this.messageIcon = new Icon();
    this.messageIcon.name = iconName;
    this.messageIcon.style.color = color;
    this.messageIcon.classList.add('message-level-icon', 'small');
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
      this.repeatCountElement = document.createElement('dt-small-bubble');
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

  toString(): string {
    return Components.Linkifier.Linkifier.untruncatedTextContent(this.contentElement());
  }

  toExportString(): string {
    const lines = [];
    const messageContent = this.toString();
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
    if (this.searchHighlightNodeChanges?.length) {
      Highlighting.revertDomChanges(this.searchHighlightNodeChanges);
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
      this.searchHighlightNodes = Highlighting.highlightRangesWithStyleClass(
          this.contentElement(), sourceRanges, Highlighting.highlightedSearchResultClassName,
          this.searchHighlightNodeChanges);
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

  static linkifyWithCustomLinkifier(
      string: string,
      linkifier: (arg0: string, arg1: Platform.DevToolsPath.UrlString, arg2?: number, arg3?: number) => Node):
      DocumentFragment|UI.Widget.Widget {
    if (string.length > getMaxTokenizableStringLength()) {
      const propertyValue = new ObjectUI.ObjectPropertiesSection.ExpandableTextPropertyValue();
      propertyValue.text = string;
      propertyValue.maxLength = getLongStringVisibleLength();
      return propertyValue;
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

  /**
   * The frame or worker that this message came from, which the browser attributes opening one of the message's
   * URLs in a new tab to; see {@link Components.Linkifier.openInNewTabInitiatorId}. That is the frame of the
   * request for messages about a request, and the frame of the execution context otherwise, as long as that
   * context still exists. Messages whose context is gone (e.g. from a document that has since been navigated
   * away from, kept with "Preserve log") are not attributed to anything. Determined when a link is opened rather
   * than when the message is rendered, as the context may be destroyed in between.
   */
  private initiatorId(): Components.Linkifier.OpenInNewTabInitiatorId|undefined {
    const requestId = this.message.getAffectedResources()?.requestId;
    if (requestId) {
      const [request] = Logs.NetworkLog.NetworkLog.instance().requestsForId(requestId);
      if (request) {
        return Components.Linkifier.openInNewTabInitiatorId(request);
      }
    }
    const executionContext = this.message.runtimeModel()?.executionContext(this.message.getExecutionContextId());
    return executionContext ? Components.Linkifier.openInNewTabInitiatorId(executionContext) : undefined;
  }

  private linkifyStringAsFragment(string: string): DocumentFragment|LitTemplate {
    if (string.length > getMaxTokenizableStringLength()) {
      return html`${widget(ObjectUI.ObjectPropertiesSection.ExpandableTextPropertyValue, {
        text: string,
        maxLength: getLongStringVisibleLength(),
      })}`;
    }
    const initiatorId = (): Components.Linkifier.OpenInNewTabInitiatorId|undefined => this.initiatorId();
    return ConsoleViewMessage.linkifyWithCustomLinkifier(string, (text, url, lineNumber, columnNumber) => {
      const options = {text, lineNumber, columnNumber, initiatorId};
      const linkElement =
          Components.Linkifier.Linkifier.linkifyURL(url, (options as Components.Linkifier.LinkifyURLOptions));
      linkElement.tabIndex = -1;
      linkElement.setAttribute(SELECTABLE_ATTRIBUTE, '');
      return linkElement;
    }) as DocumentFragment;
  }

  private static tokenizeMessageText(string: string): Array<{
    text: string,
    type?: string,
  }> {
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
  tokenizerRegexes: RegExp[],
  tokenizerTypes: string[],
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
  private expandGroupIcon: Icon|null;
  private readonly onToggle: () => void;
  private groupEndMessageInternal: ConsoleViewMessage|null;

  constructor(
      consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier,
      requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver,
      onToggle: () => void,
      onResize: (arg0: Common.EventTarget.EventTargetEvent<HTMLElement|UI.TreeOutline.TreeElement>) => void) {
    console.assert(consoleMessage.isGroupStartMessage());
    super(consoleMessage, linkifier, requestResolver, issueResolver, onResize);
    this.collapsedInternal = consoleMessage.type === Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed;
    this.expandGroupIcon = null;
    this.onToggle = onToggle;
    this.groupEndMessageInternal = null;
  }

  setCollapsed(collapsed: boolean): void {
    this.setCollapsedSilent(collapsed);
    this.onToggle.call(null);
  }

  setCollapsedSilent(collapsed: boolean): void {
    this.collapsedInternal = collapsed;
    if (this.expandGroupIcon) {
      this.expandGroupIcon.name = this.collapsedInternal ? 'triangle-right' : 'triangle-down';
    }
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
      this.expandGroupIcon = createIcon(iconType, 'expand-group-icon');
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
    return Boolean(parent?.messagesHidden());
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
      onResize: (arg0: Common.EventTarget.EventTargetEvent<HTMLElement|UI.TreeOutline.TreeElement>) => void) {
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
    const userCommandIcon = new Icon();
    userCommandIcon.name = 'chevron-right';
    userCommandIcon.classList.add('command-result-icon', 'medium');
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
        const icon = new Icon();
        icon.name = 'chevron-left-dot';
        icon.classList.add('command-result-icon', 'medium');
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
      onResize: (arg0: Common.EventTarget.EventTargetEvent<HTMLElement|UI.TreeOutline.TreeElement>) => void) {
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

    const table = this.message.parameters?.length ? this.message.parameters[0] : null;
    if (!table) {
      return this.buildMessage();
    }
    const actualTable = parameterToRemoteObject(this.message.runtimeModel())(table);
    if (!actualTable?.preview) {
      return this.buildMessage();
    }

    const rawValueColumnSymbol = Symbol('rawValueColumn');
    const columnNames: Array<string|symbol> = [];
    const preview = actualTable.preview;
    const rows = [];
    for (let i = 0; i < preview.properties.length; ++i) {
      const rowProperty = preview.properties[i];
      let rowSubProperties: Protocol.Runtime.PropertyPreview[];
      if (rowProperty.valuePreview?.properties.length) {
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
              this.renderPropertyPreviewOrAccessor(actualTable, cellProperty, [rowProperty, cellProperty])
                  .firstElementChild as HTMLElement;
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
        this.dataGrid.setTableContextMenuCallback(this.populateTableContextMenu.bind(this));

        const formattedResult = document.createElement('span');
        formattedResult.classList.add('console-message-text');
        const tableElement = formattedResult.createChild('div', 'console-message-formatted-table');
        const dataGridContainer = document.createElement('span');
        render(html`${dataGridContainer}${this.formatParameter(actualTable, true, false)}`, tableElement);
        const shadowRoot = dataGridContainer.attachShadow({mode: 'open'});
        const dataGridWidget = this.dataGrid.asWidget();
        dataGridWidget.markAsRoot();
        dataGridWidget.show(shadowRoot as unknown as Element);
        dataGridWidget.registerRequiredCSS(consoleViewStyles, objectValueStyles);
        formattedMessage.appendChild(formattedResult);
        this.dataGrid.renderInline();
      }
    }
    return formattedMessage;
  }

  override approximateFastHeight(): number {
    const table = this.message.parameters?.[0];
    if (table && typeof table !== 'string' && table.preview) {
      return defaultConsoleRowHeight * table.preview.properties.length;
    }
    return defaultConsoleRowHeight;
  }

  private populateTableContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    const copySubMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString(UIStrings.copyTableAs));
    copySubMenu.defaultSection().appendItem(i18nString(UIStrings.copyAsMarkdown), this.copyTableAsMarkdown.bind(this),
                                            {jslogContext: 'copy-as-markdown'});
    copySubMenu.defaultSection().appendItem(i18nString(UIStrings.copyAsCsv), this.copyTableAsCSV.bind(this),
                                            {jslogContext: 'copy-as-csv'});
  }

  private copyTableAsMarkdown(): void {
    if (!this.dataGrid) {
      return;
    }
    const markdown = DataGrid.DataGridExporter.exportToMarkdown(this.dataGrid);
    UI.UIUtils.copyTextToClipboard(markdown);
  }

  private copyTableAsCSV(): void {
    if (!this.dataGrid) {
      return;
    }
    const csv = DataGrid.DataGridExporter.exportToCSV(this.dataGrid);
    UI.UIUtils.copyTextToClipboard(csv);
  }

  getDataGridForTest(): DataGrid.SortableDataGrid.SortableDataGrid<unknown>|null {
    return this.dataGrid;
  }

  populateTableContextMenuForTest(contextMenu: UI.ContextMenu.ContextMenu): void {
    this.populateTableContextMenu(contextMenu);
  }
}

/**
 * The maximum length before strings are considered too long for syntax highlighting.
 * @constant
 */
const MaxLengthToIgnoreHighlighter = 10000;

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
