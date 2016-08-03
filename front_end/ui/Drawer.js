/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
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
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.SplitWidget} splitWidget
 */
WebInspector.Drawer = function(splitWidget)
{
    WebInspector.VBox.call(this);
    this.element.id = "drawer-contents";

    this._splitWidget = splitWidget;
    splitWidget.hideDefaultResizer();
    splitWidget.setSidebarWidget(this);
    this.setMinimumSize(0, 27);

    this._extensibleTabbedPane = new WebInspector.ExtensibleTabbedPane("drawer-view", true);
    this._extensibleTabbedPane.enableMoreTabsButton();
    var tabbedPane = this._extensibleTabbedPane.tabbedPane();

    var toolbar = new WebInspector.Toolbar("drawer-close-toolbar");
    var closeButton = new WebInspector.ToolbarButton(WebInspector.UIString("Close drawer"), "delete-toolbar-item");
    closeButton.addEventListener("click", this.closeDrawer.bind(this));
    toolbar.appendToolbarItem(closeButton);
    tabbedPane.appendAfterTabStrip(toolbar.element);

    splitWidget.installResizer(tabbedPane.headerElement());
    this._extensibleTabbedPane.show(this.element);
}

WebInspector.Drawer.prototype = {
    /**
     * @param {string} id
     * @param {boolean=} immediate
     */
    showView: function(id, immediate)
    {
        this._innerShow(immediate || false);
        WebInspector.userMetrics.drawerShown(id);
        this._extensibleTabbedPane.showTab(id);
    },

    showDrawer: function()
    {
        this._innerShow(false);
    },

    /**
     * @param {boolean} immediate
     */
    _innerShow: function(immediate)
    {
        if (!this.isShowing())
            this._splitWidget.showBoth(!immediate);
        this._extensibleTabbedPane.focus();
    },

    closeDrawer: function()
    {
        if (!this.isShowing())
            return;
        WebInspector.restoreFocusFromElement(this.element);
        this._splitWidget.hideSidebar(true);
    },

    __proto__: WebInspector.VBox.prototype
}
