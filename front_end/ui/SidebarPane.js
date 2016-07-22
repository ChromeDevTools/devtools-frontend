/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @param {!Element} container
 * @param {!WebInspector.View} pane
 */
WebInspector.SidebarPaneTitle = function(container, pane)
{
    this._pane = pane;

    this.element = container.createChild("div", "sidebar-pane-title");
    this.element.textContent = pane.title();
    this.element.tabIndex = 0;
    this.element.addEventListener("click", this._toggleExpanded.bind(this), false);
    this.element.addEventListener("keydown", this._onTitleKeyDown.bind(this), false);
}

WebInspector.SidebarPaneTitle.prototype = {
    _expand: function()
    {
        this.element.classList.add("expanded");
        this._pane.show(/** @type {!Element} */(this.element.parentElement), /** @type {?Element} */ (this.element.nextSibling));
    },

    _collapse: function()
    {
        this.element.classList.remove("expanded");
        if (this._pane.element.parentNode === this.element.parentNode)
            this._pane.detach();
    },

    _toggleExpanded: function()
    {
        if (this.element.classList.contains("expanded"))
            this._collapse();
        else
            this._pane.requestReveal();
    },

    /**
     * @param {!Event} event
     */
    _onTitleKeyDown: function(event)
    {
        if (isEnterKey(event) || event.keyCode === WebInspector.KeyboardShortcut.Keys.Space.code)
            this._toggleExpanded();
    }
}

/**
 * @constructor
 * @extends {WebInspector.Widget}
 */
WebInspector.SidebarPaneStack = function()
{
    WebInspector.Widget.call(this);
    this.setMinimumSize(25, 0);
    this.element.classList.add("sidebar-pane-container");
    /** @type {!Map.<!WebInspector.View, !WebInspector.SidebarPaneTitle>} */
    this._titleByPane = new Map();
}

WebInspector.SidebarPaneStack.prototype = {
    /**
     * @param {!WebInspector.View} pane
     */
    addPane: function(pane)
    {
        var paneTitle = new WebInspector.SidebarPaneTitle(this.element, pane);
        this._titleByPane.set(pane, paneTitle);
        var toolbarItems = pane.toolbarItems();
        if (toolbarItems.length) {
            var toolbar = new WebInspector.Toolbar("", paneTitle.element);
            for (var item of toolbarItems)
                toolbar.appendToolbarItem(item);
        }
        pane.setRequestVisibleCallback(this._setPaneVisible.bind(this, pane));
        pane.setRevealCallback(paneTitle._expand.bind(paneTitle));
    },

    /**
     * @param {!WebInspector.View} pane
     * @param {boolean} visible
     */
    _setPaneVisible: function(pane, visible)
    {
        var title = this._titleByPane.get(pane);
        if (!title)
            return;

        title.element.classList.toggle("hidden", !visible);
        pane.element.classList.toggle("sidebar-hidden-override", !visible);
    },

    __proto__: WebInspector.Widget.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TabbedPane}
 */
WebInspector.SidebarTabbedPane = function()
{
    WebInspector.TabbedPane.call(this);
    this.element.classList.add("sidebar-pane-container", "sidebar-tabbed-pane");
}

WebInspector.SidebarTabbedPane._toolbarSymbol = Symbol("toolbar");

WebInspector.SidebarTabbedPane.prototype = {
    /**
     * @param {!WebInspector.View} pane
     */
    addPane: function(pane)
    {
        // Detach first to trigger toolbar cleanup.
        pane.detach();

        var title = pane.title();
        var toolbarItems = pane.toolbarItems();
        if (toolbarItems.length) {
            var toolbar = new WebInspector.Toolbar("");
            pane[WebInspector.SidebarTabbedPane._toolbarSymbol] = toolbar;
            pane.element.insertBefore(toolbar.element, pane.element.firstChild);
            for (var item of toolbarItems)
                toolbar.appendToolbarItem(item);
        }
        this.appendTab(title, title, pane);
        pane.setRequestVisibleCallback(this._setPaneVisible.bind(this, pane));
        pane.setRevealCallback(this.selectTab.bind(this, title));
    },

    /**
     * @param {!WebInspector.Widget} widget
     * @override
     */
    childWasDetached: function(widget)
    {
        WebInspector.TabbedPane.prototype.childWasDetached.call(this, widget);

        var toolbar = widget[WebInspector.SidebarTabbedPane._toolbarSymbol];
        if (toolbar)
            toolbar.element.remove();
    },

    /**
     * @param {!WebInspector.View} pane
     * @param {boolean} visible
     */
    _setPaneVisible: function(pane, visible)
    {
        var title = pane.title();
        if (visible) {
            if (!this.hasTab(title))
                this.appendTab(title, title, pane);
        } else {
            if (this.hasTab(title))
                this.closeTab(title);
        }
    },

    __proto__: WebInspector.TabbedPane.prototype
}
