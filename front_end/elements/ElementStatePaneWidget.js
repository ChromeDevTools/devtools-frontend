// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Widget}
 */
WebInspector.ElementStatePaneWidget = function()
{
    WebInspector.Widget.call(this);
    this.element.className = "styles-element-state-pane";
    this.element.createChild("div").createTextChild(WebInspector.UIString("Force element state"));
    var table = createElementWithClass("table", "source-code");

    var inputs = [];
    this._inputs = inputs;

    /**
     * @param {!Event} event
     */
    function clickListener(event)
    {
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        if (!node)
            return;
        WebInspector.CSSModel.fromNode(node).forcePseudoState(node, event.target.state, event.target.checked);
    }

    /**
     * @param {string} state
     * @return {!Element}
     */
    function createCheckbox(state)
    {
        var td = createElement("td");
        var label = createCheckboxLabel(":" + state);
        var input = label.checkboxElement;
        input.state = state;
        input.addEventListener("click", clickListener, false);
        inputs.push(input);
        td.appendChild(label);
        return td;
    }

    var tr = table.createChild("tr");
    tr.appendChild(createCheckbox.call(null, "active"));
    tr.appendChild(createCheckbox.call(null, "hover"));

    tr = table.createChild("tr");
    tr.appendChild(createCheckbox.call(null, "focus"));
    tr.appendChild(createCheckbox.call(null, "visited"));

    this.element.appendChild(table);
    WebInspector.context.addFlavorChangeListener(WebInspector.DOMNode, this._update, this);
}

WebInspector.ElementStatePaneWidget.prototype = {
    /**
     * @param {?WebInspector.Target} target
     */
    _updateTarget: function(target)
    {
        if (this._target === target)
            return;

        if (this._target) {
            var cssModel = WebInspector.CSSModel.fromTarget(this._target);
            cssModel.removeEventListener(WebInspector.CSSModel.Events.PseudoStateForced, this._update, this)
        }
        this._target = target;
        if (target) {
            var cssModel = WebInspector.CSSModel.fromTarget(target);
            cssModel.addEventListener(WebInspector.CSSModel.Events.PseudoStateForced, this._update, this)
        }
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

        this._updateTarget(node ? node.target() : null);
        if (node) {
            var nodePseudoState = WebInspector.CSSModel.fromNode(node).pseudoState(node);
            for (var input of this._inputs) {
                input.disabled = !!node.pseudoType();
                input.checked = nodePseudoState.indexOf(input.state) >= 0;
            }
        } else {
            for (var input of this._inputs) {
                input.disabled = true;
                input.checked = false;
            }
        }
    },

    __proto__: WebInspector.Widget.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ToolbarItem.Provider}
 */
WebInspector.ElementStatePaneWidget.ButtonProvider = function()
{
    this._button = new WebInspector.ToolbarToggle(WebInspector.UIString("Toggle Element State"), "", WebInspector.UIString(":hov"));
    this._button.addEventListener("click", this._clicked, this);
    this._button.element.classList.add("monospace");
    this._view = new WebInspector.ElementStatePaneWidget();
}

WebInspector.ElementStatePaneWidget.ButtonProvider.prototype = {
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
