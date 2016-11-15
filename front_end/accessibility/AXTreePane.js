// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Accessibility.AXTreePane = class extends Accessibility.AccessibilitySubPane {
  constructor() {
    super(Common.UIString('Accessibility Tree'));

    this._treeOutline = this.createTreeOutline();

    this.element.classList.add('accessibility-computed');

    this._expandedNodes = new Set();
  }

  /**
   * @param {?Accessibility.AccessibilityNode} axNode
   * @override
   */
  setAXNode(axNode) {
    this._axNode = axNode;

    var treeOutline = this._treeOutline;
    treeOutline.removeChildren();

    // TODO(aboxhall): show no node UI
    if (!axNode)
      return;

    treeOutline.element.classList.remove('hidden');
    var previousTreeElement = treeOutline.rootElement();
    var inspectedNodeTreeElement = new Accessibility.AXNodeTreeElement(axNode, this);
    inspectedNodeTreeElement.setInspected(true);

    var parent = axNode.parentNode();
    if (parent) {
      this.setExpanded(parent.backendDOMNodeId(), false);

      var chain = [];
      var ancestor = parent.parentNode();
      while (ancestor) {
        chain.unshift(ancestor);
        ancestor = ancestor.parentNode();
      }
      for (var ancestorNode of chain) {
        var ancestorTreeElement = new Accessibility.AXNodeTreeElement(ancestorNode, this);
        previousTreeElement.appendChild(ancestorTreeElement);
        previousTreeElement.expand();
        previousTreeElement = ancestorTreeElement;
      }
      var parentTreeElement = new Accessibility.AXNodeTreeParentElement(parent, inspectedNodeTreeElement, this);
      previousTreeElement.appendChild(parentTreeElement);
      if (this.isExpanded(parent.backendDOMNodeId()))
        parentTreeElement.appendSiblings();
      else
        parentTreeElement.appendChild(inspectedNodeTreeElement);
      previousTreeElement.expand();
      previousTreeElement = parentTreeElement;
    } else {
      previousTreeElement.appendChild(inspectedNodeTreeElement);
    }

    previousTreeElement.expand();

    for (var child of axNode.children()) {
      var childTreeElement = new Accessibility.AXNodeTreeElement(child, this);
      inspectedNodeTreeElement.appendChild(childTreeElement);
    }

    inspectedNodeTreeElement.selectable = true;
    inspectedNodeTreeElement.select(!this._selectedByUser /* omitFocus */, false);
    if (this.isExpanded(axNode.backendDOMNodeId()))
      inspectedNodeTreeElement.expand();
    this.clearSelectedByUser();
  }

  /**
   * @param {boolean} selectedByUser
   */
  setSelectedByUser(selectedByUser) {
    this._selectedByUser = true;
  }

  clearSelectedByUser() {
    delete this._selectedByUser;
  }

  /**
   * @return {!SDK.Target}
   */
  target() {
    return this.node().target();
  }

  /**
   * @param {?number} backendDOMNodeId
   * @param {boolean} expanded
   */
  setExpanded(backendDOMNodeId, expanded) {
    if (!backendDOMNodeId)
      return;
    if (expanded)
      this._expandedNodes.add(backendDOMNodeId);
    else
      this._expandedNodes.delete(backendDOMNodeId);
  }

  /**
   * @param {?number} backendDOMNodeId
   * @return {boolean}
   */
  isExpanded(backendDOMNodeId) {
    if (!backendDOMNodeId)
      return false;

    return this._expandedNodes.has(backendDOMNodeId);
  }
};

Accessibility.InspectNodeButton = class {
  /**
   * @param {!Accessibility.AccessibilityNode} axNode
   * @param {!Accessibility.AXTreePane} treePane
   */
  constructor(axNode, treePane) {
    this._axNode = axNode;
    this._treePane = treePane;

    this.element = UI.Icon.create('smallicon-arrow-in-circle', 'inspect-dom-node');
    this.element.addEventListener('mousedown', this._handleMouseDown.bind(this));
  }

  /**
   * @param {!Event} event
   */
  _handleMouseDown(event) {
    this._treePane.setSelectedByUser(true);
    Common.Revealer.reveal(this._axNode.deferredDOMNode());
  }
};

