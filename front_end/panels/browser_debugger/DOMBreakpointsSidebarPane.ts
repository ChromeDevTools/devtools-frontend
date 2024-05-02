/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Sources from '../sources/sources.js';

import domBreakpointsSidebarPaneStyles from './domBreakpointsSidebarPane.css.js';

const UIStrings = {
  /**
   *@description Text to indicate there are no breakpoints
   */
  noBreakpoints: 'No breakpoints',
  /**
   *@description Accessibility label for the DOM breakpoints list in the Sources panel
   */
  domBreakpointsList: 'DOM Breakpoints list',
  /**
   *@description Text with two placeholders separated by a colon
   *@example {Node removed} PH1
   *@example {div#id1} PH2
   */
  sS: '{PH1}: {PH2}',
  /**
   *@description Text with three placeholders separated by a colon and a comma
   *@example {Node removed} PH1
   *@example {div#id1} PH2
   *@example {checked} PH3
   */
  sSS: '{PH1}: {PH2}, {PH3}',
  /**
   *@description Text exposed to screen readers on checked items.
   */
  checked: 'checked',
  /**
   *@description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
   */
  unchecked: 'unchecked',
  /**
   *@description Accessibility label for hit breakpoints in the Sources panel.
   *@example {checked} PH1
   */
  sBreakpointHit: '{PH1} breakpoint hit',
  /**
   *@description Screen reader description of a hit breakpoint in the Sources panel
   */
  breakpointHit: 'breakpoint hit',
  /**
   *@description A context menu item in the DOM Breakpoints sidebar that reveals the node on which the current breakpoint is set.
   */
  revealDomNodeInElementsPanel: 'Reveal DOM node in Elements panel',
  /**
   *@description Text to remove a breakpoint
   */
  removeBreakpoint: 'Remove breakpoint',
  /**
   *@description A context menu item in the DOMBreakpoints Sidebar Pane of the JavaScript Debugging pane in the Sources panel or the DOM Breakpoints pane in the Elements panel
   */
  removeAllDomBreakpoints: 'Remove all DOM breakpoints',
  /**
   *@description Text in DOMBreakpoints Sidebar Pane of the JavaScript Debugging pane in the Sources panel or the DOM Breakpoints pane in the Elements panel
   */
  subtreeModified: 'Subtree modified',
  /**
   *@description Text in DOMBreakpoints Sidebar Pane of the JavaScript Debugging pane in the Sources panel or the DOM Breakpoints pane in the Elements panel
   */
  attributeModified: 'Attribute modified',
  /**
   *@description Text in DOMBreakpoints Sidebar Pane of the JavaScript Debugging pane in the Sources panel or the DOM Breakpoints pane in the Elements panel
   */
  nodeRemoved: 'Node removed',
  /**
   *@description Entry in context menu of the elements pane, allowing developers to select a DOM
   * breakpoint for the element that they have right-clicked on. Short for the action 'set a
   * breakpoint on this DOM Element'. A breakpoint pauses the website when the code reaches a
   * specified line, or when a specific action happen (in this case, when the DOM Element is
   * modified).
   */
  breakOn: 'Break on',
  /**
   *@description Screen reader description for removing a DOM breakpoint.
   */
  breakpointRemoved: 'Breakpoint removed',
  /**
   *@description Screen reader description for setting a DOM breakpoint.
   */
  breakpointSet: 'Breakpoint set',
};
const str_ = i18n.i18n.registerUIStrings('panels/browser_debugger/DOMBreakpointsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let domBreakpointsSidebarPaneInstance: DOMBreakpointsSidebarPane;

export class DOMBreakpointsSidebarPane extends UI.Widget.VBox implements
    UI.ContextFlavorListener.ContextFlavorListener, UI.ListControl.ListDelegate<SDK.DOMDebuggerModel.DOMBreakpoint> {
  elementToCheckboxes: WeakMap<Element, HTMLInputElement>;
  readonly #emptyElement: HTMLElement;
  readonly #breakpoints: UI.ListModel.ListModel<SDK.DOMDebuggerModel.DOMBreakpoint>;
  #list: UI.ListControl.ListControl<SDK.DOMDebuggerModel.DOMBreakpoint>;
  #highlightedBreakpoint: SDK.DOMDebuggerModel.DOMBreakpoint|null;

  private constructor() {
    super(true);

    this.elementToCheckboxes = new WeakMap();

    this.contentElement.setAttribute(
        'jslog', `${VisualLogging.section('sources.dom-breakpoints').track({resize: true})}`);
    this.#emptyElement = this.contentElement.createChild('div', 'gray-info-message');
    this.#emptyElement.textContent = i18nString(UIStrings.noBreakpoints);
    this.#breakpoints = new UI.ListModel.ListModel();
    this.#list = new UI.ListControl.ListControl(this.#breakpoints, this, UI.ListControl.ListMode.NonViewport);
    this.contentElement.appendChild(this.#list.element);
    this.#list.element.classList.add('breakpoint-list', 'hidden');
    UI.ARIAUtils.markAsList(this.#list.element);
    UI.ARIAUtils.setLabel(this.#list.element, i18nString(UIStrings.domBreakpointsList));
    this.#emptyElement.tabIndex = -1;

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMDebuggerModel.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOMBreakpointAdded, this.breakpointAdded,
        this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMDebuggerModel.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOMBreakpointToggled, this.breakpointToggled,
        this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMDebuggerModel.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOMBreakpointsRemoved,
        this.breakpointsRemoved, this);

    for (const domDebuggerModel of SDK.TargetManager.TargetManager.instance().models(
             SDK.DOMDebuggerModel.DOMDebuggerModel)) {
      domDebuggerModel.retrieveDOMBreakpoints();
      for (const breakpoint of domDebuggerModel.domBreakpoints()) {
        this.addBreakpoint(breakpoint);
      }
    }

    this.#highlightedBreakpoint = null;
    this.update();
  }

  static instance(): DOMBreakpointsSidebarPane {
    if (!domBreakpointsSidebarPaneInstance) {
      domBreakpointsSidebarPaneInstance = new DOMBreakpointsSidebarPane();
    }
    return domBreakpointsSidebarPaneInstance;
  }

  createElementForItem(item: SDK.DOMDebuggerModel.DOMBreakpoint): Element {
    const element = document.createElement('div');
    element.classList.add('breakpoint-entry');
    element.setAttribute('jslog', `${VisualLogging.domBreakpoint().context(item.type)}`);
    element.addEventListener('contextmenu', this.contextMenu.bind(this, item), true);
    UI.ARIAUtils.markAsListitem(element);
    element.tabIndex = -1;

    const checkboxLabel = UI.UIUtils.CheckboxLabel.create(/* title */ undefined, item.enabled);
    const checkboxElement = checkboxLabel.checkboxElement;
    checkboxElement.addEventListener('click', this.checkboxClicked.bind(this, item), false);
    checkboxElement.tabIndex = -1;
    this.elementToCheckboxes.set(element, checkboxElement);
    element.appendChild(checkboxLabel);
    element.addEventListener('keydown', event => {
      if (event.key === ' ') {
        checkboxLabel.checkboxElement.click();
        event.consume(true);
      }
    });

    const labelElement = document.createElement('div');
    labelElement.classList.add('dom-breakpoint');
    element.appendChild(labelElement);
    const description = document.createElement('div');
    const breakpointTypeLabel = BreakpointTypeLabels.get(item.type);
    description.textContent = breakpointTypeLabel ? breakpointTypeLabel() : null;
    const breakpointTypeText = breakpointTypeLabel ? breakpointTypeLabel() : '';
    UI.ARIAUtils.setLabel(checkboxElement, breakpointTypeText);
    checkboxElement.setAttribute('jslog', `${VisualLogging.toggle().track({click: true})}`);
    const checkedStateText = item.enabled ? i18nString(UIStrings.checked) : i18nString(UIStrings.unchecked);
    const linkifiedNode = document.createElement('monospace');
    linkifiedNode.style.display = 'block';
    labelElement.appendChild(linkifiedNode);
    void Common.Linkifier.Linkifier.linkify(item.node, {preventKeyboardFocus: true, tooltip: undefined})
        .then(linkified => {
          linkifiedNode.appendChild(linkified);
          // Give the checkbox an aria-label as it is required for all form element
          UI.ARIAUtils.setLabel(
              checkboxElement, i18nString(UIStrings.sS, {PH1: breakpointTypeText, PH2: linkified.deepTextContent()}));
          // The parent list element is the one that actually gets focused.
          // Assign it an aria-label with complete information for the screen reader to read out properly
          UI.ARIAUtils.setLabel(
              element,
              i18nString(
                  UIStrings.sSS, {PH1: breakpointTypeText, PH2: linkified.deepTextContent(), PH3: checkedStateText}));
        });

    labelElement.appendChild(description);

    if (item === this.#highlightedBreakpoint) {
      element.classList.add('breakpoint-hit');
      UI.ARIAUtils.setDescription(element, i18nString(UIStrings.sBreakpointHit, {PH1: checkedStateText}));
      UI.ARIAUtils.setDescription(checkboxElement, i18nString(UIStrings.breakpointHit));
    } else {
      UI.ARIAUtils.setDescription(element, checkedStateText);
    }

    this.#emptyElement.classList.add('hidden');
    this.#list.element.classList.remove('hidden');

    return element;
  }

  heightForItem(_item: SDK.DOMDebuggerModel.DOMBreakpoint): number {
    return 0;
  }

  isItemSelectable(_item: SDK.DOMDebuggerModel.DOMBreakpoint): boolean {
    return true;
  }

  updateSelectedItemARIA(_fromElement: Element|null, _toElement: Element|null): boolean {
    return true;
  }

  selectedItemChanged(
      from: SDK.DOMDebuggerModel.DOMBreakpoint|null, to: SDK.DOMDebuggerModel.DOMBreakpoint|null,
      fromElement: HTMLElement|null, toElement: HTMLElement|null): void {
    if (fromElement) {
      fromElement.tabIndex = -1;
    }

    if (toElement) {
      this.setDefaultFocusedElement(toElement);
      toElement.tabIndex = 0;
      if (this.hasFocus()) {
        toElement.focus();
      }
    }
  }

  private breakpointAdded(event: Common.EventTarget.EventTargetEvent<SDK.DOMDebuggerModel.DOMBreakpoint>): void {
    this.addBreakpoint(event.data);
  }

  private breakpointToggled(event: Common.EventTarget.EventTargetEvent<SDK.DOMDebuggerModel.DOMBreakpoint>): void {
    const hadFocus = this.hasFocus();
    const breakpoint = event.data;
    this.#list.refreshItem(breakpoint);
    if (hadFocus) {
      this.focus();
    }
  }

  private breakpointsRemoved(event: Common.EventTarget.EventTargetEvent<SDK.DOMDebuggerModel.DOMBreakpoint[]>): void {
    const hadFocus = this.hasFocus();
    const breakpoints = event.data;
    let lastIndex = -1;
    for (const breakpoint of breakpoints) {
      const index = this.#breakpoints.indexOf(breakpoint);
      if (index >= 0) {
        this.#breakpoints.remove(index);
        lastIndex = index;
      }
    }
    if (this.#breakpoints.length === 0) {
      this.#emptyElement.classList.remove('hidden');
      this.setDefaultFocusedElement(this.#emptyElement);
      this.#list.element.classList.add('hidden');
    } else if (lastIndex >= 0) {
      const breakpointToSelect = this.#breakpoints.at(lastIndex);
      if (breakpointToSelect) {
        this.#list.selectItem(breakpointToSelect);
      }
    }
    if (hadFocus) {
      this.focus();
    }
  }

  private addBreakpoint(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint): void {
    this.#breakpoints.insertWithComparator(breakpoint, (breakpointA, breakpointB) => {
      if (breakpointA.type > breakpointB.type) {
        return -1;
      }
      if (breakpointA.type < breakpointB.type) {
        return 1;
      }
      return 0;
    });
    if (!this.#list.selectedItem() || !this.hasFocus()) {
      this.#list.selectItem(this.#breakpoints.at(0));
    }
  }

  private contextMenu(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint, event: Event): void {
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

  private checkboxClicked(breakpoint: SDK.DOMDebuggerModel.DOMBreakpoint, event: Event): void {
    breakpoint.domDebuggerModel.toggleDOMBreakpoint(
        breakpoint, event.target ? (event.target as HTMLInputElement).checked : false);
  }

  flavorChanged(_object: Object|null): void {
    this.update();
  }

  private update(): void {
    const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    if (this.#highlightedBreakpoint) {
      const oldHighlightedBreakpoint = this.#highlightedBreakpoint;
      this.#highlightedBreakpoint = null;
      this.#list.refreshItem(oldHighlightedBreakpoint);
    }
    if (!details || !details.auxData || details.reason !== Protocol.Debugger.PausedEventReason.DOM) {
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
        this.#highlightedBreakpoint = breakpoint;
      }
    }
    if (this.#highlightedBreakpoint) {
      this.#list.refreshItem(this.#highlightedBreakpoint);
    }
    void UI.ViewManager.ViewManager.instance().showView('sources.dom-breakpoints');
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([domBreakpointsSidebarPaneStyles]);
  }
}

const BreakpointTypeLabels = new Map([
  [Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified, i18nLazyString(UIStrings.subtreeModified)],
  [Protocol.DOMDebugger.DOMBreakpointType.AttributeModified, i18nLazyString(UIStrings.attributeModified)],
  [Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved, i18nLazyString(UIStrings.nodeRemoved)],
]);

export class ContextMenuProvider implements UI.ContextMenu.Provider<SDK.DOMModel.DOMNode> {
  appendApplicableItems(event: Event, contextMenu: UI.ContextMenu.ContextMenu, node: SDK.DOMModel.DOMNode): void {
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
        UI.ARIAUtils.alert(`${i18nString(UIStrings.breakpointRemoved)}: ${labelString}`);
      } else {
        domDebuggerModel.setDOMBreakpoint(node, type);
        UI.ARIAUtils.alert(`${i18nString(UIStrings.breakpointSet)}: ${labelString}`);
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
