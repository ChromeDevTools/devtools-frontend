/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.ViewLocationResolver}
 */
WebInspector.InspectorView = function()
{
    WebInspector.VBox.call(this);
    WebInspector.Dialog.setModalHostView(this);
    this.setMinimumSize(240, 72);

    // DevTools sidebar is a vertical split of panels tabbed pane and a drawer.
    this._drawerSplitWidget = new WebInspector.SplitWidget(false, true, "Inspector.drawerSplitViewState", 200, 200);
    this._drawerSplitWidget.hideSidebar();
    this._drawerSplitWidget.hideDefaultResizer();
    this._drawerSplitWidget.enableShowModeSaving();
    this._drawerSplitWidget.show(this.element);

    // Create drawer tabbed pane.
    this._drawerTabbedLocation = WebInspector.viewManager.createTabbedLocation(this._showDrawer.bind(this, false), "drawer-view", true);
    this._drawerTabbedLocation.enableMoreTabsButton();
    this._drawerTabbedPane = this._drawerTabbedLocation.tabbedPane();
    this._drawerTabbedPane.setMinimumSize(0, 27);
    var closeDrawerButton = new WebInspector.ToolbarButton(WebInspector.UIString("Close drawer"), "delete-toolbar-item");
    closeDrawerButton.addEventListener("click", this._closeDrawer.bind(this));
    this._drawerTabbedPane.rightToolbar().appendToolbarItem(closeDrawerButton);
    this._drawerSplitWidget.installResizer(this._drawerTabbedPane.headerElement());
    this._drawerSplitWidget.setSidebarWidget(this._drawerTabbedPane);

    // Create main area tabbed pane.
    this._tabbedLocation = WebInspector.viewManager.createTabbedLocation(InspectorFrontendHost.bringToFront.bind(InspectorFrontendHost), "panel", true, true);
    this._tabbedPane = this._tabbedLocation.tabbedPane();
    this._tabbedPane.registerRequiredCSS("ui/inspectorViewTabbedPane.css");
    this._tabbedPane.setTabSlider(true);
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.Events.TabSelected, this._tabSelected, this);

    if (InspectorFrontendHost.isUnderTest())
        this._tabbedPane.setAutoSelectFirstItemOnShow(false);
    this._drawerSplitWidget.setMainWidget(this._tabbedPane);

    this._keyDownBound = this._keyDown.bind(this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.ShowPanel, showPanel.bind(this));

    /**
     * @this {WebInspector.InspectorView}
     * @param {!WebInspector.Event} event
     */
    function showPanel(event)
    {
        var panelName = /** @type {string} */ (event.data);
        this.showPanel(panelName);
    }
};

/**
 * @return {!WebInspector.InspectorView}
 */
WebInspector.InspectorView.instance = function()
{
    return /** @type {!WebInspector.InspectorView} */ (self.runtime.sharedInstance(WebInspector.InspectorView));
};

