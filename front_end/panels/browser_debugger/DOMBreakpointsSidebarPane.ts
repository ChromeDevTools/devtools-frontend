// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';
import * as Sources from '../sources/sources.js';

import domBreakpointsSidebarPaneStyles from './domBreakpointsSidebarPane.css.js';

const UIStrings = {
  /**
   * @description Header text to indicate there are no breakpoints
   */
  noBreakpoints: 'No DOM breakpoints',
  /**
   * @description DOM breakpoints description that shows if no DOM breakpoints are set
   */
  domBreakpointsDescription: 'DOM breakpoints pause on the code that changes a DOM node or its children.',
  /**
   * @description Accessibility label for the DOM breakpoints list in the Sources panel
   */
  domBreakpointsList: 'DOM Breakpoints list',
  /**
   * @description Text with two placeholders separated by a colon
   * @example {Node removed} PH1
   * @example {div#id1} PH2
   */
  sS: '{PH1}: {PH2}',
  /**
   * @description Text with three placeholders separated by a colon and a comma
   * @example {Node removed} PH1
   * @example {div#id1} PH2
   * @example {checked} PH3
   */
  sSS: '{PH1}: {PH2}, {PH3}',
  /**
   * @description Text exposed to screen readers on checked items.
   */
  checked: 'checked',
  /**
   * @description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
   */
  unchecked: 'unchecked',
  /**
   * @description Accessibility label for hit breakpoints in the Sources panel.
   * @example {checked} PH1
   */
  sBreakpointHit: '{PH1} breakpoint hit',
  /**
   * @description Screen reader description of a hit breakpoint in the Sources panel
   */
  breakpointHit: 'breakpoint hit',
  /**
   * @description A context menu item in the DOM Breakpoints sidebar that reveals the node on which the current breakpoint is set.
   */
  revealDomNodeInElementsPanel: 'Reveal DOM node in Elements panel',
  /**
   * @description Text to remove a breakpoint
   */
  removeBreakpoint: 'Remove breakpoint',
  /**
   * @description A context menu item in the DOMBreakpoints Sidebar Pane of the JavaScript Debugging pane in the Sources panel or the DOM Breakpoints pane in the Elements panel
   */
  removeAllDomBreakpoints: 'Remove all DOM breakpoints',
  /**
   * @description Text in DOMBreakpoints Sidebar Pane of the JavaScript Debugging pane in the Sources panel or the DOM Breakpoints pane in the Elements panel
   */
  subtreeModified: 'Subtree modified',
  /**
   * @description Text in DOMBreakpoints Sidebar Pane of the JavaScript Debugging pane in the Sources panel or the DOM Breakpoints pane in the Elements panel
   */
  attributeModified: 'Attribute modified',
  /**
   * @description Text in DOMBreakpoints Sidebar Pane of the JavaScript Debugging pane in the Sources panel or the DOM Breakpoints pane in the Elements panel
   */
  nodeRemoved: 'Node removed',
  /**
   * @description Entry in context menu of the elements pane, allowing developers to select a DOM
   * breakpoint for the element that they have right-clicked on. Short for the action 'set a
   * breakpoint on this DOM Element'. A breakpoint pauses the website when the code reaches a
   * specified line, or when a specific action happen (in this case, when the DOM Element is
   * modified).
   */
  breakOn: 'Break on',
  /**
   * @description Screen reader description for removing a DOM breakpoint.
   */
  breakpointRemoved: 'Breakpoint removed',
  /**
   * @description Screen reader description for setting a DOM breakpoint.
   */
  breakpointSet: 'Breakpoint set',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/browser_debugger/DOMBreakpointsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const DOM_BREAKPOINT_DOCUMENTATION_URL =
    'https://developer.chrome.com/docs/devtools/javascript/breakpoints#dom' as Platform.DevToolsPath.UrlString;

const {html, render, Directives} = Lit;
const {widget} = UI.Widget;

export interface Breakpoint {
  breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint;
  label: string;
  isHighlighted: boolean;
  isFocused: boolean;
}

export interface ViewInput {
  breakpoints: Breakpoint[];
  onBreakpointClick: (breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint) => void;
  onBreakpointCheckboxClick: (breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint) => void;
  onBreakpointContextMenu: (breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint, event: Event) => void;
  onBreakpointKeyDown: (breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint, event: Event) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const hasBreakpoints = input.breakpoints.length > 0;

  // clang-format off
  render(
    html`
      <style>${domBreakpointsSidebarPaneStyles}</style>
      <div class="dom-breakpoints-container" jslog=${VisualLogging.section('sources.dom-breakpoints').track({ resize: true })}>
        ${hasBreakpoints ? html
          `<ul class="breakpoint-list"
              aria-label=${i18nString(UIStrings.domBreakpointsList)}>
            ${input.breakpoints.map(item => {
              const {breakpoint} = item;
              const checkedStateText = breakpoint.enabled ? i18nString(UIStrings.checked) : i18nString(UIStrings.unchecked);
              const linkified = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(
                breakpoint.node, {preventKeyboardFocus: true, tooltip: undefined});
              const linkifiedText = breakpoint.node.simpleSelector();
              return html`
                <li class=${`breakpoint-entry ${item.isHighlighted ? 'breakpoint-hit' : ''}`}
                    tabindex=${item.isFocused ? '0' : '-1'}
                    @click=${() => input.onBreakpointClick(breakpoint)}
                    @contextmenu=${(e: Event) => input.onBreakpointContextMenu(breakpoint, e)}
                    @keydown=${(e: Event) => input.onBreakpointKeyDown(breakpoint, e)}
                    aria-label=${i18nString(UIStrings.sSS, { PH1: item.label, PH2: linkifiedText, PH3: checkedStateText })}
                    aria-description=${item.isHighlighted ? i18nString(UIStrings.sBreakpointHit, { PH1: checkedStateText }) : checkedStateText}
                    jslog=${VisualLogging.domBreakpoint().context(breakpoint.type).track({ keydown: 'ArrowUp|ArrowDown|PageUp|PageDown' })}>
                  <devtools-checkbox
                    class="checkbox-label"
                    .checked=${breakpoint.enabled}
                    @click=${(e: Event) => e.stopPropagation()}
                    @change=${() => input.onBreakpointCheckboxClick(breakpoint)}
                    tabindex="-1"
                    aria-label=${i18nString(UIStrings.sS, { PH1: item.label, PH2: linkifiedText })}
                    aria-description=${Directives.ifDefined(item.isHighlighted ? i18nString(UIStrings.breakpointHit) : undefined)}
                    jslog=${VisualLogging.toggle().track({ click: true })}>
                  </devtools-checkbox>
                  <div class="dom-breakpoint">
                    <code class="monospace" style="display: block;">${linkified}</code>
                    <div>${item.label}</div>
                  </div>
                </li>`;
              })}
          </ul>` : html
          `<div class="placeholder">
            <div class="gray-info-message">${i18nString(UIStrings.noBreakpoints)}</div>
            ${widget(UI.EmptyWidget.EmptyWidget, {
              header: i18nString(UIStrings.noBreakpoints),
              text: i18nString(UIStrings.domBreakpointsDescription),
              link: DOM_BREAKPOINT_DOCUMENTATION_URL,
            })}
          </div>`}
      </div>
    `,
    target
  );
          // clang-format on
};

let domBreakpointsSidebarPaneInstance: DOMBreakpointsSidebarPane;

export class DOMBreakpointsSidebarPane extends UI.Widget.VBox implements
    UI.ContextFlavorListener.ContextFlavorListener {
  readonly #breakpoints: SDK.DOMDebuggerModel.DOMBreakpoint[] = [];
  #highlightedBreakpoint: SDK.DOMDebuggerModel.DOMBreakpoint|null = null;
  #focusedBreakpoint: SDK.DOMDebuggerModel.DOMBreakpoint|null = null;
  readonly #view: View;

  set highlightedBreakpoint(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint|null) {
    this.#highlightedBreakpoint = breakpoint;
    this.requestUpdate();
  }

  set focusedBreakpoint(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint|null) {
    if (this.#focusedBreakpoint === breakpoint) {
      return;
    }
    this.#focusedBreakpoint = breakpoint;
    this.#synchronizeFocusedBreakpoint();
    this.requestUpdate();
  }

  #synchronizeFocusedBreakpoint(): void {
    if (this.#focusedBreakpoint && !this.#breakpoints.includes(this.#focusedBreakpoint)) {
      this.#focusedBreakpoint = null;
    }
    if (!this.#focusedBreakpoint && this.#breakpoints.length > 0) {
      this.#focusedBreakpoint = this.#breakpoints[0];
    }
  }

  constructor(view = DEFAULT_VIEW) {
    super({useShadowDom: true});

    this.#view = view;

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMDebuggerModel.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOM_BREAKPOINT_ADDED, this.breakpointAdded,
        this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMDebuggerModel.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOM_BREAKPOINT_TOGGLED,
        this.breakpointToggled, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMDebuggerModel.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOM_BREAKPOINTS_REMOVED,
        this.breakpointsRemoved, this);

    for (const domDebuggerModel of SDK.TargetManager.TargetManager.instance().models(
             SDK.DOMDebuggerModel.DOMDebuggerModel)) {
      domDebuggerModel.retrieveDOMBreakpoints();
      for (const breakpoint of domDebuggerModel.domBreakpoints()) {
        this.addBreakpoint(breakpoint);
      }
    }

    this.update();
  }

  static instance(): DOMBreakpointsSidebarPane {
    if (!domBreakpointsSidebarPaneInstance) {
      domBreakpointsSidebarPaneInstance = new DOMBreakpointsSidebarPane();
    }
    return domBreakpointsSidebarPaneInstance;
  }

  override performUpdate(): void {
    const input: ViewInput = {
      breakpoints: this.#breakpoints.map(breakpoint => ({
                                           breakpoint,
                                           label: BreakpointTypeLabels.get(breakpoint.type)?.() ?? '',
                                           isHighlighted: breakpoint === this.#highlightedBreakpoint,
                                           isFocused: breakpoint === this.#focusedBreakpoint,
                                         })),
      onBreakpointClick: this.onBreakpointClick.bind(this),
      onBreakpointCheckboxClick: this.onBreakpointCheckboxClick.bind(this),
      onBreakpointContextMenu: this.onBreakpointContextMenu.bind(this),
      onBreakpointKeyDown: this.onBreakpointKeyDown.bind(this),
    };
    this.#view(input, undefined, this.contentElement);
  }

  private onBreakpointClick(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint): void {
    this.focusedBreakpoint = breakpoint;
  }

  private onBreakpointKeyDown(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint, event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === ' ') {
      this.onBreakpointCheckboxClick(breakpoint);
      keyboardEvent.consume(true);
    } else if (keyboardEvent.key === 'ArrowUp' || keyboardEvent.key === 'ArrowDown') {
      const index = this.#breakpoints.indexOf(breakpoint);
      const newIndex = keyboardEvent.key === 'ArrowUp' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < this.#breakpoints.length) {
        this.focusedBreakpoint = this.#breakpoints[newIndex];
        void this.updateComplete.then(() => {
          const entry = this.contentElement.querySelectorAll('.breakpoint-entry')[newIndex] as HTMLElement;
          entry.focus();
        });
        keyboardEvent.consume(true);
      }
    }
  }

  private breakpointAdded(event: Common.EventTarget.EventTargetEvent<SDK.DOMDebuggerModel.DOMBreakpoint>): void {
    this.addBreakpoint(event.data);
  }

  private breakpointToggled(_event: Common.EventTarget.EventTargetEvent<SDK.DOMDebuggerModel.DOMBreakpoint>): void {
    this.requestUpdate();
  }

  private breakpointsRemoved(event: Common.EventTarget.EventTargetEvent<SDK.DOMDebuggerModel.DOMBreakpoint[]>): void {
    const breakpoints = event.data;
    for (const breakpoint of breakpoints) {
      const index = this.#breakpoints.indexOf(breakpoint);
      if (index >= 0) {
        this.#breakpoints.splice(index, 1);
      }
    }
    this.#synchronizeFocusedBreakpoint();
    this.requestUpdate();
  }

  private addBreakpoint(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint): void {
    if (this.#breakpoints.includes(breakpoint)) {
      return;
    }
    this.#breakpoints.push(breakpoint);
    this.#breakpoints.sort((breakpointA, breakpointB) => {
      if (breakpointA.type > breakpointB.type) {
        return -1;
      }
      if (breakpointA.type < breakpointB.type) {
        return 1;
      }
      return 0;
    });
    this.#synchronizeFocusedBreakpoint();
    this.requestUpdate();
  }

  private onBreakpointContextMenu(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint, event: Event): void {
    this.focusedBreakpoint = breakpoint;
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.revealDomNodeInElementsPanel), () => Common.Revealer.reveal(breakpoint.node),
        {jslogContext: 'reveal-in-elements'});
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeBreakpoint), () => {
      breakpoint.domDebuggerModel.removeDOMBreakpoint(breakpoint.node, breakpoint.type);
    }, {jslogContext: 'remove-breakpoint'});
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeAllDomBreakpoints), () => {
      breakpoint.domDebuggerModel.removeAllDOMBreakpoints();
    }, {jslogContext: 'remove-all-dom-breakpoints'});
    void contextMenu.show();
  }

  private onBreakpointCheckboxClick(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint): void {
    this.focusedBreakpoint = breakpoint;
    breakpoint.domDebuggerModel.toggleDOMBreakpoint(breakpoint, !breakpoint.enabled);
  }

  flavorChanged(_object: Object|null): void {
    this.update();
  }

  update(): void {
    const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    this.highlightedBreakpoint = null;
    if (!details?.auxData || details.reason !== Protocol.Debugger.PausedEventReason.DOM) {
      return;
    }

    const domDebuggerModel = details.debuggerModel.target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    if (!domDebuggerModel) {
      return;
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = domDebuggerModel.resolveDOMBreakpointData(details.auxData as any);
    if (!data) {
      return;
    }

    for (const breakpoint of this.#breakpoints) {
      if (breakpoint.node === data.node && breakpoint.type === data.type) {
        this.highlightedBreakpoint = breakpoint;
        this.focusedBreakpoint = breakpoint;
      }
    }
    if (this.#highlightedBreakpoint) {
      void UI.ViewManager.ViewManager.instance().showView('sources.dom-breakpoints');
    }
  }
}

