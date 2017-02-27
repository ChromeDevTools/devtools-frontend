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
    this._treeOutline.element.addEventListener('keydown', this._onKeyDown.bind(this), true);

    this.element.classList.add('accessibility-computed');

    this._preselectedTreeElement = null;
    this._hoveredTreeElement = null;
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
    inspectedNodeTreeElement.setInspected(true);
    inspectedNodeTreeElement.select(!this._selectedByUser /* omitFocus */, false);
    inspectedNodeTreeElement.expand();
    this._preselectedTreeElement = inspectedNodeTreeElement;

    this.clearSelectedByUser();
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (!this._preselectedTreeElement)
      return;
    if (!event.path.some(element => element === this._preselectedTreeElement.listItemElement))
      return;
    if (event.shiftKey || event.metaKey || event.ctrlKey)
      return;

    var handled = false;
    if (event.key === 'ArrowUp' && !event.altKey)
      handled = this._preselectPrevious();
    else if (event.key === 'ArrowDown' && !event.altKey)
      handled = this._preselectNext();
    else if (event.key === 'ArrowLeft')
      handled = this._preselectedTreeElement.collapseOrAscend(event.altKey);
    else if (event.key === 'ArrowRight')
      handled = this._preselectedTreeElement.descendOrExpand(event.altKey);
    else if (isEnterKey(event))
      handled = this._preselectedTreeElement.onenter();

    if (handled)
      event.consume(true);
  }

  /**
   * @return {boolean}
   */
  _preselectPrevious() {
    var previousElement = this._preselectedTreeElement.traversePreviousTreeElement(true);
    if (!previousElement)
      return false;

    previousElement.reveal();
    previousElement.setPreselected(true);
    previousElement.focus();
    return true;
  }

  /**
   * @return {boolean}
   */
  _preselectNext() {
    var nextElement = this._preselectedTreeElement.traverseNextTreeElement(true);
    if (!nextElement)
      return false;

    nextElement.reveal();
    nextElement.setPreselected(true);
    nextElement.focus();
    return true;
  }

  /**
   * @param {!Accessibility.AXNodeTreeElement} treeElement
   */
  _setPreselectedTreeElement(treeElement) {
    if (treeElement === this._preselectedTreeElement)
      return;
    if (this._preselectedTreeElement)
      this._preselectedTreeElement.setPreselected(false);
    this._preselectedTreeElement = treeElement;
  }

  /**
   * @param {!Accessibility.AXNodeTreeElement} treeElement
   */
  setHoveredElement(treeElement) {
    if (treeElement === this._hoveredElement)
      return;
    if (this._hoveredElement)
      this._hoveredElement.setHovered(false);
    this._hoveredElement = treeElement;
  }

  /**
   * @param {!Accessibility.AccessibilityNode} axNode
   */
  setInspectedNode(axNode) {
    var axSidebarView = this._axSidebarView;
    if (axNode.parentNode()) {
      var inspectedDOMNode = UI.context.flavor(SDK.DOMNode);
      axNode.deferredDOMNode().resolve(domNode => {
        if (domNode !== inspectedDOMNode)
          Common.Revealer.reveal(axNode.deferredDOMNode(), true /* omitFocus */);
        else
          axSidebarView.setNode(domNode);
      });
    } else {
      // Only set the node for the accessibility panel, not the Elements tree.
      axNode.deferredDOMNode().resolve(domNode => {
        axSidebarView.setNode(domNode);
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

    this.selectable = false;
    this.paddingSize = 12;
    this._preselected = false;
    this._hovered = false;

    this.listItemElement.addEventListener('mousemove', this._onmousemove.bind(this), false);
    this.listItemElement.addEventListener('mouseleave', this._onmouseleave.bind(this), false);
    this.listItemElement.addEventListener('click', this._onClick.bind(this), false);
  }

  /**
   * @param {boolean} x
   */
  setPreselected(x) {
    if (this._preselected === x)
      return;
    this._preselected = x;
    this.listItemElement.classList.toggle('hovered', x || this._hovered);
    this.setFocusable(x);
    if (this._preselected) {
      this._treePane._setPreselectedTreeElement(this);
      this.listItemElement.classList.toggle('hovered', true);
      this._axNode.highlightDOMNode();
    }
  }

  /**
   * @param {boolean} x
   */
  setHovered(x) {
    if (this._hovered === x)
      return;
    this._hovered = x;
    this.listItemElement.classList.toggle('hovered', x || this._preselected);
    if (this._hovered) {
      this._treePane.setHoveredElement(this);
      this.listItemElement.classList.toggle('hovered', true);
      this._axNode.highlightDOMNode();
    }
  }

  focus() {
    this.listItemElement.focus();
  }

  /**
   * @param {boolean} focusable
   */
  setFocusable(focusable) {
    if (focusable)
      this.listItemElement.setAttribute('tabIndex', 0);
    else
      this.listItemElement.removeAttribute('tabIndex');
  }

  _onmousemove(event) {
    if (this._preselected || this._inspected || !this._axNode.isDOMNode())
      return;
    this.setHovered(true);
  }

  _onmouseleave(event) {
    if (this._inspected)
      return;
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
    if (!this.axNode().isDOMNode())
      return false;
    this.inspectDOMNode();
    return true;
  }

  /**
   * @param {!Event} event
   */
  _onClick(event) {
    if (!this.axNode().isDOMNode() || this._inspected)
      return;
    this.inspectDOMNode();
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
    this._treePane.setInspectedNode(this._axNode);
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
   * @param {boolean} altKey
   * @return {boolean}
   * @override
   */
  collapseOrAscend(altKey) {
    if (this.expanded) {
      if (altKey)
        this.collapseRecursively();
      else
        this.collapse();
      return true;
    }

    if (!this.parent || this.parent.root)
      return false;

    var nextElement = this.parent;
    if (nextElement) {
      nextElement.reveal();
      nextElement.setPreselected(true);
      nextElement.focus();
      return true;
    }

    return false;
  }

  /**
   * @param {boolean} altKey
   * @return {boolean}
   * @override
   */
  descendOrExpand(altKey) {
    if (!this.isExpandable())
      return false;

    if (!this.expanded) {
      if (altKey)
        this.expandRecursively();
      else
        this.expand();
      return true;
    }

    var nextElement = this.firstChild();
    if (nextElement) {
      nextElement.reveal();
      nextElement.setPreselected(true);
      nextElement.focus();
      return true;
    }

    return false;
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
