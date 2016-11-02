// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.AXTreePane = class extends WebInspector.AccessibilitySubPane {
  constructor() {
    super(WebInspector.UIString('Accessibility Tree'));

    this._treeOutline = this.createTreeOutline();

    this.element.classList.add('accessibility-computed');
  }

  /**
   * @param {!Array<!WebInspector.AccessibilityNode>} nodes
   */
  setAXNodeAndAncestors(nodes) {
    this._nodes = nodes;

    var target = this.node().target();
    var treeOutline = this._treeOutline;
    treeOutline.removeChildren();
    treeOutline.element.classList.remove('hidden');
    var previous = treeOutline.rootElement();
    while (nodes.length) {
      var ancestor = nodes.pop();
      var ancestorTreeElement = new WebInspector.AXNodeTreeElement(ancestor, target);
      previous.appendChild(ancestorTreeElement);
      previous.expand();
      previous = ancestorTreeElement;
    }
    previous.selectable = true;
    previous.select(true /* omitFocus */);
  }
};

/**
 * @unrestricted
 */
WebInspector.AXNodeTreeElement = class extends TreeElement {
  /**
   * @param {!WebInspector.AccessibilityNode} axNode
   * @param {!WebInspector.Target} target
   */
  constructor(axNode, target) {
    // Pass an empty title, the title gets made later in onattach.
    super('');

    /** @type {!WebInspector.AccessibilityNode} */
    this._axNode = axNode;

    /** @type {!WebInspector.Target} */
    this._target = target;

    this.selectable = false;
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
      if ('name' in this._axNode && this._axNode.name().value) {
        this.listItemElement.createChild('span', 'separator').textContent = '\u00A0';
        this._appendNameElement(/** @type {string} */ (this._axNode.name().value));
      }
    }
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
    roleElement.classList.add(WebInspector.AXNodeTreeElement.RoleStyles[role.type]);
    roleElement.setTextContentTruncatedIfNeeded(role.value || '');

    this.listItemElement.appendChild(roleElement);
  }

  _appendIgnoredNodeElement() {
    var ignoredNodeElement = createElementWithClass('span', 'monospace');
    ignoredNodeElement.textContent = WebInspector.UIString('Ignored');
    ignoredNodeElement.classList.add('ax-tree-ignored-node');
    this.listItemElement.appendChild(ignoredNodeElement);
  }
};

/** @type {!Object<string, string>} */
WebInspector.AXNodeTreeElement.RoleStyles = {
  internalRole: 'ax-internal-role',
  role: 'ax-role',
};
