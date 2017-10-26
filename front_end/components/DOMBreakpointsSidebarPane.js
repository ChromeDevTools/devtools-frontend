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

/**
 * @implements {UI.ContextFlavorListener}
 */
Components.DOMBreakpointsSidebarPane = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('components/domBreakpointsSidebarPane.css');

    this._listElement = this.contentElement.createChild('div', 'breakpoint-list hidden');
    this._emptyElement = this.contentElement.createChild('div', 'gray-info-message');
    this._emptyElement.textContent = Common.UIString('No breakpoints');

    /** @type {!Map<!SDK.DOMDebuggerModel.DOMBreakpoint, !Components.DOMBreakpointsSidebarPane.Item>} */
    this._items = new Map();
    SDK.targetManager.addModelListener(
        SDK.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOMBreakpointAdded, this._breakpointAdded, this);
    SDK.targetManager.addModelListener(
        SDK.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOMBreakpointToggled, this._breakpointToggled, this);
    SDK.targetManager.addModelListener(
        SDK.DOMDebuggerModel, SDK.DOMDebuggerModel.Events.DOMBreakpointsRemoved, this._breakpointsRemoved, this);

    for (var domDebuggerModel of SDK.targetManager.models(SDK.DOMDebuggerModel)) {
      domDebuggerModel.retrieveDOMBreakpoints();
      for (var breakpoint of domDebuggerModel.domBreakpoints())
        this._addBreakpoint(breakpoint);
    }

    this._highlightedElement = null;
    this._update();
  }

  /**
   * @param {!SDK.DebuggerPausedDetails} details
   * @return {!Element}
   */
  static createBreakpointHitMessage(details) {
    var messageWrapper = createElement('span');
    var domDebuggerModel = details.debuggerModel.target().model(SDK.DOMDebuggerModel);
    if (!details.auxData || !domDebuggerModel)
      return messageWrapper;
    var data = domDebuggerModel.resolveDOMBreakpointData(/** @type {!Object} */ (details.auxData));
    if (!data)
      return messageWrapper;

    var mainElement = messageWrapper.createChild('div', 'status-main');
    mainElement.appendChild(UI.Icon.create('smallicon-info', 'status-icon'));
    mainElement.appendChild(createTextNode(
        String.sprintf('Paused on %s', Components.DOMBreakpointsSidebarPane.BreakpointTypeNouns.get(data.type))));

    var subElement = messageWrapper.createChild('div', 'status-sub monospace');
    var linkifiedNode = Components.DOMPresentationUtils.linkifyNodeReference(data.node);
    subElement.appendChild(linkifiedNode);

    if (data.targetNode) {
      var targetNodeLink = Components.DOMPresentationUtils.linkifyNodeReference(data.targetNode);
      var message;
      if (data.insertion)
        message = data.targetNode === data.node ? 'Child %s added' : 'Descendant %s added';
      else
        message = 'Descendant %s removed';
      subElement.appendChild(createElement('br'));
      subElement.appendChild(UI.formatLocalized(message, [targetNodeLink]));
    }
    return messageWrapper;
  }

  /**
   * @param {!Common.Event} event
   */
  _breakpointAdded(event) {
    this._addBreakpoint(/** @type {!SDK.DOMDebuggerModel.DOMBreakpoint} */ (event.data));
  }

  /**
   * @param {!Common.Event} event
   */
  _breakpointToggled(event) {
    var breakpoint = /** @type {!SDK.DOMDebuggerModel.DOMBreakpoint} */ (event.data);
    var item = this._items.get(breakpoint);
    if (item)
      item.checkbox.checked = breakpoint.enabled;
  }

  /**
   * @param {!Common.Event} event
   */
  _breakpointsRemoved(event) {
    var breakpoints = /** @type {!Array<!SDK.DOMDebuggerModel.DOMBreakpoint>} */ (event.data);
    for (var breakpoint of breakpoints) {
      var item = this._items.get(breakpoint);
      if (item) {
        this._items.delete(breakpoint);
        this._listElement.removeChild(item.element);
      }
    }
    if (!this._listElement.firstChild) {
      this._emptyElement.classList.remove('hidden');
      this._listElement.classList.add('hidden');
    }
  }

  /**
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} breakpoint
   */
  _addBreakpoint(breakpoint) {
    var element = createElementWithClass('div', 'breakpoint-entry');
    element.addEventListener('contextmenu', this._contextMenu.bind(this, breakpoint), true);

    var checkboxLabel = UI.CheckboxLabel.create('', breakpoint.enabled);
    var checkboxElement = checkboxLabel.checkboxElement;
    checkboxElement.addEventListener('click', this._checkboxClicked.bind(this, breakpoint), false);
    element.appendChild(checkboxLabel);

    var labelElement = createElementWithClass('div', 'dom-breakpoint');
    element.appendChild(labelElement);

    var linkifiedNode = Components.DOMPresentationUtils.linkifyNodeReference(breakpoint.node);
    linkifiedNode.classList.add('monospace');
    linkifiedNode.style.display = 'block';
    labelElement.appendChild(linkifiedNode);

    var description = createElement('div');
    description.textContent = Components.DOMBreakpointsSidebarPane.BreakpointTypeLabels.get(breakpoint.type);
    labelElement.appendChild(description);

    var item = {breakpoint: breakpoint, element: element, checkbox: checkboxElement};
    element._item = item;
    this._items.set(breakpoint, item);

    var currentElement = this._listElement.firstChild;
    while (currentElement) {
      if (currentElement._item && currentElement._item.breakpoint.type < breakpoint.type)
        break;
      currentElement = currentElement.nextSibling;
    }
    this._listElement.insertBefore(element, currentElement);
    this._emptyElement.classList.add('hidden');
    this._listElement.classList.remove('hidden');
  }

  /**
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} breakpoint
   * @param {!Event} event
   */
  _contextMenu(breakpoint, event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.defaultSection().appendItem(Common.UIString('Remove breakpoint'), () => {
      breakpoint.domDebuggerModel.removeDOMBreakpoint(breakpoint.node, breakpoint.type);
    });
    contextMenu.defaultSection().appendItem(Common.UIString('Remove all DOM breakpoints'), () => {
      breakpoint.domDebuggerModel.removeAllDOMBreakpoints();
    });
    contextMenu.show();
  }

  /**
   * @param {!SDK.DOMDebuggerModel.DOMBreakpoint} breakpoint
   */
  _checkboxClicked(breakpoint) {
    var item = this._items.get(breakpoint);
    if (!item)
      return;
    breakpoint.domDebuggerModel.toggleDOMBreakpoint(breakpoint, item.checkbox.checked);
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._update();
  }

  _update() {
    var details = UI.context.flavor(SDK.DebuggerPausedDetails);
    if (!details || !details.auxData || details.reason !== SDK.DebuggerModel.BreakReason.DOM) {
      if (this._highlightedElement) {
        this._highlightedElement.classList.remove('breakpoint-hit');
        delete this._highlightedElement;
      }
      return;
    }
    var domDebuggerModel = details.debuggerModel.target().model(SDK.DOMDebuggerModel);
    if (!domDebuggerModel)
      return;
    var data = domDebuggerModel.resolveDOMBreakpointData(/** @type {!Object} */ (details.auxData));
    if (!data)
      return;

    var element = null;
    for (var item of this._items.values()) {
      if (item.breakpoint.node === data.node && item.breakpoint.type === data.type)
        element = item.element;
    }
    if (!element)
      return;
    UI.viewManager.showView('sources.domBreakpoints');
    element.classList.add('breakpoint-hit');
    this._highlightedElement = element;
  }
};

