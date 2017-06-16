// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Accessibility.AXBreadcrumbsPane = class extends Accessibility.AccessibilitySubPane {
  /**
   * @param {!Accessibility.AccessibilitySidebarView} axSidebarView
   */
  constructor(axSidebarView) {
    super(Common.UIString('Accessibility Tree'));

    this.element.classList.add('ax-subpane');

    this._axSidebarView = axSidebarView;

    /** @type {?Accessibility.AXBreadcrumb} */
    this._preselectedBreadcrumb = null;

    this._selectedByUser = true;

    this._hoveredBreadcrumb = null;
    this._rootElement = this.element.createChild('div', 'ax-breadcrumbs');

    this._rootElement.addEventListener('keydown', this._onKeyDown.bind(this), true);
    this._rootElement.addEventListener('mousemove', this._onMouseMove.bind(this), false);
    this._rootElement.addEventListener('mouseleave', this._onMouseLeave.bind(this), false);
    this._rootElement.addEventListener('click', this._onClick.bind(this), false);
  }

  /**
   * @param {?Accessibility.AccessibilityNode} axNode
   * @override
   */
  setAXNode(axNode) {
    super.setAXNode(axNode);

    this._rootElement.removeChildren();

    if (!axNode) {
      this._selectedByUser = false;
      return;
    }

    var ancestorChain = [];
    var ancestor = axNode;
    while (ancestor) {
      ancestorChain.push(ancestor);
      ancestor = ancestor.parentNode();
    }
    ancestorChain.reverse();

    var depth = 0;
    var breadcrumb = null;
    for (ancestor of ancestorChain) {
      breadcrumb = new Accessibility.AXBreadcrumb(ancestor, depth, (ancestor === axNode));
      if (ancestor.children().length)
        breadcrumb.element().classList.add('parent');
      this._rootElement.appendChild(breadcrumb.element());
      depth++;
    }

    var inspectedNodeBreadcrumb = breadcrumb;
    inspectedNodeBreadcrumb.setPreselected(true, this._selectedByUser);

    this._setPreselectedBreadcrumb(inspectedNodeBreadcrumb);

    for (var child of axNode.children()) {
      var childBreadcrumb = new Accessibility.AXBreadcrumb(child, depth, false);
      this._rootElement.appendChild(childBreadcrumb.element());
    }

    this._selectedByUser = false;
  }

  /**
   * @override
   */
  wasShown() {
    this._selectedByUser = true;
  }

  /**
   * @override
   */
  willHide() {
    this._setPreselectedBreadcrumb(null);
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (!this._preselectedBreadcrumb)
      return;
    if (!event.path.some(element => element === this._preselectedBreadcrumb.element()))
      return;
    if (event.shiftKey || event.metaKey || event.ctrlKey)
      return;

    var handled = false;
    if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && !event.altKey)
      handled = this._preselectPrevious();
    else if ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && !event.altKey)
      handled = this._preselectNext();
    else if (isEnterKey(event))
      handled = this._inspectDOMNode(this._preselectedBreadcrumb.axNode());

    if (handled)
      event.consume(true);
  }

  /**
   * @return {boolean}
   */
  _preselectPrevious() {
    var previousElement = this._preselectedBreadcrumb.element().previousSibling;
    if (!previousElement)
      return false;
    this._selectedByUser = true;
    this._setPreselectedBreadcrumb(previousElement.breadcrumb);
    return true;
  }

  /**
   * @return {boolean}
   */
  _preselectNext() {
    var nextElement = this._preselectedBreadcrumb.element().nextSibling;
    if (!nextElement)
      return false;
    this._selectedByUser = true;
    this._setPreselectedBreadcrumb(nextElement.breadcrumb);
    return true;
  }

  /**
   * @param {?Accessibility.AXBreadcrumb} breadcrumb
   */
  _setPreselectedBreadcrumb(breadcrumb) {
    if (breadcrumb === this._preselectedBreadcrumb)
      return;
    if (this._preselectedBreadcrumb)
      this._preselectedBreadcrumb.setPreselected(false, this._selectedByUser);
    this._preselectedBreadcrumb = breadcrumb;
    if (this._preselectedBreadcrumb)
      this._preselectedBreadcrumb.setPreselected(true, this._selectedByUser);
    else if (this._selectedByUser)
      SDK.OverlayModel.hideDOMNodeHighlight();
  }

  /**
   * @param {!Event} event
   */
  _onMouseLeave(event) {
    this._setHoveredBreadcrumb(null);
  }

  /**
   * @param {!Event} event
   */
  _onMouseMove(event) {
    var breadcrumbElement = event.target.enclosingNodeOrSelfWithClass('ax-node');
    if (!breadcrumbElement) {
      this._setHoveredBreadcrumb(null);
      return;
    }
    var breadcrumb = breadcrumbElement.breadcrumb;
    if (breadcrumb.preselected() || breadcrumb.inspected() || !breadcrumb.isDOMNode())
      return;
    this._setHoveredBreadcrumb(breadcrumb);
  }

  /**
   * @param {!Event} event
   */
  _onClick(event) {
    var breadcrumbElement = event.target.enclosingNodeOrSelfWithClass('ax-node');
    if (!breadcrumbElement) {
      this._setHoveredBreadcrumb(null);
      return;
    }
    var breadcrumb = breadcrumbElement.breadcrumb;
    if (breadcrumb.inspected()) {
      // If the user is clicking the inspected breadcrumb, they probably want to
      // focus it.
      breadcrumb.element().focus();
      return;
    }
    if (!breadcrumb.isDOMNode())
      return;
    this._inspectDOMNode(breadcrumb.axNode());
  }

  /**
   * @param {?Accessibility.AXBreadcrumb} breadcrumb
   */
  _setHoveredBreadcrumb(breadcrumb) {
    if (breadcrumb === this._hoveredBreadcrumb)
      return;

    if (this._hoveredBreadcrumb)
      this._hoveredBreadcrumb.setHovered(false);

    if (breadcrumb) {
      breadcrumb.setHovered(true);
    } else if (this.node()) {
      // Highlight and scroll into view the currently inspected node.
      this.node().domModel().overlayModel().nodeHighlightRequested(this.node().id);
    }

    this._hoveredBreadcrumb = breadcrumb;
  }

  /**
   * @param {!Accessibility.AccessibilityNode} axNode
   * @return {boolean}
   */
  _inspectDOMNode(axNode) {
    if (!axNode.isDOMNode())
      return false;

    this._selectedByUser = true;

    axNode.deferredDOMNode().resolve(domNode => {
      var inspectedDOMNode = UI.context.flavor(SDK.DOMNode);
      // Special case the root accessibility node: set the node for the
      // accessibility panel, not the Elements tree, as it maps to the Document
      // node which is not shown in the DOM panel, causing the first child to be
      // inspected instead.
      if (axNode.parentNode() && domNode !== inspectedDOMNode)
        Common.Revealer.reveal(domNode, true /* omitFocus */);
      else
        this._axSidebarView.setNode(domNode);
    });

    return true;
  }
};

