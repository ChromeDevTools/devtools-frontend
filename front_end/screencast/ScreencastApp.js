// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.App}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.ScreencastApp = function()
{
    var lastScreencastState = WebInspector.settings.createSetting("lastScreencastState", "left");
    this._currentScreencastState = WebInspector.settings.createSetting("currentScreencastState", "disabled");
    this._toggleScreencastButton = new WebInspector.StatusBarStatesSettingButton(
        "screencast-status-bar-item",
        ["disabled", "left", "top"],
        [WebInspector.UIString("Disable screencast."), WebInspector.UIString("Switch to portrait screencast."), WebInspector.UIString("Switch to landscape screencast.")],
        this._currentScreencastState.get(),
        this._currentScreencastState,
        lastScreencastState,
        this._onStatusBarButtonStateChanged.bind(this));
    WebInspector.targetManager.observeTargets(this);
};

WebInspector.ScreencastApp.prototype = {
    /**
     * @param {!Document} document
     * @override
     */
    presentUI: function(document)
    {
        var rootView = new WebInspector.RootView();

        this._rootSplitView = new WebInspector.SplitView(false, true, "InspectorView.screencastSplitViewState", 300, 300);
        this._rootSplitView.show(rootView.element);
        this._rootSplitView.hideMain();

        this._rootSplitView.setSidebarView(WebInspector.inspectorView);
        WebInspector.inspectorView.showInitialPanel();
        rootView.attachToDocument(document);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this._target)
            return;
        this._target = target;
        if (target.hasCapability(WebInspector.Target.Capabilities.CanScreencast)) {
            this._screencastView = new WebInspector.ScreencastView(target);
            this._rootSplitView.setMainView(this._screencastView);
            this._screencastView.initialize();
            this._onStatusBarButtonStateChanged(this._currentScreencastState.get());
        } else {
            this._onStatusBarButtonStateChanged("disabled");
            this._toggleScreencastButton.setEnabled(false);
        }
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (this._target === target) {
            delete this._target;
            if (!this._screencastView)
                return;
            this._onStatusBarButtonStateChanged("disabled");
            this._toggleScreencastButton.setEnabled(false);
            this._screencastView.detach();
            delete this._screencastView;
        }
    },

    /**
     * @param {string} state
     */
    _onStatusBarButtonStateChanged: function(state)
    {
        if (!this._rootSplitView)
            return;
        if (state === "disabled") {
            this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), false);
            this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), false);
            this._rootSplitView.hideMain();
            return;
        }

        this._rootSplitView.setVertical(state === "left");
        this._rootSplitView.setSecondIsSidebar(true);
        this._rootSplitView.toggleResizer(this._rootSplitView.resizerElement(), true);
        this._rootSplitView.toggleResizer(WebInspector.inspectorView.topResizerElement(), state === "top");
        this._rootSplitView.showBoth();
    }
};


/** @type {!WebInspector.ScreencastApp} */
WebInspector.ScreencastApp._appInstance;

/**
 * @return {!WebInspector.ScreencastApp}
 */
WebInspector.ScreencastApp._instance = function()
{
    if (!WebInspector.ScreencastApp._appInstance)
        WebInspector.ScreencastApp._appInstance = new WebInspector.ScreencastApp();
    return WebInspector.ScreencastApp._appInstance;
};

/**
 * @constructor
 * @implements {WebInspector.StatusBarItem.Provider}
 */
WebInspector.ScreencastApp.StatusBarButtonProvider = function()
{
}

WebInspector.ScreencastApp.StatusBarButtonProvider.prototype = {
    /**
     * @override
     * @return {?WebInspector.StatusBarItem}
     */
    item: function()
    {
        return WebInspector.ScreencastApp._instance()._toggleScreencastButton;
    }
}

/**
 * @constructor
 * @implements {WebInspector.AppProvider}
 */
WebInspector.ScreencastAppProvider = function()
{
};

WebInspector.ScreencastAppProvider.prototype = {
    /**
     * @override
     * @return {!WebInspector.App}
     */
    createApp: function()
    {
        return WebInspector.ScreencastApp._instance();
    }
};