/**
 * @unrestricted
 */
Accessibility.AXNodeTreeElement = class extends TreeElement {
  /**
   * @param {!Accessibility.AccessibilityNode} axNode
   * @param {!Accessibility.AXTreePane} treePane
   */
  constructor(axNode, treePane) {
    // Pass an empty title, the title gets made later in onattach.
    super('');

    /** @type {!Accessibility.AccessibilityNode} */
    this._axNode = axNode;

    /** @type {!Accessibility.AXTreePane} */
    this._treePane = treePane;

    this.selectable = true;

    this._inspectNodeButton = new Accessibility.InspectNodeButton(axNode, treePane);
  }

  /**
   * @return {!Accessibility.AccessibilityNode}
   */
  axNode() {
    return this._axNode;
  }

  /**
   * @param {boolean} inspected
   */
  setInspected(inspected) {
    this._inspected = inspected;
    this.listItemElement.classList.toggle('inspected', this._inspected);
  }

  /**
   * @override
   * @return {boolean}
   */
  onenter() {
    this.inspectDOMNode();
    return true;
  }

  /**
   * @override
   * @param {!Event} event
   * @return {boolean}
   */
  ondblclick(event) {
    this.inspectDOMNode();
    return true;
  }

  inspectDOMNode() {
    this._treePane.setSelectedByUser(true);
    Common.Revealer.reveal(this._axNode.deferredDOMNode());
  }

  /**
   * @override
   */
  onattach() {
    this._update();
  }

  _update() {
    this.listItemElement.removeChildren();

    if (this._axNode.ignored()) {
      this._appendIgnoredNodeElement();
    } else {
      this._appendRoleElement(this._axNode.role());
      if (this._axNode.name().value) {
        this.listItemElement.createChild('span', 'separator').textContent = '\u00A0';
        this._appendNameElement(/** @type {string} */ (this._axNode.name().value));
      }
    }

    if (this._axNode.hasOnlyUnloadedChildren()) {
      this.listItemElement.classList.add('children-unloaded');
      this.setExpandable(true);
    } else {
      this.setExpandable(!!this._axNode.numChildren());
    }

    if (!this._axNode.isDOMNode())
      this.listItemElement.classList.add('no-dom-node');
    this.listItemElement.appendChild(this._inspectNodeButton.element);
  }

  /**
   * @override
   */
  expand() {
    if (!this._axNode || this._axNode.hasOnlyUnloadedChildren())
      return;

    this._treePane.setExpanded(this._axNode.backendDOMNodeId(), true);
    super.expand();
  }

  /**
   * @override
   */
  collapse() {
    if (!this._axNode || this._axNode.hasOnlyUnloadedChildren())
      return;

    if (this._treePane)
      this._treePane.setExpanded(this._axNode.backendDOMNodeId(), false);
    super.collapse();
  }

  /**
   * @param {string} name
   */
  _appendNameElement(name) {
    var nameElement = createElement('span');
    nameElement.textContent = '"' + name + '"';
    nameElement.classList.add('ax-readable-string');
    this.listItemElement.appendChild(nameElement);
  }

  /**
   * @param {?Protocol.Accessibility.AXValue} role
   */
  _appendRoleElement(role) {
    if (!role)
      return;

    var roleElement = createElementWithClass('span', 'monospace');
    roleElement.classList.add(Accessibility.AXNodeTreeElement.RoleStyles[role.type]);
    roleElement.setTextContentTruncatedIfNeeded(role.value || '');

    this.listItemElement.appendChild(roleElement);
  }

  _appendIgnoredNodeElement() {
    var ignoredNodeElement = createElementWithClass('span', 'monospace');
    ignoredNodeElement.textContent = Common.UIString('Ignored');
    ignoredNodeElement.classList.add('ax-tree-ignored-node');
    this.listItemElement.appendChild(ignoredNodeElement);
  }

  /**
   * @param {boolean=} omitFocus
   * @param {boolean=} selectedByUser
   * @return {boolean}
   * @override
   */
  select(omitFocus, selectedByUser) {
    this._treePane.setSelectedByUser(!!selectedByUser);

    return super.select(omitFocus, selectedByUser);
  }
};