WebInspector.InspectorView.prototype = {
    wasShown: function()
    {
        this.element.ownerDocument.addEventListener("keydown", this._keyDownBound, false);
    },

    willHide: function()
    {
        this.element.ownerDocument.removeEventListener("keydown", this._keyDownBound, false);
    },

    /**
     * @override
     * @param {string} locationName
     * @return {?WebInspector.ViewLocation}
     */
    resolveLocation: function(locationName)
    {
        return this._drawerTabbedLocation;
    },

    createToolbars: function()
    {
        this._tabbedPane.leftToolbar().appendLocationItems("main-toolbar-left");
        this._tabbedPane.rightToolbar().appendLocationItems("main-toolbar-right");
    },

    /**
     * @param {!WebInspector.View} view
     */
    addPanel: function(view)
    {
        this._tabbedLocation.appendView(view);
    },

    /**
     * @param {string} panelName
     * @return {boolean}
     */
    hasPanel: function(panelName)
    {
        return this._tabbedPane.hasTab(panelName);
    },

    /**
     * @param {string} panelName
     * @return {!Promise.<!WebInspector.Panel>}
     */
    panel: function(panelName)
    {
        return /** @type {!Promise.<!WebInspector.Panel>} */ (WebInspector.viewManager.view(panelName).widget());
    },

    /**
     * @param {boolean} allTargetsSuspended
     */
    onSuspendStateChanged: function(allTargetsSuspended)
    {
        this._currentPanelLocked = allTargetsSuspended;
        this._tabbedPane.setCurrentTabLocked(this._currentPanelLocked);
        this._tabbedPane.leftToolbar().setEnabled(!this._currentPanelLocked);
        this._tabbedPane.rightToolbar().setEnabled(!this._currentPanelLocked);
    },

    /**
     * @param {string} panelName
     * @return {boolean}
     */
    canSelectPanel: function(panelName)
    {
        return !this._currentPanelLocked || this._tabbedPane.selectedTabId === panelName;
    },

    /**
     * @param {string} panelName
     * @return {!Promise.<?WebInspector.Panel>}
     */
    showPanel: function(panelName)
    {
        return WebInspector.viewManager.showView(panelName);
    },

    /**
     * @param {string} panelName
     * @param {string} iconType
     * @param {string=} iconTooltip
     */
    setPanelIcon: function(panelName, iconType, iconTooltip)
    {
        this._tabbedPane.setTabIcon(panelName, iconType, iconTooltip);
    },

    /**
     * @return {!WebInspector.Panel}
     */
    currentPanelDeprecated: function()
    {
        return /** @type {!WebInspector.Panel} */ (WebInspector.viewManager.materializedWidget(this._tabbedPane.selectedTabId || ""));
    },

    /**
     * @param {boolean} focus
     */
    _showDrawer: function(focus)
    {
        if (this._drawerTabbedPane.isShowing())
            return;
        this._drawerSplitWidget.showBoth();
        if (focus)
            this._focusRestorer = new WebInspector.WidgetFocusRestorer(this._drawerTabbedPane);
        else
            this._focusRestorer = null;
    },

    /**
     * @return {boolean}
     */
    drawerVisible: function()
    {
        return this._drawerTabbedPane.isShowing();
    },

    _closeDrawer: function()
    {
        if (!this._drawerTabbedPane.isShowing())
            return;
        if (this._focusRestorer)
            this._focusRestorer.restore();
        this._drawerSplitWidget.hideSidebar(true);
    },

    /**
     * @param {boolean} minimized
     */
    setDrawerMinimized: function(minimized)
    {
        this._drawerSplitWidget.setSidebarMinimized(minimized);
        this._drawerSplitWidget.setResizable(!minimized);
    },

    /**
     * @return {boolean}
     */
    isDrawerMinimized: function()
    {
        return this._drawerSplitWidget.isSidebarMinimized();
    },

    _keyDown: function(event)
    {
        if (!WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event))
            return;

        var keyboardEvent = /** @type {!KeyboardEvent} */ (event);
        // Ctrl/Cmd + 1-9 should show corresponding panel.
        var panelShortcutEnabled = WebInspector.moduleSetting("shortcutPanelSwitch").get();
        if (panelShortcutEnabled && !event.shiftKey && !event.altKey) {
            var panelIndex = -1;
            if (event.keyCode > 0x30 && event.keyCode < 0x3A)
                panelIndex = event.keyCode - 0x31;
            else if (event.keyCode > 0x60 && event.keyCode < 0x6A && keyboardEvent.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD)
                panelIndex = event.keyCode - 0x61;
            if (panelIndex !== -1) {
                var panelName = this._tabbedPane.allTabs()[panelIndex];
                if (panelName) {
                    if (!WebInspector.Dialog.hasInstance() && !this._currentPanelLocked)
                        this.showPanel(panelName);
                    event.consume(true);
                }
            }
        }
    },

    onResize: function()
    {
        WebInspector.Dialog.modalHostRepositioned();
    },

    /**
     * @return {!Element}
     */
    topResizerElement: function()
    {
        return this._tabbedPane.headerElement();
    },

    toolbarItemResized: function()
    {
        this._tabbedPane.headerResized();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _tabSelected: function(event)
    {
        var tabId = /** @type {string} */(event.data["tabId"]);
        WebInspector.userMetrics.panelShown(tabId);
    },

    /**
     * @param {!WebInspector.SplitWidget} splitWidget
     */
    setOwnerSplit: function(splitWidget)
    {
        this._ownerSplitWidget = splitWidget;
    },

    minimize: function()
    {
        if (this._ownerSplitWidget)
            this._ownerSplitWidget.setSidebarMinimized(true);
    },

    restore: function()
    {
        if (this._ownerSplitWidget)
            this._ownerSplitWidget.setSidebarMinimized(false);
    },

    __proto__: WebInspector.VBox.prototype
};

/**
 * @type {!WebInspector.InspectorView}
 */
WebInspector.inspectorView;

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.InspectorView.DrawerToggleActionDelegate = function()
{
};

WebInspector.InspectorView.DrawerToggleActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        if (WebInspector.inspectorView.drawerVisible())
            WebInspector.inspectorView._closeDrawer();
        else
            WebInspector.inspectorView._showDrawer(true);
        return true;
    }
};
