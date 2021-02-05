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

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as Sources from '../sources/sources.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
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
  *@description Text exposed to screen readers on checked items.
  */
  checked: 'checked',
  /**
  *@description Text exposed to screen readers on unchecked items.
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
  *@description A context menu item in the DOMBreakpoints Sidebar Pane of the JavaScript Debugging pane in the Sources panel or the DOM Breakpoints pane in the Elements panel
  */
  breakOn: 'Break on',
};
const str_ = i18n.i18n.registerUIStrings('browser_debugger/DOMBreakpointsSidebarPane.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** @type {!DOMBreakpointsSidebarPane} */
let domBreakpointsSidebarPaneInstance;

/**
 * @implements {UI.ContextFlavorListener.ContextFlavorListener}
 * @implements {UI.ListControl.ListDelegate<!SDK.DOMDebuggerModel.DOMBreakpoint>}
 */
export class DOMBreakpointsSidebarPane extends UI.Widget.VBox {
  /**
   * @private
   */
  constructor() {
    super(true);
    this.registerRequiredCSS('browser_debugger/domBreakpointsSidebarPane.css', {enableLegacyPatching: false});

    /** @type {!WeakMap<!Element, !HTMLInputElement>} */
    this.elementToCheckboxes = new WeakMap();

    this._emptyElement = this.contentElement.createChild('div', 'gray-info-message');
    this._emptyElement.textContent = i18nString(UIStrings.noBreakpoints);
    /** @type {!UI.ListModel.ListModel.<!SDK.DOMDebuggerModel.DOMBreakpoint>} */
    this._breakpoints = new UI.ListModel.ListModel();
    /** @type {!UI.ListControl.ListControl.<!SDK.DOMDebuggerModel.DOMBreakpoint>} */
    this._list = new UI.ListControl.ListControl(this._breakpoints, this, UI.ListControl.ListMode.NonViewport);
    this.contentElement.appendChild(this._list.element);
    this._list.element.classList.add('breakpoint-list', 'hidden');
    UI.ARIAUtils.markAsList(this._list.element);
    UI.ARIAUtils.setAccessibleName(this._list.element, i18nString(UIStrings.domBreakpointsList));
    this._emptyElement.tabIndex = -1;

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMDebuggerModel.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOMBreakpointAdded, this._breakpointAdded,
        this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMDebuggerModel.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOMBreakpointToggled,
        this._breakpointToggled, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMDebuggerModel.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOMBreakpointsRemoved,
        this._breakpointsRemoved, this);

    for (const domDebuggerModel of SDK.SDKModel.TargetManager.instance().models(
             SDK.DOMDebuggerModel.DOMDebuggerModel)) {
      domDebuggerModel.retrieveDOMBreakpoints();
      for (const breakpoint of domDebuggerModel.domBreakpoints()) {
        this._addBreakpoint(breakpoint);
      }
    }

    this._highlightedBreakpoint = null;
    this._update();
  }

  static instance() {
    if (!domBreakpointsSidebarPaneInstance) {
      domBreakpointsSidebarPaneInstance = new DOMBreakpointsSidebarPane();
    }
    return domBreakpointsSidebarPaneInstance;
  }

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const element = document.createElement('div');
    element.classList.add('breakpoint-entry');
    element.addEventListener('contextmenu', this._contextMenu.bind(this, item), true);
    UI.ARIAUtils.markAsListitem(element);
    element.tabIndex = -1;

    const checkboxLabel = UI.UIUtils.CheckboxLabel.create(/* title */ undefined, item.enabled);
    const checkboxElement = checkboxLabel.checkboxElement;
    checkboxElement.addEventListener('click', this._checkboxClicked.bind(this, item), false);
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
    description.textContent = breakpointTypeLabel || null;
    UI.ARIAUtils.setAccessibleName(checkboxElement, breakpointTypeLabel || '');
    const linkifiedNode = document.createElement('monospace');
    linkifiedNode.style.display = 'block';
    labelElement.appendChild(linkifiedNode);
    Common.Linkifier.Linkifier.linkify(item.node, {preventKeyboardFocus: true, tooltip: undefined}).then(linkified => {
      linkifiedNode.appendChild(linkified);
      UI.ARIAUtils.setAccessibleName(
          checkboxElement, i18nString(UIStrings.sS, {PH1: breakpointTypeLabel, PH2: linkified.deepTextContent()}));
    });

    labelElement.appendChild(description);

    const checkedStateText = item.enabled ? i18nString(UIStrings.checked) : i18nString(UIStrings.unchecked);
    if (item === this._highlightedBreakpoint) {
      element.classList.add('breakpoint-hit');
      UI.ARIAUtils.setDescription(element, i18nString(UIStrings.sBreakpointHit, {PH1: checkedStateText}));
      UI.ARIAUtils.setDescription(checkboxElement, i18nString(UIStrings.breakpointHit));
    } else {
      UI.ARIAUtils.setDescription(element, checkedStateText);
    }


    this._emptyElement.classList.add('hidden');
    this._list.element.classList.remove('hidden');

    return element;
  }

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} item
   * @return {number}
   */
  heightForItem(item) {
    return 0;
  }

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?Element} fromElement
   * @param {?Element} toElement
   * @return {boolean}
   */
  updateSelectedItemARIA(fromElement, toElement) {
    return true;
  }

  /**
   * @override
   * @param {?SDK.DOMDebuggerModel.DOMBreakpoint} from
   * @param {?SDK.DOMDebuggerModel.DOMBreakpoint} to
   * @param {?HTMLElement} fromElement
   * @param {?HTMLElement} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _breakpointAdded(event) {
    this._addBreakpoint(/** @type {!SDK.DOMDebuggerModel.DOMBreakpoint} */ (event.data));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _breakpointToggled(event) {
    const hadFocus = this.hasFocus();
    const breakpoint = /** @type {!SDK.DOMDebuggerModel.DOMBreakpoint} */ (event.data);
    this._list.refreshItem(breakpoint);
    if (hadFocus) {
      this.focus();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _breakpointsRemoved(event) {
    const hadFocus = this.hasFocus();
    const breakpoints = /** @type {!Array<!SDK.DOMDebuggerModel.DOMBreakpoint>} */ (event.data);
    let lastIndex = -1;
    for (const breakpoint of breakpoints) {
      const index = this._breakpoints.indexOf(breakpoint);
      if (index >= 0) {
        this._breakpoints.remove(index);
        lastIndex = index;
      }
    }
    if (this._breakpoints.length === 0) {
      this._emptyElement.classList.remove('hidden');
      this.setDefaultFocusedElement(this._emptyElement);
      this._list.element.classList.add('hidden');
    } else if (lastIndex >= 0) {
      const breakpointToSelect = this._breakpoints.at(lastIndex);
      if (breakpointToSelect) {
        this._list.selectItem(breakpointToSelect);
      }
    }
    if (hadFocus) {
      this.focus();
    }
  }

  /**
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} breakpoint
   */
  _addBreakpoint(breakpoint) {
    this._breakpoints.insertWithComparator(breakpoint, (breakpointA, breakpointB) => {
      if (breakpointA.type > breakpointB.type) {
        return -1;
      }
      if (breakpointA.type < breakpointB.type) {
        return 1;
      }
      return 0;
    });
    if (!this._list.selectedItem() || !this.hasFocus()) {
      this._list.selectItem(this._breakpoints.at(0));
    }
  }

  /**
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} breakpoint
   * @param {!Event} event
   */
  _contextMenu(breakpoint, event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.revealDomNodeInElementsPanel), () => Common.Revealer.reveal(breakpoint.node));
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeBreakpoint), () => {
      breakpoint.domDebuggerModel.removeDOMBreakpoint(breakpoint.node, breakpoint.type);
    });
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeAllDomBreakpoints), () => {
      breakpoint.domDebuggerModel.removeAllDOMBreakpoints();
    });
    contextMenu.show();
  }

  /**
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} breakpoint
   * @param {!Event} event
   */
  _checkboxClicked(breakpoint, event) {
    breakpoint.domDebuggerModel.toggleDOMBreakpoint(
        breakpoint, event.target ? /** @type {!HTMLInputElement} */ (event.target).checked : false);
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._update();
  }

  _update() {
    const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    if (this._highlightedBreakpoint) {
      const oldHighlightedBreakpoint = this._highlightedBreakpoint;
      this._highlightedBreakpoint = null;
      this._list.refreshItem(oldHighlightedBreakpoint);
    }
    if (!details || !details.auxData || details.reason !== Protocol.Debugger.PausedEventReason.DOM) {
      return;
    }

    const domDebuggerModel = details.debuggerModel.target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    if (!domDebuggerModel) {
      return;
    }
    const data = domDebuggerModel.resolveDOMBreakpointData(/** @type {*} */ (details.auxData));
    if (!data) {
      return;
    }

    for (const breakpoint of this._breakpoints) {
      if (breakpoint.node === data.node && breakpoint.type === data.type) {
        this._highlightedBreakpoint = breakpoint;
      }
    }
    if (this._highlightedBreakpoint) {
      this._list.refreshItem(this._highlightedBreakpoint);
    }
    UI.ViewManager.ViewManager.instance().showView('sources.domBreakpoints');
  }
}