Accessibility.AXBreadcrumb = class {
  /**
   * @param {!Accessibility.AccessibilityNode} axNode
   * @param {number} depth
   * @param {boolean} inspected
   */
  constructor(axNode, depth, inspected) {
    /** @type {!Accessibility.AccessibilityNode} */
    this._axNode = axNode;

    this._element = createElementWithClass('div', 'ax-node');
    this._element.breadcrumb = this;

    this._selectionElement = createElementWithClass('div', 'selection fill');
    this._element.appendChild(this._selectionElement);

    this._nodeWrapper = createElementWithClass('span', 'wrapper');
    this._element.appendChild(this._nodeWrapper);

    this._hovered = false;
    this._preselected = false;

    this._inspected = inspected;
    this.element().classList.toggle('inspected', inspected);

    this._element.style.paddingLeft = (16 * depth + 4) + 'px';

    if (this._axNode.ignored()) {
      this._appendIgnoredNodeElement();
    } else {
      this._appendRoleElement(this._axNode.role());
      if (this._axNode.name() && this._axNode.name().value) {
        this._nodeWrapper.createChild('span', 'separator').textContent = '\u00A0';
        this._appendNameElement(/** @type {string} */ (this._axNode.name().value));
      }
    }

    if (this._axNode.hasOnlyUnloadedChildren())
      this._element.classList.add('children-unloaded');

    if (!this._axNode.isDOMNode())
      this._element.classList.add('no-dom-node');
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._element;
  }

  /**
   * @return {boolean}
   */
  preselected() {
    return this._preselected;
  }

  /**
   * @param {boolean} preselected
   * @param {boolean} selectedByUser
   */
  setPreselected(preselected, selectedByUser) {
    if (this._preselected === preselected)
      return;
    this._preselected = preselected;
    this.element().classList.toggle('preselected', preselected);
    if (preselected)
      this.element().setAttribute('tabIndex', 0);
    else
      this.element().removeAttribute('tabIndex');
    if (this._preselected) {
      if (selectedByUser)
        this.element().focus();
      if (!this._inspected)
        this._axNode.highlightDOMNode();
      else
        SDK.OverlayModel.hideDOMNodeHighlight();
    }
  }

  /**
   * @param {boolean} hovered
   */
  setHovered(hovered) {
    if (this._hovered === hovered)
      return;
    this._hovered = hovered;
    this.element().classList.toggle('hovered', hovered);
    if (this._hovered) {
      this.element().classList.toggle('hovered', true);
      this._axNode.highlightDOMNode();
    }
  }

  /**
   * @return {!Accessibility.AccessibilityNode}
   */
  axNode() {
    return this._axNode;
  }

  /**
   * @return {boolean}
   */
  inspected() {
    return this._inspected;
  }

  /**
   * @return {boolean}
   */
  isDOMNode() {
    return this._axNode.isDOMNode();
  }

  /**
   * @param {string} name
   */
  _appendNameElement(name) {
    var nameElement = createElement('span');
    nameElement.textContent = '"' + name + '"';
    nameElement.classList.add('ax-readable-string');
    this._nodeWrapper.appendChild(nameElement);
  }

  /**
   * @param {?Protocol.Accessibility.AXValue} role
   */
  _appendRoleElement(role) {
    if (!role)
      return;

    var roleElement = createElementWithClass('span', 'monospace');
    roleElement.classList.add(Accessibility.AXBreadcrumb.RoleStyles[role.type]);
    roleElement.setTextContentTruncatedIfNeeded(role.value || '');

    this._nodeWrapper.appendChild(roleElement);
  }

  _appendIgnoredNodeElement() {
    var ignoredNodeElement = createElementWithClass('span', 'monospace');
    ignoredNodeElement.textContent = Common.UIString('Ignored');
    ignoredNodeElement.classList.add('ax-breadcrumbs-ignored-node');
    this._nodeWrapper.appendChild(ignoredNodeElement);
  }
};

/** @type {!Object<string, string>} */
Accessibility.AXBreadcrumb.RoleStyles = {
  internalRole: 'ax-internal-role',
  role: 'ax-role',
};
