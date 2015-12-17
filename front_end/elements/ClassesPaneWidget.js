// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.ElementsPanel.BaseToolbarPaneWidget}
 * @param {!WebInspector.ToolbarItem} toolbarItem
 */
WebInspector.ClassesPaneWidget = function(toolbarItem)
{
    WebInspector.ElementsPanel.BaseToolbarPaneWidget.call(this, toolbarItem);
    this.element.className = "styles-element-classes-pane";
    var container = this.element.createChild("div", "title-container");
    var input = container.createChild("input", "new-class-input monospace");
    input.placeholder = WebInspector.UIString("Add new class");
    input.addEventListener("keydown", this._onKeyDown.bind(this), false);
    this.setDefaultFocusedElement(input);
    this._classesContainer = this.element.createChild("div", "source-code");
    this._classesContainer.classList.add("styles-element-classes-container");

    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.DOMMutated, this._onDOMMutated, this);
    /** @type {!Set<!WebInspector.DOMNode>} */
    this._mutatingNodes = new Set();
}

WebInspector.ClassesPaneWidget._classesSymbol = Symbol("WebInspector.ClassesPaneWidget._classesSymbol");

WebInspector.ClassesPaneWidget.prototype = {
    /**
     * @param {!Event} event
     */
    _onKeyDown: function(event)
    {
        if (isEscKey(event)) {
            event.target.value = "";
            event.consume(true);
            return;
        }

        if (!isEnterKey(event))
            return;
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (!node)
            return;

        var text = event.target.value;
        event.target.value = "";
        var classNames = text.split(/[.,\s]/);
        for (var className of classNames) {
            var className = className.trim();
            if (!className.length)
                continue;
            this._toggleClass(node, className, true);
        }
        this._installNodeClasses(node);
        this.update();
        event.consume(true);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onDOMMutated: function(event)
    {
        var node = /** @type {!WebInspector.DOMNode} */(event.data);
        if (this._mutatingNodes.has(node))
            return;
        delete node[WebInspector.ClassesPaneWidget._classesSymbol];
        this.update();
    },

    /**
     * @override
     * @return {!Promise.<?>}
     */
    doUpdate: function()
    {
        this._classesContainer.removeChildren();
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (!node)
            return Promise.resolve();

        var classes = this._nodeClasses(node);
        var keys = classes.keysArray();
        keys.sort(String.caseInsensetiveComparator);
        for (var i = 0; i < keys.length; ++i) {
            var className = keys[i];
            var label = createCheckboxLabel(className, classes.get(className));
            label.classList.add("monospace");
            label.checkboxElement.addEventListener("click", this._onClick.bind(this, className), false);
            this._classesContainer.appendChild(label);
        }
        return Promise.resolve();
    },

    /**
     * @param {string} className
     * @param {!Event} event
     */
    _onClick: function(className, event)
    {
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (!node)
            return;
        var enabled = event.target.checked;
        this._toggleClass(node, className, enabled);
        this._installNodeClasses(node);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Map<string, boolean>}
     */
    _nodeClasses: function(node)
    {
        var result = node[WebInspector.ClassesPaneWidget._classesSymbol];
        if (!result) {
            var classAttribute = node.getAttribute("class") || "";
            var classes = classAttribute.split(/\s/);
            result = new Map();
            for (var i = 0; i < classes.length; ++i) {
                var className = classes[i].trim();
                if (!className.length)
                    continue;
                result.set(className, true);
            }
            node[WebInspector.ClassesPaneWidget._classesSymbol] = result;
        }
        return result;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {string} className
     * @param {boolean} enabled
     */
    _toggleClass: function(node, className, enabled)
    {
        var classes = this._nodeClasses(node);
        classes.set(className, enabled);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    _installNodeClasses: function(node)
    {
        var classes = this._nodeClasses(node);
        var activeClasses = new Set();
        for (var className of classes.keys()) {
            if (classes.get(className))
                activeClasses.add(className);
        }

        var newClasses = activeClasses.valuesArray();
        newClasses.sort();
        this._mutatingNodes.add(node);
        node.setAttributeValue("class", newClasses.join(" "), onClassNameUpdated.bind(this));

        /**
         * @this {WebInspector.ClassesPaneWidget}
         */
        function onClassNameUpdated()
        {
            this._mutatingNodes.delete(node);
        }
    },

    /**
     * @override
     * @param {?WebInspector.DOMNode} newNode
     */
    onNodeChanged: function(newNode)
    {
        this.update();
    },

    __proto__: WebInspector.ElementsPanel.BaseToolbarPaneWidget.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ToolbarItem.Provider}
 */
WebInspector.ClassesPaneWidget.ButtonProvider = function()
{
    this._button = new WebInspector.ToolbarToggle(WebInspector.UIString("Element Classes"), "");
    this._button.setText(".cls");
    this._button.addEventListener("click", this._clicked, this);
    this._view = new WebInspector.ClassesPaneWidget(this.item());
    WebInspector.context.addFlavorChangeListener(WebInspector.DOMNode, this._nodeChanged, this);
    this._nodeChanged();
}

WebInspector.ClassesPaneWidget.ButtonProvider.prototype = {
    _clicked: function()
    {
        WebInspector.ElementsPanel.instance().showToolbarPane(!this._view.isShowing() ? this._view : null);
    },

    /**
     * @override
     * @return {!WebInspector.ToolbarItem}
     */
    item: function()
    {
        return this._button;
    },

    _nodeChanged: function()
    {
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        var enabled = !!node;
        this._button.setEnabled(enabled);
        if (!enabled && this._button.toggled())
            WebInspector.ElementsPanel.instance().showToolbarPane(null);
    }
}