const BreakpointTypeLabels = new Map([
  [Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified, i18nLazyString(UIStrings.subtreeModified)],
  [Protocol.DOMDebugger.DOMBreakpointType.AttributeModified, i18nLazyString(UIStrings.attributeModified)],
  [Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved, i18nLazyString(UIStrings.nodeRemoved)],
]);

export class ContextMenuProvider implements UI.ContextMenu.Provider<SDK.DOMModel.DOMNode> {
  appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, node: SDK.DOMModel.DOMNode): void {
    if (node.pseudoType()) {
      return;
    }
    const domDebuggerModel = node.domModel().target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    if (!domDebuggerModel) {
      return;
    }

    function toggleBreakpoint(type: Protocol.DOMDebugger.DOMBreakpointType): void {
      if (!domDebuggerModel) {
        return;
      }
      const label = Sources.DebuggerPausedMessage.BreakpointTypeNouns.get(type);
      const labelString = label ? label() : '';
      if (domDebuggerModel.hasDOMBreakpoint(node, type)) {
        domDebuggerModel.removeDOMBreakpoint(node, type);
        UI.ARIAUtils.LiveAnnouncer.alert(`${i18nString(UIStrings.breakpointRemoved)}: ${labelString}`);
      } else {
        domDebuggerModel.setDOMBreakpoint(node, type);
        UI.ARIAUtils.LiveAnnouncer.alert(`${i18nString(UIStrings.breakpointSet)}: ${labelString}`);
      }
    }

    const breakpointsMenu =
        contextMenu.debugSection().appendSubMenuItem(i18nString(UIStrings.breakOn), false, 'break-on');
    const allBreakpointTypes: Protocol.EnumerableEnum<typeof Protocol.DOMDebugger.DOMBreakpointType> = {
      SubtreeModified: Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified,
      AttributeModified: Protocol.DOMDebugger.DOMBreakpointType.AttributeModified,
      NodeRemoved: Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved,
    };
    for (const type of Object.values(allBreakpointTypes)) {
      const label = Sources.DebuggerPausedMessage.BreakpointTypeNouns.get(type);
      if (label) {
        breakpointsMenu.defaultSection().appendCheckboxItem(
            label(), toggleBreakpoint.bind(null, type),
            {checked: domDebuggerModel.hasDOMBreakpoint(node, type), jslogContext: type});
      }
    }
  }
}
