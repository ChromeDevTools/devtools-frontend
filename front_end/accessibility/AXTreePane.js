// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Accessibility.AXTreePane = class extends Accessibility.AccessibilitySubPane {
  /**
   * @param {!Accessibility.AccessibilitySidebarView} axSidebarView
   */
  constructor(axSidebarView) {
    super(Common.UIString('Accessibility Tree'));

    this._axSidebarView = axSidebarView;
    this._treeOutline = this.createTreeOutline();
    this._treeOutline.setPaddingSize(12);

    this.element.classList.add('accessibility-computed');
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
      var ancestorChain = [];
      var ancestor = parent;
      while (ancestor) {
        ancestorChain.unshift(ancestor);
        ancestor = ancestor.parentNode();
      }
      for (var ancestorNode of ancestorChain) {
        var ancestorTreeElement = new Accessibility.AXNodeTreeElement(ancestorNode, this);
        previousTreeElement.appendChild(ancestorTreeElement);
        previousTreeElement.expand();
        previousTreeElement = ancestorTreeElement;
      }
    }

    previousTreeElement.appendChild(inspectedNodeTreeElement);
    previousTreeElement.expand();

    inspectedNodeTreeElement.selectable = true;
    inspectedNodeTreeElement.select(!this._selectedByUser /* omitFocus */, false);
    inspectedNodeTreeElement.expand();
    this.clearSelectedByUser();
  }

  /**
   * @param {!Accessibility.AccessibilityNode} axNode
   */
  setSelectedNode(axNode) {
    if (axNode.parentNode()) {
      Common.Revealer.reveal(axNode.deferredDOMNode());
    } else {
      // Only set the node for the accessibility panel, not the Elements tree.
      var axSidebarView = this._axSidebarView;
      axNode.deferredDOMNode().resolve((node) => {
        axSidebarView.setNode(node);
      });
    }
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
    this._treePane.setSelectedNode(this._axNode);
  }
};

/**
 * @unrestricted
 */
Accessibility.AXNodeTreeElement = class extends UI.TreeElement {
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
    this.paddingSize = 12;
    this._hovered = false;

    this._inspectNodeButton = new Accessibility.InspectNodeButton(axNode, treePane);
    this.listItemElement.addEventListener('mousemove', this._onmousemove.bind(this), false);
    this.listItemElement.addEventListener('mouseleave', this._onmouseleave.bind(this), false);
  }

  /**
   * @param {boolean} x
   */
  setHovered(x) {
    if (this._hovered === x)
      return;
    this._hovered = x;
    this.listItemElement.classList.toggle('hovered', x);
    if (this._hovered)
      this._axNode.highlightDOMNode();
  }

  _onmousemove(event) {
    this.setHovered(true);
  }

  _onmouseleave(event) {
    this.setHovered(false);
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
    if (this._inspected)
      this.setTrailingIcons([UI.Icon.create('smallicon-thick-left-arrow')]);
    else
      this.setTrailingIcons([]);

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

  /**
   * @override
   */
  onpopulate() {
    for (var child of this._axNode.children()) {
      var childTreeElement = new Accessibility.AXNodeTreeElement(child, this._treePane);
      this.appendChild(childTreeElement);
      if (childTreeElement.isExpandable() && !child.hasOnlyUnloadedChildren())
        childTreeElement.expand();
    }
  }

  inspectDOMNode() {
    this._treePane.setSelectedByUser(true);
    this._treePane.setSelectedNode(this._axNode);
  }

  /**
   * @override
   */
  onattach() {
    this._update();
  }

  _update() {
    this.titleElement().removeChildren();

    if (this._axNode.ignored()) {
      this._appendIgnoredNodeElement();
    } else {
      this._appendRoleElement(this._axNode.role());
      if (this._axNode.name() && this._axNode.name().value) {
        this.titleElement().createChild('span', 'separator').textContent = '\u00A0';
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
    this.titleElement().appendChild(this._inspectNodeButton.element);
  }

  /**
   * @override
   */
  expand() {
    if (!this._axNode || this._axNode.hasOnlyUnloadedChildren())
      return;
    super.expand();
  }

  /**
   * @override
   */
  collapse() {
    if (!this._axNode || this._axNode.hasOnlyUnloadedChildren())
      return;

    super.collapse();
  }

  /**
   * @param {string} name
   */
  _appendNameElement(name) {
    var nameElement = createElement('span');
    nameElement.textContent = '"' + name + '"';
    nameElement.classList.add('ax-readable-string');
    this.titleElement().appendChild(nameElement);
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

    this.titleElement().appendChild(roleElement);
  }

  _appendIgnoredNodeElement() {
    var ignoredNodeElement = createElementWithClass('span', 'monospace');
    ignoredNodeElement.textContent = Common.UIString('Ignored');
    ignoredNodeElement.classList.add('ax-tree-ignored-node');
    this.titleElement().appendChild(ignoredNodeElement);
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

