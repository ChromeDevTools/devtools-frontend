// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.AccessibilitySubPane}
 */
WebInspector.AXTreePane = function()
{
    WebInspector.AccessibilitySubPane.call(this, WebInspector.UIString("Accessibility Tree"));

    this._treeOutline = this.createTreeOutline();

    this.element.classList.add("accessibility-computed");
};


WebInspector.AXTreePane.prototype = {
    /**
     * @param {!Array<!AccessibilityAgent.AXNode>} nodes
     */
    setAXNodeAndAncestors: function(nodes)
    {
        this._nodes = nodes;

        var target = this.node().target();
        var treeOutline = this._treeOutline;
        treeOutline.removeChildren();
        treeOutline.element.classList.remove("hidden");
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
    },

    __proto__: WebInspector.AccessibilitySubPane.prototype
};

/**
 * @constructor
 * @extends {TreeElement}
 * @param {!AccessibilityAgent.AXNode} axNode
 * @param {!WebInspector.Target} target
 */
WebInspector.AXNodeTreeElement = function(axNode, target)
{
    /** @type {!AccessibilityAgent.AXNode} */
    this._axNode = axNode;

    /** @type {!WebInspector.Target} */
    this._target = target;

    // Pass an empty title, the title gets made later in onattach.
    TreeElement.call(this, "");

    this.selectable = false;
};

/** @type {!Object<string, string>} */
WebInspector.AXNodeTreeElement.RoleStyles = {
    internalRole: "ax-internal-role",
    role: "ax-role",
};

WebInspector.AXNodeTreeElement.prototype = {
    /**
     * @override
     */
    onattach: function()
    {
        this._update();
    },

    _update: function()
    {
        this.listItemElement.removeChildren();

        if (this._axNode.ignored) {
            this._appendIgnoredNodeElement();
        } else {
            this._appendRoleElement(this._axNode.role);
            if ("name" in this._axNode && this._axNode.name.value) {
                this.listItemElement.createChild("span", "separator").textContent = "\u00A0";
                this._appendNameElement(/** @type {string} */ (this._axNode.name.value));
            }
        }
    },

    /**
     * @param {string} name
     */
    _appendNameElement: function(name)
    {
        var nameElement = createElement("span");
        nameElement.textContent = '"' + name + '"';
        nameElement.classList.add("ax-readable-string");
        this.listItemElement.appendChild(nameElement);
    },

    /**
     * @param {!AccessibilityAgent.AXValue=} role
     */
    _appendRoleElement: function(role)
    {
        if (!role)
            return;

        var roleElement = createElementWithClass("span", "monospace");
        roleElement.classList.add(WebInspector.AXNodeTreeElement.RoleStyles[role.type]);
        roleElement.setTextContentTruncatedIfNeeded(role.value || "");

        this.listItemElement.appendChild(roleElement);
    },

    _appendIgnoredNodeElement: function()
    {
        var ignoredNodeElement = createElementWithClass("span", "monospace");
        ignoredNodeElement.textContent = WebInspector.UIString("Ignored");
        ignoredNodeElement.classList.add("ax-tree-ignored-node");
        this.listItemElement.appendChild(ignoredNodeElement);
    },

    __proto__: TreeElement.prototype
};
