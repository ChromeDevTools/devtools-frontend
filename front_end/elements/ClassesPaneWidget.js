// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Widget}
 */
WebInspector.ClassesPaneWidget = function()
{
    WebInspector.Widget.call(this);
    this.element.className = "styles-element-classes-pane";
    var container = this.element.createChild("div", "title-container");
    this._input = container.createChild("div", "new-class-input monospace");
    this._input.setAttribute("placeholder", WebInspector.UIString("Add new class"));
    this.setDefaultFocusedElement(this._input);
    this._classesContainer = this.element.createChild("div", "source-code");
    this._classesContainer.classList.add("styles-element-classes-container");
    this._prompt = new WebInspector.ClassesPaneWidget.ClassNamePrompt();
    this._prompt.setAutocompletionTimeout(0);
    this._prompt.renderAsBlock();

    var proxyElement = this._prompt.attach(this._input);
    proxyElement.addEventListener("keydown", this._onKeyDown.bind(this), false);

    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.DOMMutated, this._onDOMMutated, this);
    /** @type {!Set<!WebInspector.DOMNode>} */
    this._mutatingNodes = new Set();
    WebInspector.context.addFlavorChangeListener(WebInspector.DOMNode, this._update, this);
}

WebInspector.ClassesPaneWidget._classesSymbol = Symbol("WebInspector.ClassesPaneWidget._classesSymbol");

WebInspector.ClassesPaneWidget.prototype = {
    /**
     * @param {!Event} event
     */
    _onKeyDown: function(event)
    {
        var text = event.target.textContent;
        if (isEscKey(event)) {
            event.target.textContent = "";
            if (!text.isWhitespace())
                event.consume(true);
            return;
        }

        if (!isEnterKey(event))
            return;
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (!node)
            return;

        this._prompt.clearAutocomplete();
        event.target.textContent = "";
        var classNames = text.split(/[.,\s]/);
        for (var className of classNames) {
            var className = className.trim();
            if (!className.length)
                continue;
            this._toggleClass(node, className, true);
        }
        this._installNodeClasses(node);
        this._update();
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
        this._update();
    },

    /**
     * @override
     */
    wasShown: function()
    {
        this._update();
    },

    _update: function()
    {
        if (!this.isShowing())
            return;

        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (node)
            node = node.enclosingElementOrSelf();

        this._classesContainer.removeChildren();
        this._input.disabled = !node;

        if (!node)
            return;

        var classes = this._nodeClasses(node);
        var keys = classes.keysArray();
        keys.sort(String.caseInsensetiveComparator);
        for (var i = 0; i < keys.length; ++i) {
            var className = keys[i];
            var label = createCheckboxLabel(className, classes.get(className));
            label.visualizeFocus = true;
            label.classList.add("monospace");
            label.checkboxElement.addEventListener("click", this._onClick.bind(this, className), false);
            this._classesContainer.appendChild(label);
        }
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

    __proto__: WebInspector.Widget.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ToolbarItem.Provider}
 */
WebInspector.ClassesPaneWidget.ButtonProvider = function()
{
    this._button = new WebInspector.ToolbarToggle(WebInspector.UIString("Element Classes"), "");
    this._button.setText(".cls");
    this._button.element.classList.add("monospace");
    this._button.addEventListener("click", this._clicked, this);
    this._view = new WebInspector.ClassesPaneWidget();
}

WebInspector.ClassesPaneWidget.ButtonProvider.prototype = {
    _clicked: function()
    {
        WebInspector.ElementsPanel.instance().showToolbarPane(!this._view.isShowing() ? this._view : null, this._button);
    },

    /**
     * @override
     * @return {!WebInspector.ToolbarItem}
     */
    item: function()
    {
        return this._button;
    }
}

/**
 * @constructor
 * @extends {WebInspector.TextPrompt}
 */
WebInspector.ClassesPaneWidget.ClassNamePrompt = function()
{
    WebInspector.TextPrompt.call(this, this._buildClassNameCompletions.bind(this), " ");
    this.setSuggestBoxEnabled(true);
    this.disableDefaultSuggestionForEmptyInput();
    this._selectedFrameId = "";
    this._classNamesPromise = null;
}

WebInspector.ClassesPaneWidget.ClassNamePrompt.prototype = {
    /**
     * @param {!WebInspector.DOMNode} selectedNode
     * @return {!Promise.<!Array.<string>>}
     */
    _getClassNames: function(selectedNode)
    {
        var promises = [];
        var completions = new Set();
        this._selectedFrameId = selectedNode.frameId();

        var cssModel = WebInspector.CSSModel.fromTarget(selectedNode.target());
        var allStyleSheets = cssModel.allStyleSheets();
        for (var stylesheet of allStyleSheets) {
            if (stylesheet.frameId !== this._selectedFrameId)
                continue;
            var cssPromise = cssModel.classNamesPromise(stylesheet.id).then(classes => completions.addAll(classes));
            promises.push(cssPromise);
        }

        var domPromise = selectedNode.domModel().classNamesPromise(selectedNode.ownerDocument.id).then(classes => completions.addAll(classes));
        promises.push(domPromise);
        return Promise.all(promises).then(() => completions.valuesArray());
    },

    /**
     * @param {!Element} proxyElement
     * @param {!Range} wordRange
     * @param {boolean} force
     * @param {function(!Array.<string>, number=)} completionsReadyCallback
     */
    _buildClassNameCompletions: function(proxyElement, wordRange, force, completionsReadyCallback)
    {
        var prefix = wordRange.toString();
        if (!prefix || force)
            this._classNamesPromise = null;

        var selectedNode = WebInspector.context.flavor(WebInspector.DOMNode);
        if (!selectedNode || (!prefix && !force && !proxyElement.textContent.length)) {
            completionsReadyCallback([]);
            return;
        }

        if (!this._classNamesPromise || this._selectedFrameId !== selectedNode.frameId())
            this._classNamesPromise = this._getClassNames(selectedNode);

        this._classNamesPromise.then(completions => {
            if (prefix[0] === ".")
                completions = completions.map(value => "." + value);
            var results = completions.filter(value => value.startsWith(prefix));
            completionsReadyCallback(results, 0);
        });
    },

    __proto__: WebInspector.TextPrompt.prototype
}