/** @type {!Object<string, string>} */
Accessibility.AXNodeTreeElement.RoleStyles = {
  internalRole: 'ax-internal-role',
  role: 'ax-role',
};

/**
 * @unrestricted
 */
Accessibility.ExpandSiblingsButton = class {
  /**
   * @param {!Accessibility.AXNodeTreeParentElement} treeElement
   * @param {number} numSiblings
   */
  constructor(treeElement, numSiblings) {
    this._treeElement = treeElement;

    this.element = createElementWithClass('button', 'expand-siblings');
    this.element.textContent = Common.UIString((numSiblings === 1 ? '+ %d node' : '+ %d nodes'), numSiblings);
    this.element.addEventListener('mousedown', this._handleMouseDown.bind(this));
  }

  /**
   * @param {!Event} event
   */
  _handleMouseDown(event) {
    this._treeElement.expandSiblings();
    event.consume();
  }
};

/**
 * @unrestricted
 */
Accessibility.AXNodeTreeParentElement = class extends Accessibility.AXNodeTreeElement {
  /**
   * @param {!Accessibility.AccessibilityNode} axNode
   * @param {!Accessibility.AXNodeTreeElement} inspectedNodeTreeElement
   * @param {!Accessibility.AXTreePane} treePane
   */
  constructor(axNode, inspectedNodeTreeElement, treePane) {
    super(axNode, treePane);

    this._inspectedNodeTreeElement = inspectedNodeTreeElement;
    var numSiblings = axNode.children().length - 1;
    this._expandSiblingsButton = new Accessibility.ExpandSiblingsButton(this, numSiblings);
    this._partiallyExpanded = false;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    if (this._treePane.isExpanded(this._axNode.backendDOMNodeId()))
      this._listItemNode.classList.add('siblings-expanded');
    if (this._axNode.numChildren() > 1)
      this._listItemNode.insertBefore(this._expandSiblingsButton.element, this._inspectNodeButton.element);
  }

  /**
   * @param {boolean} altKey
   * @return {boolean}
   * @override
   */
  descendOrExpand(altKey) {
    if (!this.expanded || !this._partiallyExpanded)
      return super.descendOrExpand(altKey);

    this.expandSiblings();
    if (altKey)
      this.expandRecursively();
    return true;
  }

  /**
   * @override
   */
  expand() {
    super.expand();
    this._partiallyExpanded = true;
  }

  expandSiblings() {
    this._listItemNode.classList.add('siblings-expanded');
    this.appendSiblings();
    this.expanded = true;
    this._partiallyExpanded = false;
    this._treePane.setExpanded(this._axNode.backendDOMNodeId(), true);
  }

  appendSiblings() {
    var inspectedAXNode = this._inspectedNodeTreeElement.axNode();
    var nextIndex = 0;
    var foundInspectedNode = false;
    for (var sibling of this._axNode.children()) {
      var siblingTreeElement = null;
      if (sibling === inspectedAXNode) {
        foundInspectedNode = true;
        continue;
      }
      siblingTreeElement = new Accessibility.AXNodeTreeElement(sibling, this._treePane);
      if (foundInspectedNode)
        this.appendChild(siblingTreeElement);
      else
        this.insertChild(siblingTreeElement, nextIndex++);
    }
  }
};
