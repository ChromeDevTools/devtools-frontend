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
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {UI.ContextFlavorListener.ContextFlavorListener}
 * @implements {UI.ListControl.ListDelegate<!SDK.DOMDebuggerModel.DOMBreakpoint>}
 */
export class DOMBreakpointsSidebarPane extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('browser_debugger/domBreakpointsSidebarPane.css');

    this._emptyElement = this.contentElement.createChild('div', 'gray-info-message');
    this._emptyElement.textContent = Common.UIString.UIString('No breakpoints');
    /** @type {!UI.ListModel.ListModel.<!SDK.DOMDebuggerModel.DOMBreakpoint>} */
    this._breakpoints = new UI.ListModel.ListModel();
    /** @type {!UI.ListControl.ListControl.<!SDK.DOMDebuggerModel.DOMBreakpoint>} */
    this._list = new UI.ListControl.ListControl(this._breakpoints, this, UI.ListControl.ListMode.NonViewport);
    this.contentElement.appendChild(this._list.element);
    this._list.element.classList.add('breakpoint-list', 'hidden');
    UI.ARIAUtils.markAsList(this._list.element);
    UI.ARIAUtils.setAccessibleName(this._list.element, ls`DOM Breakpoints list`);
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

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const element = createElementWithClass('div', 'breakpoint-entry');
    element.addEventListener('contextmenu', this._contextMenu.bind(this, item), true);
    UI.ARIAUtils.markAsListitem(element);
    element.tabIndex = this._list.selectedItem() === item ? 0 : -1;

    const checkboxLabel = UI.UIUtils.CheckboxLabel.create(/* title */ '', item.enabled);
    const checkboxElement = checkboxLabel.checkboxElement;
    checkboxElement.addEventListener('click', this._checkboxClicked.bind(this, item), false);
    checkboxElement.tabIndex = -1;
    UI.ARIAUtils.markAsHidden(checkboxLabel);
    element.appendChild(checkboxLabel);

    const labelElement = createElementWithClass('div', 'dom-breakpoint');
    element.appendChild(labelElement);
    element.addEventListener('keydown', event => {
      if (event.key === ' ') {
        checkboxElement.click();
        event.consume(true);
      }
    });

    const description = createElement('div');
    const breakpointTypeLabel = BreakpointTypeLabels.get(item.type);
    description.textContent = breakpointTypeLabel;
    const linkifiedNode = createElementWithClass('monospace');
    linkifiedNode.style.display = 'block';
    labelElement.appendChild(linkifiedNode);
    Common.Linkifier.Linkifier.linkify(item.node, {preventKeyboardFocus: true}).then(linkified => {
      linkifiedNode.appendChild(linkified);
      UI.ARIAUtils.setAccessibleName(checkboxElement, ls`${breakpointTypeLabel}: ${linkified.deepTextContent()}`);
    });

    labelElement.appendChild(description);

    const checkedStateText = item.enabled ? ls`checked` : ls`unchecked`;
    if (item === this._highlightedBreakpoint) {
      element.classList.add('breakpoint-hit');
      UI.ARIAUtils.setDescription(element, ls`${checkedStateText} breakpoint hit`);
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
   * @param {?Element} fromElement
   * @param {?Element} toElement
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
    if (!this.hasFocus()) {
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
        ls`Reveal DOM node in Elements panel`, Common.Revealer.reveal.bind(null, breakpoint.node));
    contextMenu.defaultSection().appendItem(Common.UIString.UIString('Remove breakpoint'), () => {
      breakpoint.domDebuggerModel.removeDOMBreakpoint(breakpoint.node, breakpoint.type);
    });
    contextMenu.defaultSection().appendItem(Common.UIString.UIString('Remove all DOM breakpoints'), () => {
      breakpoint.domDebuggerModel.removeAllDOMBreakpoints();
    });
    contextMenu.show();
  }

  /**
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} breakpoint
   * @param {!Event} event
   */
  _checkboxClicked(breakpoint, event) {
    breakpoint.domDebuggerModel.toggleDOMBreakpoint(breakpoint, event.target.checked);
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._update();
  }

  _update() {
    const details = self.UI.context.flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    if (this._highlightedBreakpoint) {
      const oldHighlightedBreakpoint = this._highlightedBreakpoint;
      delete this._highlightedBreakpoint;
      this._list.refreshItem(oldHighlightedBreakpoint);
    }
    if (!details || !details.auxData || details.reason !== SDK.DebuggerModel.BreakReason.DOM) {
      return;
    }

    const domDebuggerModel = details.debuggerModel.target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    if (!domDebuggerModel) {
      return;
    }
    const data = domDebuggerModel.resolveDOMBreakpointData(/** @type {!Object} */ (details.auxData));
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
  [Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified, Common.UIString.UIString('Subtree modified')],
  [Protocol.DOMDebugger.DOMBreakpointType.AttributeModified, Common.UIString.UIString('Attribute modified')],
  [Protocol.DOMDebugger.DOMBreakpointType.NodeRemoved, Common.UIString.UIString('Node removed')],
]);

/**
 * @implements {UI.ContextMenu.Provider}
 */
export class ContextMenuProvider {
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
      if (domDebuggerModel.hasDOMBreakpoint(node, type)) {
        domDebuggerModel.removeDOMBreakpoint(node, type);
      } else {
        domDebuggerModel.setDOMBreakpoint(node, type);
      }
    }

    const breakpointsMenu = contextMenu.debugSection().appendSubMenuItem(Common.UIString.UIString('Break on'));
    for (const key in Protocol.DOMDebugger.DOMBreakpointType) {
      const type = Protocol.DOMDebugger.DOMBreakpointType[key];
      const label = Sources.DebuggerPausedMessage.BreakpointTypeNouns.get(type);
      breakpointsMenu.defaultSection().appendCheckboxItem(
          label, toggleBreakpoint.bind(null, type), domDebuggerModel.hasDOMBreakpoint(node, type));
    }
  }
}