/** @typedef {!{element: !Element, checkbox: !Element, breakpoint: !SDK.DOMDebuggerModel.DOMBreakpoint}} */
Components.DOMBreakpointsSidebarPane.Item;

Components.DOMBreakpointsSidebarPane.BreakpointTypeLabels = new Map([
  [SDK.DOMDebuggerModel.DOMBreakpoint.Type.SubtreeModified, Common.UIString('Subtree modified')],
  [SDK.DOMDebuggerModel.DOMBreakpoint.Type.AttributeModified, Common.UIString('Attribute modified')],
  [SDK.DOMDebuggerModel.DOMBreakpoint.Type.NodeRemoved, Common.UIString('Node removed')],
]);

Components.DOMBreakpointsSidebarPane.BreakpointTypeNouns = new Map([
  [SDK.DOMDebuggerModel.DOMBreakpoint.Type.SubtreeModified, Common.UIString('subtree modifications')],
  [SDK.DOMDebuggerModel.DOMBreakpoint.Type.AttributeModified, Common.UIString('attribute modifications')],
  [SDK.DOMDebuggerModel.DOMBreakpoint.Type.NodeRemoved, Common.UIString('node removal')],
]);

/**
 * @implements {UI.ContextMenu.Provider}
 */
Components.DOMBreakpointsSidebarPane.ContextMenuProvider = class {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} object
   */
  appendApplicableItems(event, contextMenu, object) {
    var node = /** @type {!SDK.DOMNode} */ (object);
    if (node.pseudoType())
      return;
    var domDebuggerModel = node.domModel().target().model(SDK.DOMDebuggerModel);
    if (!domDebuggerModel)
      return;

    /**
     * @param {!SDK.DOMDebuggerModel.DOMBreakpoint.Type} type
     */
    function toggleBreakpoint(type) {
      if (domDebuggerModel.hasDOMBreakpoint(node, type))
        domDebuggerModel.removeDOMBreakpoint(node, type);
      else
        domDebuggerModel.setDOMBreakpoint(node, type);
    }

    var breakpointsMenu = contextMenu.debugSection().appendSubMenuItem(Common.UIString('Break on'));
    for (var key in SDK.DOMDebuggerModel.DOMBreakpoint.Type) {
      var type = SDK.DOMDebuggerModel.DOMBreakpoint.Type[key];
      var label = Components.DOMBreakpointsSidebarPane.BreakpointTypeNouns.get(type);
      breakpointsMenu.defaultSection().appendCheckboxItem(
          label, toggleBreakpoint.bind(null, type), domDebuggerModel.hasDOMBreakpoint(node, type));
    }
  }
};
