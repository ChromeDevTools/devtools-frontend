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
 * @unrestricted
 */
Components.DOMBreakpointsSidebarPane = class extends Components.BreakpointsSidebarPaneBase {
  constructor() {
    super();
    this._domBreakpointsSetting = Common.settings.createLocalSetting('domBreakpoints', []);
    this.listElement.classList.add('dom-breakpoints-list');

    /** @type {!Map<string, !Element>} */
    this._breakpointElements = new Map();

    SDK.targetManager.addModelListener(SDK.DOMModel, SDK.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
    this._update();
  }

  /**
   * @param {!SDK.DebuggerPausedDetails} details
   * @return {!Element}
   */
  static createBreakpointHitMessage(details) {
    var messageWrapper = createElement('span');
    var mainElement = messageWrapper.createChild('div', 'status-main');
    mainElement.appendChild(UI.Icon.create('smallicon-info', 'status-icon'));
    var auxData = /** @type {!Object} */ (details.auxData);
    mainElement.appendChild(createTextNode(
        String.sprintf('Paused on %s', Components.DOMBreakpointsSidebarPane.BreakpointTypeNouns[auxData['type']])));

    var domModel = SDK.DOMModel.fromTarget(details.debuggerModel.target());
    if (domModel) {
      var subElement = messageWrapper.createChild('div', 'status-sub monospace');
      var node = domModel.nodeForId(auxData['nodeId']);
      var linkifiedNode = Components.DOMPresentationUtils.linkifyNodeReference(node);
      subElement.appendChild(linkifiedNode);

      var targetNode = auxData['targetNodeId'] ? domModel.nodeForId(auxData['targetNodeId']) : null;
      var targetNodeLink = targetNode ? Components.DOMPresentationUtils.linkifyNodeReference(targetNode) : '';
      var message;
      if (auxData.type === Components.DOMBreakpointsSidebarPane.BreakpointTypes.SubtreeModified) {
        if (auxData['insertion'])
          message = targetNode === node ? 'Child %s added' : 'Descendant %s added';
        else
          message = 'Descendant %s removed';
        subElement.appendChild(createElement('br'));
        subElement.appendChild(UI.formatLocalized(message, [targetNodeLink]));
      }
    }
    return messageWrapper;
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {!UI.ContextMenu} contextMenu
   * @param {boolean} createSubMenu
   */
  populateNodeContextMenu(node, contextMenu, createSubMenu) {
    if (node.pseudoType())
      return;

    var nodeBreakpoints = this._nodeBreakpoints(node);

    /**
     * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
     * @this {Components.DOMBreakpointsSidebarPane}
     */
    function toggleBreakpoint(type) {
      if (!nodeBreakpoints.has(type))
        this._setBreakpoint(node, type, true);
      else
        this._removeBreakpoint(node, type);
      this._saveBreakpoints();
    }

    var breakpointsMenu = createSubMenu ? contextMenu.appendSubMenuItem(Common.UIString('Break on...')) : contextMenu;
    for (var key in Components.DOMBreakpointsSidebarPane.BreakpointTypes) {
      var type = Components.DOMBreakpointsSidebarPane.BreakpointTypes[key];
      var label = Components.DOMBreakpointsSidebarPane.BreakpointTypeNouns[type];
      breakpointsMenu.appendCheckboxItem(label, toggleBreakpoint.bind(this, type), nodeBreakpoints.has(type));
    }
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {!Set<!Protocol.DOMDebugger.DOMBreakpointType>}
   */
  _nodeBreakpoints(node) {
    /** @type {!Set<!Protocol.DOMDebugger.DOMBreakpointType>} */
    var nodeBreakpoints = new Set();
    for (var element of this._breakpointElements.values()) {
      if (element._node === node && element._checkboxElement.checked)
        nodeBreakpoints.add(element._type);
    }
    return nodeBreakpoints;
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {boolean}
   */
  hasBreakpoints(node) {
    for (var element of this._breakpointElements.values()) {
      if (element._node === node && element._checkboxElement.checked)
        return true;
    }
    return false;
  }

  _nodeRemoved(event) {
    var node = event.data.node;
    this._removeBreakpointsForNode(event.data.node);
    var children = node.children();
    if (!children)
      return;
    for (var i = 0; i < children.length; ++i)
      this._removeBreakpointsForNode(children[i]);
    this._saveBreakpoints();
  }

  /**
   * @param {!SDK.DOMNode} node
   */
  _removeBreakpointsForNode(node) {
    for (var element of this._breakpointElements.values()) {
      if (element._node === node)
        this._removeBreakpoint(element._node, element._type);
    }
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   * @param {boolean} enabled
   */
  _setBreakpoint(node, type, enabled) {
    var breakpointId = this._createBreakpointId(node.id, type);
    var breakpointElement = this._breakpointElements.get(breakpointId);
    if (!breakpointElement) {
      breakpointElement = this._createBreakpointElement(node, type, enabled);
      this._breakpointElements.set(breakpointId, breakpointElement);
    } else {
      breakpointElement._checkboxElement.checked = enabled;
    }
    if (enabled)
      node.target().domdebuggerAgent().setDOMBreakpoint(node.id, type);
    node.setMarker(Components.DOMBreakpointsSidebarPane.Marker, true);
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   * @param {boolean} enabled
   */
  _createBreakpointElement(node, type, enabled) {
    var element = createElement('li');
    element._node = node;
    element._type = type;
    element.addEventListener('contextmenu', this._contextMenu.bind(this, node, type), true);

    var checkboxLabel = UI.createCheckboxLabel('', enabled);
    var checkboxElement = checkboxLabel.checkboxElement;
    checkboxElement.addEventListener('click', this._checkboxClicked.bind(this, node, type), false);
    element._checkboxElement = checkboxElement;
    element.appendChild(checkboxLabel);

    var labelElement = createElementWithClass('div', 'dom-breakpoint');
    element.appendChild(labelElement);

    var linkifiedNode = Components.DOMPresentationUtils.linkifyNodeReference(node);
    linkifiedNode.classList.add('monospace');
    linkifiedNode.style.display = 'block';
    labelElement.appendChild(linkifiedNode);

    var description = createElement('div');
    description.textContent = Components.DOMBreakpointsSidebarPane.BreakpointTypeLabels[type];
    labelElement.appendChild(description);

    var currentElement = this.listElement.firstChild;
    while (currentElement) {
      if (currentElement._type && currentElement._type < element._type)
        break;
      currentElement = currentElement.nextSibling;
    }
    this.addListElement(element, currentElement);
    return element;
  }

  _removeAllBreakpoints() {
    for (var element of this._breakpointElements.values())
      this._removeBreakpoint(element._node, element._type);
    this._saveBreakpoints();
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   */
  _removeBreakpoint(node, type) {
    var breakpointId = this._createBreakpointId(node.id, type);
    var element = this._breakpointElements.get(breakpointId);
    if (!element)
      return;

    this.removeListElement(element);
    this._breakpointElements.delete(breakpointId);
    if (element._checkboxElement.checked)
      node.target().domdebuggerAgent().removeDOMBreakpoint(node.id, type);
    node.setMarker(Components.DOMBreakpointsSidebarPane.Marker, this.hasBreakpoints(node) ? true : null);
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   * @param {!Event} event
   */
  _contextMenu(node, type, event) {
    var contextMenu = new UI.ContextMenu(event);

    /**
     * @this {Components.DOMBreakpointsSidebarPane}
     */
    function removeBreakpoint() {
      this._removeBreakpoint(node, type);
      this._saveBreakpoints();
    }
    contextMenu.appendItem(Common.UIString.capitalize('Remove ^breakpoint'), removeBreakpoint.bind(this));
    contextMenu.appendItem(
        Common.UIString.capitalize('Remove ^all DOM breakpoints'), this._removeAllBreakpoints.bind(this));
    contextMenu.show();
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   * @param {!Event} event
   */
  _checkboxClicked(node, type, event) {
    if (event.target.checked)
      node.target().domdebuggerAgent().setDOMBreakpoint(node.id, type);
    else
      node.target().domdebuggerAgent().removeDOMBreakpoint(node.id, type);
    this._saveBreakpoints();
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
    if (!details || details.reason !== SDK.DebuggerModel.BreakReason.DOM) {
      if (this._highlightedElement) {
        this._highlightedElement.classList.remove('breakpoint-hit');
        delete this._highlightedElement;
      }
      return;
    }
    var auxData = details.auxData;
    var breakpointId = this._createBreakpointId(auxData.nodeId, auxData.type);
    var element = this._breakpointElements.get(breakpointId);
    if (!element)
      return;
    UI.viewManager.showView('sources.domBreakpoints');
    element.classList.add('breakpoint-hit');
    this._highlightedElement = element;
  }

  /**
   * @param {number} nodeId
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   */
  _createBreakpointId(nodeId, type) {
    return nodeId + ':' + type;
  }

  _saveBreakpoints() {
    var breakpoints = [];
    var storedBreakpoints = this._domBreakpointsSetting.get();
    for (var i = 0; i < storedBreakpoints.length; ++i) {
      var breakpoint = storedBreakpoints[i];
      if (breakpoint.url !== this._inspectedURL)
        breakpoints.push(breakpoint);
    }
    for (var element of this._breakpointElements.values()) {
      breakpoints.push({
        url: this._inspectedURL,
        path: element._node.path(),
        type: element._type,
        enabled: element._checkboxElement.checked
      });
    }
    this._domBreakpointsSetting.set(breakpoints);
  }

  /**
   * @param {!SDK.DOMDocument} domDocument
   */
  restoreBreakpoints(domDocument) {
    this._breakpointElements.clear();
    this.reset();
    this._inspectedURL = domDocument.documentURL;
    var domModel = domDocument.domModel();
    /** @type {!Map<string, !Array<!Object>>} */
    var pathToBreakpoints = new Map();

    /**
     * @param {string} path
     * @param {?Protocol.DOM.NodeId} nodeId
     * @this {Components.DOMBreakpointsSidebarPane}
     */
    function didPushNodeByPathToFrontend(path, nodeId) {
      var node = nodeId ? domModel.nodeForId(nodeId) : null;
      if (!node)
        return;

      var breakpoints = pathToBreakpoints.get(path);
      for (var i = 0; i < breakpoints.length; ++i)
        this._setBreakpoint(node, breakpoints[i].type, breakpoints[i].enabled);
    }

    var breakpoints = this._domBreakpointsSetting.get();
    for (var i = 0; i < breakpoints.length; ++i) {
      var breakpoint = breakpoints[i];
      if (breakpoint.url !== this._inspectedURL)
        continue;
      var path = breakpoint.path;
      if (!pathToBreakpoints.has(path)) {
        pathToBreakpoints.set(path, []);
        domModel.pushNodeByPathToFrontend(path, didPushNodeByPathToFrontend.bind(this, path));
      }
      pathToBreakpoints.get(path).push(breakpoint);
    }
  }
};

Components.DOMBreakpointsSidebarPane.BreakpointTypes = {
  SubtreeModified: 'subtree-modified',
  AttributeModified: 'attribute-modified',
  NodeRemoved: 'node-removed'
};

Components.DOMBreakpointsSidebarPane.BreakpointTypeLabels = {
  'subtree-modified': Common.UIString('Subtree Modified'),
  'attribute-modified': Common.UIString('Attribute Modified'),
  'node-removed': Common.UIString('Node Removed')
};

Components.DOMBreakpointsSidebarPane.BreakpointTypeNouns = {
  'subtree-modified': Common.UIString('subtree modifications'),
  'attribute-modified': Common.UIString('attribute modifications'),
  'node-removed': Common.UIString('node removal')
};

Components.DOMBreakpointsSidebarPane.Marker = 'breakpoint-marker';


/**
 * @unrestricted
 */
Components.DOMBreakpointsSidebarPane.Proxy = class extends UI.VBox {
  constructor() {
    super();
    this.registerRequiredCSS('components/breakpointsList.css');
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    var pane = Components.domBreakpointsSidebarPane;
    if (pane.element.parentNode !== this.element)
      pane.show(this.element);
  }
};

/**
 * @type {!Components.DOMBreakpointsSidebarPane}
 */
Components.domBreakpointsSidebarPane;