export const BreakpointTypeLabels = new Map([
  [Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified, i18nString(UIStrings.subtreeModified)],
  [Protocol.DOMDebugger.DOMBreakpointType.AttributeModified, i18nString(UIStrings.attributeModified)],
  [Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved, i18nString(UIStrings.nodeRemoved)],
]);

/**
 * @type {ContextMenuProvider}
 */
let contextMenuProviderInstance;

/**
 * @implements {UI.ContextMenu.Provider}
 */
export class ContextMenuProvider {
  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!contextMenuProviderInstance || forceNew) {
      contextMenuProviderInstance = new ContextMenuProvider();
    }

    return contextMenuProviderInstance;
  }
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Object} object
   */
  appendApplicableItems(event, contextMenu, object) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (object);
    if (node.pseudoType()) {
      return;
    }
    const domDebuggerModel = node.domModel().target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    if (!domDebuggerModel) {
      return;
    }

    /**
     * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
     */
    function toggleBreakpoint(type) {
      if (!domDebuggerModel) {
        return;
      }
      if (domDebuggerModel.hasDOMBreakpoint(node, type)) {
        domDebuggerModel.removeDOMBreakpoint(node, type);
      } else {
        domDebuggerModel.setDOMBreakpoint(node, type);
      }
    }

    const breakpointsMenu = contextMenu.debugSection().appendSubMenuItem(i18nString(UIStrings.breakOn));
    for (const type of Object.values(Protocol.DOMDebugger.DOMBreakpointType)) {
      const label = Sources.DebuggerPausedMessage.BreakpointTypeNouns.get(type);
      if (label) {
        breakpointsMenu.defaultSection().appendCheckboxItem(
            label, toggleBreakpoint.bind(null, type), domDebuggerModel.hasDOMBreakpoint(node, type));
      }
    }
  }
}
