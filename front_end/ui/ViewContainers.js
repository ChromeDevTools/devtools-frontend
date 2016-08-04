// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.View} view
 */
WebInspector.View._ContainerWidget = function(view)
{
    WebInspector.VBox.call(this);
    this.element.classList.add("flex-auto", "view-container", "overflow-auto");

    var toolbarItems = view.toolbarItems();
    if (toolbarItems.length) {
        var toolbar = new WebInspector.Toolbar("", this.element);
        for (var item of toolbarItems)
            toolbar.appendToolbarItem(item);
    }

    view.show(this.element);
}

WebInspector.View._ContainerWidget.prototype = {
    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.View} view
 * @param {boolean} expanded
 */
WebInspector.View._ExpandableContainerWidget = function(view, expanded)
{
    WebInspector.VBox.call(this, true);
    this.element.classList.add("flex-none");
    this.registerRequiredCSS("ui/viewContainers.css");

    this._titleElement = createElementWithClass("div", "expandable-view-title");
    this._titleElement.textContent = view.title();
    this._titleElement.tabIndex = 0;
    this._titleElement.addEventListener("click", this._toggleExpanded.bind(this), false);
    this._titleElement.addEventListener("keydown", this._onTitleKeyDown.bind(this), false);
    this.contentElement.insertBefore(this._titleElement, this.contentElement.firstChild);

    var toolbarElement = this.contentElement.createChild("div");
    var toolbarItems = view.toolbarItems();
    if (toolbarItems.length) {
        this._toolbar = new WebInspector.Toolbar("");
        for (var item of toolbarItems)
            this._toolbar.appendToolbarItem(item);
    }

    this.contentElement.createChild("content");
    this._view = view;
    this._view.attach(this);
    this._view[WebInspector.View._ExpandableContainerWidget._elementSymbol] = this.element;
    if (expanded)
        this.revealChild(this._view);
}

WebInspector.View._ExpandableContainerWidget._elementSymbol = Symbol("container-widget-element");

WebInspector.View._ExpandableContainerWidget.prototype = {
    /**
     * @override
     * @param {!WebInspector.Widget} child
     * @return {boolean}
     */
    revealChild: function(child)
    {
        if (this._titleElement.classList.contains("expanded"))
            return true;
        if (this._toolbar)
            this._titleElement.appendChild(this._toolbar.element);
        this._titleElement.classList.add("expanded");
        this._view.showWidget(this.element);
        return true;
    },

    _collapse: function()
    {
        if (!this._titleElement.classList.contains("expanded"))
            return;
        if (this._toolbar)
            this._toolbar.element.remove();
        this._titleElement.classList.remove("expanded");
        this._view.hideWidget();
    },

    _toggleExpanded: function()
    {
        if (this._titleElement.classList.contains("expanded"))
            this._collapse();
        else
            this.revealChild(this._view);
    },

    /**
     * @param {!Event} event
     */
    _onTitleKeyDown: function(event)
    {
        if (isEnterKey(event) || event.keyCode === WebInspector.KeyboardShortcut.Keys.Space.code)
            this._toggleExpanded();
    },

    /**
     * @param {!WebInspector.Widget} widget
     * @override
     */
    childWasDetached: function(widget)
    {
        WebInspector.VBox.prototype.childWasDetached.call(this, widget);
        delete this._view[WebInspector.View._ExpandableContainerWidget._elementSymbol];
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @interface {WebInspector.TabbedPane}
 */
WebInspector.View.Container = function()
{
}

WebInspector.View.Container.prototype = {
    /**
     * @param {!WebInspector.View} view
     * @param {boolean=} reveal
     */
    appendView: function(view, reveal) { },

    /**
     * @param {!WebInspector.View} view
     * @param {?WebInspector.View} insertBefore
     * @param {boolean=} reveal
     */
    insertViewBefore: function(view, insertBefore, reveal) { }
}

/**
 * @constructor
 * @extends {WebInspector.TabbedPane}
 * @implements {WebInspector.View.Container}
 */
WebInspector.View.TabbedPaneContainer = function()
{
    WebInspector.TabbedPane.call(this);
}

WebInspector.View.TabbedPaneContainer.prototype = {
    /**
     * @param {!WebInspector.View} view
     * @param {boolean=} reveal
     * @override
     */
    appendView: function(view, reveal)
    {
        this.insertViewBefore(view, null, reveal);
    },

    /**
     * @param {!WebInspector.View} view
     * @param {?WebInspector.View} insertBefore
     * @param {boolean=} reveal
     * @override
     */
    insertViewBefore: function(view, insertBefore, reveal)
    {
        var widgets = this.tabViews();
        var index = 0;
        for (var i = 0; insertBefore && i < widgets.length; ++i) {
            if (widgets[i]._view === insertBefore) {
                index = i;
                break;
            }
        }
        this.appendTab(view.title(), view.title(), new WebInspector.View._ContainerWidget(view), undefined, false, false, insertBefore ? index : undefined);
        if (reveal)
            this.selectTab(view.title());
    },

    __proto__: WebInspector.TabbedPane.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.View.Container}
 */
WebInspector.View.ExpandableStackContainer = function()
{
    WebInspector.VBox.call(this);
    this.element.classList.add("flex-auto", "overflow-auto");
}

WebInspector.View.ExpandableStackContainer.prototype = {

    /**
     * @param {!WebInspector.View} view
     * @param {boolean=} reveal
     * @override
     */
    appendView: function(view, reveal)
    {
        this.insertViewBefore(view, null, reveal);
    },

    /**
     * @param {!WebInspector.View} view
     * @param {?WebInspector.View} insertBefore
     * @param {boolean=} reveal
     * @override
     */
    insertViewBefore: function(view, insertBefore, reveal)
    {
        new WebInspector.View._ExpandableContainerWidget(view, reveal || false).show(this.contentElement, insertBefore ? insertBefore[WebInspector.View._ExpandableContainerWidget._elementSymbol] : null);
    },

    __proto__: WebInspector.VBox.prototype
}
