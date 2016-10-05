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
    this._drawerTabbedLocation = WebInspector.viewManager.createTabbedLocation(this.showDrawer.bind(this), "drawer-view", true);
    this._drawerTabbedLocation.enableMoreTabsButton();
    this._drawerTabbedPane = this._drawerTabbedLocation.tabbedPane();
    this._drawerTabbedPane.setMinimumSize(0, 27);
    var closeDrawerButton = new WebInspector.ToolbarButton(WebInspector.UIString("Close drawer"), "delete-toolbar-item");
    closeDrawerButton.addEventListener("click", this.closeDrawer.bind(this));
    this._drawerTabbedPane.rightToolbar().appendToolbarItem(closeDrawerButton);
    this._drawerSplitWidget.installResizer(this._drawerTabbedPane.headerElement());
    this._drawerSplitWidget.setSidebarWidget(this._drawerTabbedPane);

    // Create main area tabbed pane.
    this._tabbedPane = new WebInspector.TabbedPane();
    this._tabbedPane.registerRequiredCSS("ui/inspectorViewTabbedPane.css");
    this._tabbedPane.setTabSlider(true);
    this._tabbedPane.setAllowTabReorder(true, false);
    this._tabbedPane.addEventListener(WebInspector.TabbedPane.Events.TabOrderChanged, this._persistPanelOrder, this);
    this._tabOrderSetting = WebInspector.settings.createSetting("InspectorView.panelOrder", {});
    this._drawerSplitWidget.setMainWidget(this._tabbedPane);

    this._panels = {};
    // Used by tests.
    WebInspector["panels"] = this._panels;

    this._history = [];
    this._historyIterator = -1;
    this._keyDownBound = this._keyDown.bind(this);
    this._keyPressBound = this._keyPress.bind(this);
    /** @type {!Object.<string, !WebInspector.PanelDescriptor>} */
    this._panelDescriptors = {};
    /** @type {!Object.<string, !Promise.<!WebInspector.Panel> >} */
    this._panelPromises = {};

    this._lastActivePanelSetting = WebInspector.settings.createSetting("lastActivePanel", "elements");

    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.ShowPanel, showPanel.bind(this));
    this._loadPanelDesciptors();

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
        this.element.ownerDocument.addEventListener("keypress", this._keyPressBound, false);
    },

    willHide: function()
    {
        this.element.ownerDocument.removeEventListener("keydown", this._keyDownBound, false);
        this.element.ownerDocument.removeEventListener("keypress", this._keyPressBound, false);
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

    _loadPanelDesciptors: function()
    {
        /**
         * @param {!Runtime.Extension} extension
         * @this {!WebInspector.InspectorView}
         */
        function processPanelExtensions(extension)
        {
            var descriptor = new WebInspector.ExtensionPanelDescriptor(extension);
            var weight = this._tabOrderSetting.get()[descriptor.name()];
            if (weight === undefined)
                weight = extension.descriptor()["order"];
            if (weight === undefined)
                weight = 10000;
            panelWeights.set(descriptor, weight);
        }

        /**
         * @param {!WebInspector.PanelDescriptor} left
         * @param {!WebInspector.PanelDescriptor} right
         */
        function orderComparator(left, right)
        {
            return panelWeights.get(left) > panelWeights.get(right);
        }

        WebInspector.startBatchUpdate();
        /** @type {!Map<!WebInspector.PanelDescriptor, number>} */
        var panelWeights = new Map();
        self.runtime.extensions(WebInspector.Panel).forEach(processPanelExtensions.bind(this));
        var sortedPanels = panelWeights.keysArray().sort(orderComparator);
        for (var panelDescriptor of sortedPanels)
            this._innerAddPanel(panelDescriptor);
        WebInspector.endBatchUpdate();
    },

    createToolbars: function()
    {
        this._tabbedPane.leftToolbar().appendLocationItems("main-toolbar-left");
        this._tabbedPane.rightToolbar().appendLocationItems("main-toolbar-right");
    },

    /**
     * @param {!WebInspector.PanelDescriptor} panelDescriptor
     * @param {number=} index
     */
    _innerAddPanel: function(panelDescriptor, index)
    {
        var panelName = panelDescriptor.name();
        this._panelDescriptors[panelName] = panelDescriptor;
        this._tabbedPane.appendTab(panelName, panelDescriptor.title(), new WebInspector.Widget(), undefined, undefined, undefined, index);
        if (this._lastActivePanelSetting.get() === panelName)
            this._tabbedPane.selectTab(panelName);
    },

    /**
     * @param {!WebInspector.PanelDescriptor} panelDescriptor
     */
    addPanel: function(panelDescriptor)
    {
        var weight = this._tabOrderSetting.get()[panelDescriptor.name()];
        // Keep in sync with _persistPanelOrder().
        if (weight)
            weight = Math.max(0, Math.round(weight / 10) - 1);
        this._innerAddPanel(panelDescriptor, weight);
    },

    /**
     * @param {string} panelName
     * @return {boolean}
     */
    hasPanel: function(panelName)
    {
        return !!this._panelDescriptors[panelName];
    },

    /**
     * @param {string} panelName
     * @return {!Promise.<!WebInspector.Panel>}
     */
    panel: function(panelName)
    {
        var panelDescriptor = this._panelDescriptors[panelName];
        if (!panelDescriptor)
            return Promise.reject(new Error("Can't load panel without the descriptor: " + panelName));

        var promise = this._panelPromises[panelName];
        if (promise)
            return promise;

        promise = panelDescriptor.panel();
        this._panelPromises[panelName] = promise;

        promise.then(cachePanel.bind(this));

        /**
         * @param {!WebInspector.Panel} panel
         * @return {!WebInspector.Panel}
         * @this {WebInspector.InspectorView}
         */
        function cachePanel(panel)
        {
            delete this._panelPromises[panelName];
            this._panels[panelName] = panel;
            return panel;
        }
        return promise;
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
     * The returned Promise is resolved with null if another showPanel()
     * gets called while this.panel(panelName) Promise is in flight.
     *
     * @param {string} panelName
     * @return {!Promise.<?WebInspector.Panel>}
     */
    showPanel: function(panelName)
    {
        if (this._currentPanelLocked) {
            if (this._currentPanel !== this._panels[panelName])
                return Promise.reject(new Error("Current panel locked"));
            return Promise.resolve(this._currentPanel);
        }

        this._panelForShowPromise = this.panel(panelName);
        return this._panelForShowPromise.then(setCurrentPanelIfNecessary.bind(this, this._panelForShowPromise));

        /**
         * @param {!Promise.<!WebInspector.Panel>} panelPromise
         * @param {!WebInspector.Panel} panel
         * @return {?WebInspector.Panel}
         * @this {WebInspector.InspectorView}
         */
        function setCurrentPanelIfNecessary(panelPromise, panel)
        {
            if (this._panelForShowPromise !== panelPromise)
                return null;

            this.setCurrentPanel(panel);
            return panel;
        }
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
    currentPanel: function()
    {
        return this._currentPanel;
    },

    showInitialPanel: function()
    {
        if (InspectorFrontendHost.isUnderTest())
            return;
        this._showInitialPanel();
    },

    _showInitialPanel: function()
    {
        this._tabbedPane.addEventListener(WebInspector.TabbedPane.Events.TabSelected, this._tabSelected, this);
        this._tabSelected();
    },

    /**
     * @param {string} panelName
     */
    showInitialPanelForTest: function(panelName)
    {
        this._tabbedPane.addEventListener(WebInspector.TabbedPane.Events.TabSelected, this._tabSelected, this);
        this.setCurrentPanel(this._panels[panelName]);
    },

    _tabSelected: function()
    {
        var panelName = this._tabbedPane.selectedTabId;
        if (!panelName)
            return;

        this.showPanel(panelName);
    },

    /**
     * @param {!WebInspector.Panel} panel
     * @param {boolean=} suppressBringToFront
     * @return {!WebInspector.Panel}
     */
    setCurrentPanel: function(panel, suppressBringToFront)
    {
        delete this._panelForShowPromise;

        if (this._currentPanelLocked)
            return this._currentPanel;

        if (!suppressBringToFront)
            InspectorFrontendHost.bringToFront();

        if (this._currentPanel === panel)
            return panel;

        this._currentPanel = panel;
        if (!this._panels[panel.name])
            this._panels[panel.name] = panel;
        this._tabbedPane.changeTabView(panel.name, panel);
        this._tabbedPane.removeEventListener(WebInspector.TabbedPane.Events.TabSelected, this._tabSelected, this);
        this._tabbedPane.selectTab(panel.name);
        this._tabbedPane.addEventListener(WebInspector.TabbedPane.Events.TabSelected, this._tabSelected, this);

        this._lastActivePanelSetting.set(panel.name);
        this._pushToHistory(panel.name);
        WebInspector.userMetrics.panelShown(panel.name);
        panel.focus();

        return panel;
    },

    showDrawer: function()
    {
        if (!this._drawerTabbedPane.isShowing())
            this._drawerSplitWidget.showBoth();
        this._drawerTabbedPane.focus();
    },

    /**
     * @return {boolean}
     */
    drawerVisible: function()
    {
        return this._drawerTabbedPane.isShowing();
    },

    closeDrawer: function()
    {
        if (!this._drawerTabbedPane.isShowing())
            return;
        WebInspector.restoreFocusFromElement(this._drawerTabbedPane.element);
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

    _keyPress: function(event)
    {
        // BUG 104250: Windows 7 posts a WM_CHAR message upon the Ctrl+']' keypress.
        // Any charCode < 32 is not going to be a valid keypress.
        if (event.charCode < 32 && WebInspector.isWin())
            return;
        clearTimeout(this._keyDownTimer);
        delete this._keyDownTimer;
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
                return;
            }
        }

        // BUG85312: On French AZERTY keyboards, AltGr-]/[ combinations (synonymous to Ctrl-Alt-]/[ on Windows) are used to enter ]/[,
        // so for a ]/[-related keydown we delay the panel switch using a timer, to see if there is a keypress event following this one.
        // If there is, we cancel the timer and do not consider this a panel switch.
        if (!WebInspector.isWin() || (event.key !== "[" && event.key !== "]")) {
            this._keyDownInternal(event);
            return;
        }

        this._keyDownTimer = setTimeout(this._keyDownInternal.bind(this, event), 0);
    },

    _keyDownInternal: function(event)
    {
        if (this._currentPanelLocked)
            return;

        var direction = 0;

        if (event.key === "[")
            direction = -1;

        if (event.key === "]")
            direction = 1;

        if (!direction)
            return;

        if (!event.shiftKey && !event.altKey) {
            if (!WebInspector.Dialog.hasInstance())
                this._changePanelInDirection(direction);
            event.consume(true);
            return;
        }

        if (event.altKey && this._moveInHistory(direction))
            event.consume(true);
    },

    /**
     * @param {number} direction
     */
    _changePanelInDirection: function(direction)
    {
        var panelOrder = this._tabbedPane.allTabs();
        var index = panelOrder.indexOf(this.currentPanel().name);
        index = (index + panelOrder.length + direction) % panelOrder.length;
        this.showPanel(panelOrder[index]);
    },

    /**
     * @param {number} move
     */
    _moveInHistory: function(move)
    {
        var newIndex = this._historyIterator + move;
        if (newIndex >= this._history.length || newIndex < 0)
            return false;

        this._inHistory = true;
        this._historyIterator = newIndex;
        if (!WebInspector.Dialog.hasInstance())
            this.setCurrentPanel(this._panels[this._history[this._historyIterator]]);
        delete this._inHistory;

        return true;
    },

    _pushToHistory: function(panelName)
    {
        if (this._inHistory)
            return;

        this._history.splice(this._historyIterator + 1, this._history.length - this._historyIterator - 1);
        if (!this._history.length || this._history[this._history.length - 1] !== panelName)
            this._history.push(panelName);
        this._historyIterator = this._history.length - 1;
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
    _persistPanelOrder: function(event)
    {
        var tabs = /** @type {!Array.<!WebInspector.TabbedPaneTab>} */(event.data);
        var tabOrders = this._tabOrderSetting.get();
        for (var i = 0; i < tabs.length; i++)
            tabOrders[tabs[i].id] = (i + 1) * 10;
        this._tabOrderSetting.set(tabOrders);
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
            WebInspector.inspectorView.closeDrawer();
        else
            WebInspector.inspectorView.showDrawer();
        return true;
    }
};
