/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
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
 * @implements {InspectorAgent.Dispatcher}
 * @implements {WebInspector.Console.UIDelegate}
 * @suppressGlobalPropertiesCheck
 */
WebInspector.Main = function()
{
    WebInspector.console.setUIDelegate(this);
    WebInspector.Main._instanceForTest = this;
    runOnWindowLoad(this._loaded.bind(this));
}

WebInspector.Main.prototype = {
    /**
     * @override
     * @return {!Promise.<undefined>}
     */
    showConsole: function()
    {
        return WebInspector.Revealer.revealPromise(WebInspector.console);
    },

    _loaded: function()
    {
        console.timeStamp("Main._loaded");

        if (InspectorFrontendHost.isUnderTest())
            self.runtime.useTestBase();
        InspectorFrontendHost.getPreferences(this._gotPreferences.bind(this));
    },

    /**
     * @param {!Object<string, string>} prefs
     */
    _gotPreferences: function(prefs)
    {
        console.timeStamp("Main._gotPreferences");
        this._createSettings(prefs);
        this._createAppUI();
    },

    /**
     * @param {!Object<string, string>} prefs
     * Note: this function is called from testSettings in Tests.js.
     */
    _createSettings: function(prefs)
    {
        // Patch settings from the URL param (for tests).
        var settingsParam = Runtime.queryParam("settings");
        if (settingsParam) {
            try {
                var settings = JSON.parse(window.decodeURI(settingsParam));
                for (var key in settings)
                    prefs[key] = settings[key];
            } catch (e) {
                // Ignore malformed settings.
            }
        }

        this._initializeExperiments(prefs);
        WebInspector.settings = new WebInspector.Settings(new WebInspector.SettingsStorage(prefs,
            InspectorFrontendHost.setPreference, InspectorFrontendHost.removePreference, InspectorFrontendHost.clearPreferences));

        if (!InspectorFrontendHost.isUnderTest())
            new WebInspector.VersionController().updateVersion();
    },

    /**
     * @param {!Object<string, string>} prefs
     */
    _initializeExperiments: function(prefs)
    {
        Runtime.experiments.register("accessibilityInspection", "Accessibility Inspection");
        Runtime.experiments.register("applyCustomStylesheet", "Allow custom UI themes");
        Runtime.experiments.register("blackboxJSFramesOnTimeline", "Blackbox JavaScript frames on Timeline", true);
        Runtime.experiments.register("colorContrastRatio", "Contrast ratio line in color picker", true);
        Runtime.experiments.register("cpuThrottling", "CPU throttling", true);
        Runtime.experiments.register("deviceFrames", "Device frames", true);
        Runtime.experiments.register("emptySourceMapAutoStepping", "Empty sourcemap auto-stepping");
        Runtime.experiments.register("samplingHeapProfiler", "Sampling Heap Profiler", true);
        Runtime.experiments.register("inputEventsOnTimelineOverview", "Input events on Timeline overview", true);
        Runtime.experiments.register("layersPanel", "Layers panel");
        Runtime.experiments.register("layoutEditor", "Layout editor", true);
        Runtime.experiments.register("inspectTooltip", "Dark inspect element tooltip");
        Runtime.experiments.register("liveSASS", "Live SASS", true);
        Runtime.experiments.register("networkRequestsOnTimeline", "Network requests on Timeline", true);
        Runtime.experiments.register("privateScriptInspection", "Private script inspection");
        Runtime.experiments.register("reducedIndentation", "Reduced indentation in Elements DOM tree");
        Runtime.experiments.register("requestBlocking", "Request blocking", true);
        Runtime.experiments.register("resolveVariableNames", "Resolve variable names");
        Runtime.experiments.register("timelineShowAllEvents", "Show all events on Timeline", true);
        Runtime.experiments.register("timelineLatencyInfo", "Show input latency events on the Timeline", true);
        Runtime.experiments.register("securityPanel", "Security panel");
        Runtime.experiments.register("timelineFlowEvents", "Timeline flow events", true);
        Runtime.experiments.register("timelineInvalidationTracking", "Timeline invalidation tracking", true);
        Runtime.experiments.register("timelineRecordingPerspectives", "Timeline recording perspectives UI");
        Runtime.experiments.register("timelineTracingJSProfile", "Timeline tracing based JS profiler", true);

        Runtime.experiments.cleanUpStaleExperiments();

        if (InspectorFrontendHost.isUnderTest()) {
            var testPath = JSON.parse(prefs["testPath"] || "\"\"");
            // Enable experiments for testing.
            if (testPath.indexOf("layers/") !== -1)
                Runtime.experiments.enableForTest("layersPanel");
            if (testPath.indexOf("timeline/") !== -1 || testPath.indexOf("layers/") !== -1)
                Runtime.experiments.enableForTest("layersPanel");
            if (testPath.indexOf("security/") !== -1)
                Runtime.experiments.enableForTest("securityPanel");
        }

        Runtime.experiments.setDefaultExperiments([
            "inspectTooltip",
            "securityPanel",
            "resolveVariableNames"
        ]);
    },

    /**
     * @suppressGlobalPropertiesCheck
     */
    _createAppUI: function()
    {
        console.timeStamp("Main._createApp");

        // Request filesystems early, we won't create connections until callback is fired. Things will happen in parallel.
        WebInspector.isolatedFileSystemManager = new WebInspector.IsolatedFileSystemManager();
        WebInspector.isolatedFileSystemManager.initialize(this._didInitializeFileSystemManager.bind(this));

        var themeSetting = WebInspector.settings.createSetting("uiTheme", "default");
        WebInspector.initializeUIUtils(document, themeSetting);
        themeSetting.addChangeListener(WebInspector.reload.bind(WebInspector));

        WebInspector.installComponentRootStyles(/** @type {!Element} */ (document.body));

        this._addMainEventListeners(document);

        var canDock = !!Runtime.queryParam("can_dock");
        WebInspector.zoomManager = new WebInspector.ZoomManager(window, InspectorFrontendHost);
        WebInspector.inspectorView = new WebInspector.InspectorView();
        WebInspector.ContextMenu.initialize();
        WebInspector.ContextMenu.installHandler(document);
        WebInspector.Tooltip.installHandler(document);
        WebInspector.dockController = new WebInspector.DockController(canDock);
        WebInspector.multitargetConsoleModel = new WebInspector.MultitargetConsoleModel();
        WebInspector.multitargetNetworkManager = new WebInspector.MultitargetNetworkManager();
        WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.SuspendStateChanged, this._onSuspendStateChanged.bind(this));

        WebInspector.shortcutsScreen = new WebInspector.ShortcutsScreen();
        // set order of some sections explicitly
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Elements Panel"));
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Styles Pane"));
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Debugger"));
        WebInspector.shortcutsScreen.section(WebInspector.UIString("Console"));

        WebInspector.fileManager = new WebInspector.FileManager();
        WebInspector.workspace = new WebInspector.Workspace();
        WebInspector.fileSystemMapping = new WebInspector.FileSystemMapping();

        var fileSystemWorkspaceBinding = new WebInspector.FileSystemWorkspaceBinding(WebInspector.isolatedFileSystemManager, WebInspector.workspace);
        WebInspector.networkMapping = new WebInspector.NetworkMapping(WebInspector.targetManager, WebInspector.workspace, fileSystemWorkspaceBinding, WebInspector.fileSystemMapping);
        WebInspector.networkProjectManager = new WebInspector.NetworkProjectManager(WebInspector.targetManager, WebInspector.workspace, WebInspector.networkMapping);
        WebInspector.presentationConsoleMessageHelper = new WebInspector.PresentationConsoleMessageHelper(WebInspector.workspace);
        WebInspector.cssWorkspaceBinding = new WebInspector.CSSWorkspaceBinding(WebInspector.targetManager, WebInspector.workspace, WebInspector.networkMapping);
        WebInspector.debuggerWorkspaceBinding = new WebInspector.DebuggerWorkspaceBinding(WebInspector.targetManager, WebInspector.workspace, WebInspector.networkMapping);
        WebInspector.breakpointManager = new WebInspector.BreakpointManager(null, WebInspector.workspace, WebInspector.networkMapping, WebInspector.targetManager, WebInspector.debuggerWorkspaceBinding);
        WebInspector.extensionServer = new WebInspector.ExtensionServer();

        new WebInspector.OverlayController();
        new WebInspector.ExecutionContextSelector(WebInspector.targetManager, WebInspector.context);
        WebInspector.blackboxManager = new WebInspector.BlackboxManager(WebInspector.debuggerWorkspaceBinding, WebInspector.networkMapping);

        var autoselectPanel = WebInspector.UIString("auto");
        var openAnchorLocationSetting = WebInspector.settings.createSetting("openLinkHandler", autoselectPanel);
        WebInspector.openAnchorLocationRegistry = new WebInspector.HandlerRegistry(openAnchorLocationSetting);
        WebInspector.openAnchorLocationRegistry.registerHandler(autoselectPanel, function() { return false; });
        WebInspector.Linkifier.setLinkHandler(new WebInspector.HandlerRegistry.LinkHandler());

        new WebInspector.Main.PauseListener();
        new WebInspector.Main.InspectedNodeRevealer();
        new WebInspector.NetworkPanelIndicator();
        new WebInspector.SourcesPanelIndicator();
        new WebInspector.BackendSettingsSync();
        WebInspector.domBreakpointsSidebarPane = new WebInspector.DOMBreakpointsSidebarPane();

        WebInspector.actionRegistry = new WebInspector.ActionRegistry();
        WebInspector.shortcutRegistry = new WebInspector.ShortcutRegistry(WebInspector.actionRegistry, document);
        WebInspector.ShortcutsScreen.registerShortcuts();
        this._registerForwardedShortcuts();
        this._registerMessageSinkListener();

        var appExtension = self.runtime.extensions(WebInspector.AppProvider)[0];
        appExtension.instancePromise().then(this._showAppUI.bind(this));
    },

    /**
     * @param {!Object} appProvider
     * @suppressGlobalPropertiesCheck
     */
    _showAppUI: function(appProvider)
    {
        var app = /** @type {!WebInspector.AppProvider} */ (appProvider).createApp();
        // It is important to kick controller lifetime after apps are instantiated.
        WebInspector.dockController.initialize();
        console.timeStamp("Main._presentUI");
        app.presentUI(document);

        var toggleSearchNodeAction = WebInspector.actionRegistry.action("elements.toggle-element-search");
        InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.EnterInspectElementMode, toggleSearchNodeAction.execute.bind(toggleSearchNodeAction), this);
        WebInspector.inspectorView.createToolbars();
        InspectorFrontendHost.loadCompleted();

        var extensions = self.runtime.extensions(WebInspector.QueryParamHandler);
        for (var extension of extensions) {
            var value = Runtime.queryParam(extension.descriptor()["name"]);
            if (value !== null)
                extension.instancePromise().then(handleQueryParam.bind(null, value));
        }

        /**
         * @param {string} value
         * @param {!WebInspector.QueryParamHandler} handler
         */
        function handleQueryParam(value, handler)
        {
            handler.handleQueryParam(value);
        }

        this._appUIShown = true;
        if (this._fileSystemManagerInitialized) {
            // Allow UI cycles to repaint prior to creating connection.
            setTimeout(this._createConnection.bind(this), 0);
        }
    },

    _didInitializeFileSystemManager: function()
    {
        this._fileSystemManagerInitialized = true;
        if (this._appUIShown)
            this._createConnection();
    },

    _createConnection: function()
    {
        console.timeStamp("Main._createConnection");

        if (Runtime.queryParam("ws")) {
            var ws = "ws://" + Runtime.queryParam("ws");
            WebInspector.WebSocketConnection.Create(ws, this._connectionEstablished.bind(this));
            return;
        }

        if (!InspectorFrontendHost.isHostedMode()) {
            this._connectionEstablished(new WebInspector.MainConnection());
            return;
        }

        this._connectionEstablished(new WebInspector.StubConnection());
    },

    /**
     * @param {!InspectorBackendClass.Connection} connection
     */
    _connectionEstablished: function(connection)
    {
        console.timeStamp("Main._connectionEstablished");
        this._mainConnection = connection;
        connection.addEventListener(InspectorBackendClass.Connection.Events.Disconnected, onDisconnected);

        /**
         * @param {!WebInspector.Event} event
         */
        function onDisconnected(event)
        {
            if (WebInspector._disconnectedScreenWithReasonWasShown)
                return;
            WebInspector.RemoteDebuggingTerminatedScreen.show(event.data.reason);
        }

        var targetType = Runtime.queryParam("isSharedWorker") ? WebInspector.Target.Type.ServiceWorker : WebInspector.Target.Type.Page;
        this._mainTarget = WebInspector.targetManager.createTarget(WebInspector.UIString("Main"), targetType, connection, null);
        console.timeStamp("Main._mainTargetCreated");
        this._registerShortcuts();

        this._mainTarget.registerInspectorDispatcher(this);
        InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.ReloadInspectedPage, this._reloadInspectedPage, this);
        InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.EvaluateForTestInFrontend, this._evaluateForTestInFrontend, this);

        if (this._mainTarget.isServiceWorker() || this._mainTarget.isPage())
            this._mainTarget.runtimeAgent().run();

        this._mainTarget.inspectorAgent().enable();
        InspectorFrontendHost.readyForTest();

        // Asynchronously run the extensions.
        setTimeout(lateInitialization, 0);

        function lateInitialization()
        {
            console.timeStamp("Main.lateInitialization");
            WebInspector.extensionServer.initializeExtensions();
        }
    },

    _registerForwardedShortcuts: function()
    {
        /** @const */ var forwardedActions = ["main.toggle-dock", "debugger.toggle-breakpoints-active", "debugger.toggle-pause", "commandMenu.show"];
        var actionKeys = WebInspector.shortcutRegistry.keysForActions(forwardedActions).map(WebInspector.KeyboardShortcut.keyCodeAndModifiersFromKey);
        InspectorFrontendHost.setWhitelistedShortcuts(JSON.stringify(actionKeys));
    },

    _registerMessageSinkListener: function()
    {
        WebInspector.console.addEventListener(WebInspector.Console.Events.MessageAdded, messageAdded);

        /**
         * @param {!WebInspector.Event} event
         */
        function messageAdded(event)
        {
            var message = /** @type {!WebInspector.Console.Message} */ (event.data);
            if (message.show)
                WebInspector.console.show();
        }
    },

    _documentClick: function(event)
    {
        var target = event.target;
        if (target.shadowRoot)
            target = event.deepElementFromPoint();
        if (!target)
            return;

        var anchor = target.enclosingNodeOrSelfWithNodeName("a");
        if (!anchor || !anchor.href)
            return;

        // Prevent the link from navigating, since we don't do any navigation by following links normally.
        event.consume(true);

        if (anchor.preventFollow)
            return;

        function followLink()
        {
            if (WebInspector.isBeingEdited(target))
                return;
            if (WebInspector.openAnchorLocationRegistry.dispatch({ url: anchor.href, lineNumber: anchor.lineNumber}))
                return;

            var uiSourceCode = WebInspector.networkMapping.uiSourceCodeForURLForAnyTarget(anchor.href);
            if (uiSourceCode) {
                WebInspector.Revealer.reveal(uiSourceCode.uiLocation(anchor.lineNumber || 0, anchor.columnNumber || 0));
                return;
            }

            var resource = WebInspector.resourceForURL(anchor.href);
            if (resource) {
                WebInspector.Revealer.reveal(resource);
                return;
            }

            var request = WebInspector.NetworkLog.requestForURL(anchor.href);
            if (request) {
                WebInspector.Revealer.reveal(request);
                return;
            }
            InspectorFrontendHost.openInNewTab(anchor.href);
        }

        if (WebInspector.followLinkTimeout)
            clearTimeout(WebInspector.followLinkTimeout);

        if (anchor.preventFollowOnDoubleClick) {
            // Start a timeout if this is the first click, if the timeout is canceled
            // before it fires, then a double clicked happened or another link was clicked.
            if (event.detail === 1)
                WebInspector.followLinkTimeout = setTimeout(followLink, 333);
            return;
        }

        if (!anchor.classList.contains("webkit-html-external-link"))
            followLink();
        else
            InspectorFrontendHost.openInNewTab(anchor.href);
    },

    _registerShortcuts: function()
    {
        var shortcut = WebInspector.KeyboardShortcut;
        var section = WebInspector.shortcutsScreen.section(WebInspector.UIString("All Panels"));
        var keys = [
            shortcut.makeDescriptor("[", shortcut.Modifiers.CtrlOrMeta),
            shortcut.makeDescriptor("]", shortcut.Modifiers.CtrlOrMeta)
        ];
        section.addRelatedKeys(keys, WebInspector.UIString("Go to the panel to the left/right"));

        keys = [
            shortcut.makeDescriptor("[", shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Alt),
            shortcut.makeDescriptor("]", shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Alt)
        ];
        section.addRelatedKeys(keys, WebInspector.UIString("Go back/forward in panel history"));

        var toggleConsoleLabel = WebInspector.UIString("Show console");
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Tilde, shortcut.Modifiers.Ctrl), toggleConsoleLabel);
        section.addKey(shortcut.makeDescriptor(shortcut.Keys.Esc), WebInspector.UIString("Toggle drawer"));
        if (WebInspector.dockController.canDock()) {
            section.addKey(shortcut.makeDescriptor("M", shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Shift), WebInspector.UIString("Toggle device mode"));
            section.addKey(shortcut.makeDescriptor("D", shortcut.Modifiers.CtrlOrMeta | shortcut.Modifiers.Shift), WebInspector.UIString("Toggle dock side"));
        }
        section.addKey(shortcut.makeDescriptor("f", shortcut.Modifiers.CtrlOrMeta), WebInspector.UIString("Search"));

        var advancedSearchShortcutModifier = WebInspector.isMac()
                ? WebInspector.KeyboardShortcut.Modifiers.Meta | WebInspector.KeyboardShortcut.Modifiers.Alt
                : WebInspector.KeyboardShortcut.Modifiers.Ctrl | WebInspector.KeyboardShortcut.Modifiers.Shift;
        var advancedSearchShortcut = shortcut.makeDescriptor("f", advancedSearchShortcutModifier);
        section.addKey(advancedSearchShortcut, WebInspector.UIString("Search across all sources"));

        var inspectElementModeShortcuts = WebInspector.shortcutRegistry.shortcutDescriptorsForAction("elements.toggle-element-search");
        section.addKey(inspectElementModeShortcuts[0], WebInspector.UIString("Select node to inspect"));

        var openResourceShortcut = WebInspector.KeyboardShortcut.makeDescriptor("p", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta);
        section.addKey(openResourceShortcut, WebInspector.UIString("Go to source"));

        if (WebInspector.isMac()) {
            keys = [
                shortcut.makeDescriptor("g", shortcut.Modifiers.Meta),
                shortcut.makeDescriptor("g", shortcut.Modifiers.Meta | shortcut.Modifiers.Shift)
            ];
            section.addRelatedKeys(keys, WebInspector.UIString("Find next/previous"));
        }
    },

    _postDocumentKeyDown: function(event)
    {
        if (event.handled)
            return;

        var target = event.deepActiveElement();
        if (target) {
            var anchor = target.enclosingNodeOrSelfWithNodeName("a");
            if (anchor && anchor.preventFollow)
                event.preventDefault();
        }

        if (!WebInspector.Dialog.hasInstance() && WebInspector.inspectorView.currentPanel()) {
            WebInspector.inspectorView.currentPanel().handleShortcut(event);
            if (event.handled) {
                event.consume(true);
                return;
            }
        }

        WebInspector.shortcutRegistry.handleShortcut(event);
    },

    _documentCanCopy: function(event)
    {
        var panel = WebInspector.inspectorView.currentPanel();
        if (panel && panel["handleCopyEvent"])
            event.preventDefault();
    },

    _documentCopy: function(event)
    {
        var panel = WebInspector.inspectorView.currentPanel();
        if (panel && panel["handleCopyEvent"])
            panel["handleCopyEvent"](event);
    },

    _documentCut: function(event)
    {
        var panel = WebInspector.inspectorView.currentPanel();
        if (panel && panel["handleCutEvent"])
            panel["handleCutEvent"](event);
    },

    _documentPaste: function(event)
    {
        var panel = WebInspector.inspectorView.currentPanel();
        if (panel && panel["handlePasteEvent"])
            panel["handlePasteEvent"](event);
    },

    _contextMenuEventFired: function(event)
    {
        if (event.handled || event.target.classList.contains("popup-glasspane"))
            event.preventDefault();
    },

    /**
     * @param {!Document} document
     */
    _addMainEventListeners: function(document)
    {
        document.addEventListener("keydown", this._postDocumentKeyDown.bind(this), false);
        document.addEventListener("beforecopy", this._documentCanCopy.bind(this), true);
        document.addEventListener("copy", this._documentCopy.bind(this), false);
        document.addEventListener("cut", this._documentCut.bind(this), false);
        document.addEventListener("paste", this._documentPaste.bind(this), false);
        document.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), true);
        document.addEventListener("click", this._documentClick.bind(this), false);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _reloadInspectedPage: function(event)
    {
        var hard = /** @type {boolean} */ (event.data);
        WebInspector.Main._reloadPage(hard);
    },

    /**
     * @override
     * @param {string} reason
     */
    detached: function(reason)
    {
        WebInspector._disconnectedScreenWithReasonWasShown = true;
        WebInspector.RemoteDebuggingTerminatedScreen.show(reason);
    },

    /**
     * @override
     */
    targetCrashed: function()
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(this._mainTarget);
        if (debuggerModel)
            WebInspector.TargetCrashedScreen.show(debuggerModel);
    },

    _onSuspendStateChanged: function()
    {
        var suspended = WebInspector.targetManager.allTargetsSuspended();
        WebInspector.inspectorView.onSuspendStateChanged(suspended);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _evaluateForTestInFrontend: function(event)
    {
        if (!InspectorFrontendHost.isUnderTest())
            return;

        var callId = /** @type {number} */ (event.data["callId"]);
        var script = /** @type {number} */ (event.data["script"]);

        /**
         * @suppressGlobalPropertiesCheck
         */
        function invokeMethod()
        {
            try {
                script = script + "//# sourceURL=evaluateInWebInspector" + callId + ".js";
                window.eval(script);
            } catch (e) {
                console.error(e.stack);
            }
        }

        this._mainConnection.deprecatedRunAfterPendingDispatches(invokeMethod);
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.Main.ReloadActionDelegate = function()
{
}

WebInspector.Main.ReloadActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        switch (actionId) {
        case "main.reload":
            WebInspector.Main._reloadPage(false);
            return true;
        case "main.hard-reload":
            WebInspector.Main._reloadPage(true);
            return true;
        case "main.debug-reload":
            WebInspector.reload();
            return true;
        }
        return false;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.Main.ZoomActionDelegate = function()
{
}

WebInspector.Main.ZoomActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        if (InspectorFrontendHost.isHostedMode())
            return false;

        switch (actionId) {
        case "main.zoom-in":
            InspectorFrontendHost.zoomIn();
            return true;
        case "main.zoom-out":
            InspectorFrontendHost.zoomOut();
            return true;
        case "main.zoom-reset":
            InspectorFrontendHost.resetZoom();
            return true;
        }
        return false;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.Main.SearchActionDelegate = function()
{
}

WebInspector.Main.SearchActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        var searchableView = WebInspector.SearchableView.fromElement(WebInspector.currentFocusElement()) || WebInspector.inspectorView.currentPanel().searchableView();
        if (!searchableView)
            return false;
        switch (actionId) {
        case "main.search-in-panel.find":
            return searchableView.handleFindShortcut();
        case "main.search-in-panel.cancel":
            return searchableView.handleCancelSearchShortcut();
        case "main.search-in-panel.find-next":
            return searchableView.handleFindNextShortcut();
        case "main.search-in-panel.find-previous":
            return searchableView.handleFindPreviousShortcut();
        }
        return false;
    }
}

/**
 * @param {boolean} hard
 */
WebInspector.Main._reloadPage = function(hard)
{
    if (!WebInspector.targetManager.hasTargets())
        return;
    if (WebInspector.targetManager.mainTarget().isServiceWorker())
        return;
    WebInspector.targetManager.reloadPage(hard);
}

/**
 * @param {string} ws
 */
WebInspector.Main._addWebSocketTarget = function(ws)
{
    /**
     * @param {!InspectorBackendClass.Connection} connection
     */
    function callback(connection)
    {
        WebInspector.targetManager.createTarget(ws, WebInspector.Target.Type.Page, connection, null);
    }
    new WebInspector.WebSocketConnection(ws, callback);
}

/**
 * @constructor
 * @implements {WebInspector.ToolbarItem.Provider}
 */
WebInspector.Main.WarningErrorCounter = function()
{
    WebInspector.Main.WarningErrorCounter._instanceForTest = this;

    this._counter = createElement("div");
    this._counter.addEventListener("click", WebInspector.console.show.bind(WebInspector.console), false);
    this._toolbarItem = new WebInspector.ToolbarItem(this._counter);
    var shadowRoot = WebInspector.createShadowRootWithCoreStyles(this._counter, "main/errorWarningCounter.css");

    this._errors = this._createItem(shadowRoot, "error-icon");
    this._revokedErrors = this._createItem(shadowRoot, "revokedError-icon");
    this._warnings = this._createItem(shadowRoot, "warning-icon");
    this._titles = [];

    WebInspector.multitargetConsoleModel.addEventListener(WebInspector.ConsoleModel.Events.ConsoleCleared, this._update, this);
    WebInspector.multitargetConsoleModel.addEventListener(WebInspector.ConsoleModel.Events.MessageAdded, this._update, this);
    WebInspector.multitargetConsoleModel.addEventListener(WebInspector.ConsoleModel.Events.MessageUpdated, this._update, this);
    this._update();
}

WebInspector.Main.WarningErrorCounter.prototype = {
    /**
     * @param {!Node} shadowRoot
     * @param {string} iconType
     * @return {!{item: !Element, text: !Element}}
     */
    _createItem: function(shadowRoot, iconType)
    {
        var item = createElementWithClass("span", "counter-item");
        var icon = item.createChild("label", "", "dt-icon-label");
        icon.type = iconType;
        var text = icon.createChild("span");
        shadowRoot.appendChild(item);
        return {item: item, text: text};
    },

    /**
     * @param {!{item: !Element, text: !Element}} item
     * @param {number} count
     * @param {boolean} first
     * @param {string} title
     */
    _updateItem: function(item, count, first, title)
    {
        item.item.classList.toggle("hidden", !count);
        item.item.classList.toggle("counter-item-first", first);
        item.text.textContent = count;
        if (count)
            this._titles.push(title);
    },

    _update: function()
    {
        var errors = 0;
        var revokedErrors = 0;
        var warnings = 0;
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i) {
            errors += targets[i].consoleModel.errors();
            revokedErrors += targets[i].consoleModel.revokedErrors();
            warnings += targets[i].consoleModel.warnings();
        }

        this._titles = [];
        this._toolbarItem.setVisible(!!(errors || revokedErrors || warnings));
        this._updateItem(this._errors, errors, false, WebInspector.UIString(errors === 1 ? "%d error" : "%d errors", errors));
        this._updateItem(this._revokedErrors, revokedErrors, !errors, WebInspector.UIString(revokedErrors === 1 ? "%d handled promise rejection" : "%d handled promise rejections", revokedErrors));
        this._updateItem(this._warnings, warnings, !errors && !revokedErrors, WebInspector.UIString(warnings === 1 ? "%d warning" : "%d warnings", warnings));
        this._counter.title = this._titles.join(", ");
        WebInspector.inspectorView.toolbarItemResized();
    },

    /**
     * @override
     * @return {?WebInspector.ToolbarItem}
     */
    item: function()
    {
        return this._toolbarItem;
    }
}

/**
 * @constructor
 * @implements {WebInspector.ToolbarItem.Provider}
 */
WebInspector.Main.MainMenuItem = function()
{
    this._item = new WebInspector.ToolbarButton(WebInspector.UIString("Customize and control DevTools"), "menu-toolbar-item");
    this._item.addEventListener("mousedown", this._mouseDown, this);
}

WebInspector.Main.MainMenuItem.prototype = {
    /**
     * @override
     * @return {?WebInspector.ToolbarItem}
     */
    item: function()
    {
        return this._item;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _mouseDown: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(/** @type {!Event} */(event.data),
            true,
            this._item.element.totalOffsetLeft(),
            this._item.element.totalOffsetTop() + this._item.element.offsetHeight);

        if (WebInspector.dockController.canDock()) {
            var dockItemElement = createElementWithClass("div", "flex-centered flex-auto");
            var titleElement = dockItemElement.createChild("span", "flex-auto");
            titleElement.textContent = WebInspector.UIString("Dock side");
            var toggleDockSideShorcuts = WebInspector.shortcutRegistry.shortcutDescriptorsForAction("main.toggle-dock");
            titleElement.title = WebInspector.UIString("Placement of DevTools relative to the page. (%s to restore last position)", toggleDockSideShorcuts[0].name);
            dockItemElement.appendChild(titleElement);
            var dockItemToolbar = new WebInspector.Toolbar("", dockItemElement);
            dockItemToolbar.makeBlueOnHover();
            var undock = new WebInspector.ToolbarToggle(WebInspector.UIString("Undock into separate window"), "dock-toolbar-item-undock");
            var bottom = new WebInspector.ToolbarToggle(WebInspector.UIString("Dock to bottom"), "dock-toolbar-item-bottom");
            var right = new WebInspector.ToolbarToggle(WebInspector.UIString("Dock to right"), "dock-toolbar-item-right");
            undock.addEventListener("mouseup", setDockSide.bind(null, WebInspector.DockController.State.Undocked));
            bottom.addEventListener("mouseup", setDockSide.bind(null, WebInspector.DockController.State.DockedToBottom));
            right.addEventListener("mouseup", setDockSide.bind(null, WebInspector.DockController.State.DockedToRight));
            undock.setToggled(WebInspector.dockController.dockSide() === WebInspector.DockController.State.Undocked);
            bottom.setToggled(WebInspector.dockController.dockSide() === WebInspector.DockController.State.DockedToBottom);
            right.setToggled(WebInspector.dockController.dockSide() === WebInspector.DockController.State.DockedToRight);
            dockItemToolbar.appendToolbarItem(undock);
            dockItemToolbar.appendToolbarItem(bottom);
            dockItemToolbar.appendToolbarItem(right);
            contextMenu.appendCustomItem(dockItemElement);
            contextMenu.appendSeparator();
        }

        /**
         * @param {string} side
         */
        function setDockSide(side)
        {
            WebInspector.dockController.setDockSide(side);
            contextMenu.discard();
        }

        contextMenu.appendAction("main.toggle-drawer", WebInspector.inspectorView.drawerVisible() ? WebInspector.UIString("Hide console") : WebInspector.UIString("Show console"));
        contextMenu.appendItemsAtLocation("mainMenu");
        contextMenu.show();
    }
}

/**
 * @constructor
 */
WebInspector.NetworkPanelIndicator = function()
{
    var manager = WebInspector.multitargetNetworkManager;
    manager.addEventListener(WebInspector.MultitargetNetworkManager.Events.ConditionsChanged, updateVisibility);
    var blockedURLsSetting = WebInspector.moduleSetting("blockedURLs");
    blockedURLsSetting.addChangeListener(updateVisibility);
    updateVisibility();

    function updateVisibility()
    {
        if (manager.isThrottling()) {
            WebInspector.inspectorView.setPanelIcon("network", "warning-icon", WebInspector.UIString("Network throttling is enabled"));
        } else if (blockedURLsSetting.get().length) {
            WebInspector.inspectorView.setPanelIcon("network", "warning-icon", WebInspector.UIString("Requests may be blocked"));
        } else {
            WebInspector.inspectorView.setPanelIcon("network", "", "");
        }
    }
}

/**
 * @constructor
 */
WebInspector.SourcesPanelIndicator = function()
{
    WebInspector.moduleSetting("javaScriptDisabled").addChangeListener(javaScriptDisabledChanged);
    javaScriptDisabledChanged();

    function javaScriptDisabledChanged()
    {
        var javaScriptDisabled = WebInspector.moduleSetting("javaScriptDisabled").get();
        if (javaScriptDisabled) {
            WebInspector.inspectorView.setPanelIcon("sources", "warning-icon", WebInspector.UIString("JavaScript is disabled"));
        } else {
            WebInspector.inspectorView.setPanelIcon("sources", "", "");
        }
    }
}

/**
 * @constructor
 */
WebInspector.Main.PauseListener = function()
{
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
}

WebInspector.Main.PauseListener.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _debuggerPaused: function(event)
    {
        WebInspector.targetManager.removeModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerPaused, this._debuggerPaused, this);
        var debuggerPausedDetails = /** @type {!WebInspector.DebuggerPausedDetails} */ (event.data);
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
        WebInspector.context.setFlavor(WebInspector.Target, debuggerModel.target());
        WebInspector.Revealer.reveal(debuggerPausedDetails);
    }
}

/**
 * @constructor
 */
WebInspector.Main.InspectedNodeRevealer = function()
{
    WebInspector.targetManager.addModelListener(WebInspector.DOMModel, WebInspector.DOMModel.Events.NodeInspected, this._inspectNode, this);
}

WebInspector.Main.InspectedNodeRevealer.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _inspectNode: function(event)
    {
        var deferredNode = /** @type {!WebInspector.DeferredDOMNode} */ (event.data);
        WebInspector.Revealer.reveal(deferredNode);
    }
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {string} reason
 */
WebInspector.RemoteDebuggingTerminatedScreen = function(reason)
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("main/remoteDebuggingTerminatedScreen.css");
    var message = this.contentElement.createChild("div", "message");
    message.createChild("span").textContent = WebInspector.UIString("Debugging connection was closed. Reason: ");
    message.createChild("span", "reason").textContent = reason;
    this.contentElement.createChild("div", "message").textContent = WebInspector.UIString("Reconnect when ready by reopening DevTools.");
}

/**
 * @param {string} reason
 */
WebInspector.RemoteDebuggingTerminatedScreen.show = function(reason)
{
    var dialog = new WebInspector.Dialog();
    dialog.setWrapsContent(true);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    new WebInspector.RemoteDebuggingTerminatedScreen(reason).show(dialog.element);
    dialog.show();
}

WebInspector.RemoteDebuggingTerminatedScreen.prototype = {
    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @param {function()} hideCallback
 * @extends {WebInspector.VBox}
 */
WebInspector.TargetCrashedScreen = function(hideCallback)
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("main/targetCrashedScreen.css");
    this.contentElement.createChild("div", "message").textContent = WebInspector.UIString("DevTools was disconnected from the page.");
    this.contentElement.createChild("div", "message").textContent = WebInspector.UIString("Once page is reloaded, DevTools will automatically reconnect.");
    this._hideCallback = hideCallback;
}

/**
 * @param {!WebInspector.DebuggerModel} debuggerModel
 */
WebInspector.TargetCrashedScreen.show = function(debuggerModel)
{
    var dialog = new WebInspector.Dialog();
    dialog.setWrapsContent(true);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    var hideBound = dialog.detach.bind(dialog, false);
    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, hideBound);

    new WebInspector.TargetCrashedScreen(onHide).show(dialog.element);
    dialog.show();

    function onHide()
    {
        debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, hideBound);
    }
}

WebInspector.TargetCrashedScreen.prototype = {
    /**
     * @override
     */
    willHide: function()
    {
        this._hideCallback.call(null);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.BackendSettingsSync = function()
{
    this._autoAttachSetting = WebInspector.settings.moduleSetting("autoAttachToCreatedPages");
    this._autoAttachSetting.addChangeListener(this._update, this);
    this._disableJavascriptSetting = WebInspector.settings.moduleSetting("javaScriptDisabled");
    this._disableJavascriptSetting.addChangeListener(this._update, this);
    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Type.Page);
}

WebInspector.BackendSettingsSync.prototype = {
    _update: function()
    {
        for (var target of WebInspector.targetManager.targets(WebInspector.Target.Type.Page)) {
            target.pageAgent().setAutoAttachToCreatedPages(this._autoAttachSetting.get());
            target.emulationAgent().setScriptExecutionDisabled(this._disableJavascriptSetting.get());
        }
    },

    /**
     * @param {!WebInspector.Target} target
     * @override
     */
    targetAdded: function(target)
    {
        target.pageAgent().setAutoAttachToCreatedPages(this._autoAttachSetting.get());
        target.emulationAgent().setScriptExecutionDisabled(this._disableJavascriptSetting.get());
        target.renderingAgent().setShowViewportSizeOnResize(true);
    },

    /**
     * @param {!WebInspector.Target} target
     * @override
     */
    targetRemoved: function(target)
    {
    }
}

/**
 * @constructor
 * @implements {WebInspector.SettingUI}
 */
WebInspector.ShowMetricsRulersSettingUI = function()
{
}

WebInspector.ShowMetricsRulersSettingUI.prototype = {
    /**
     * @override
     * @return {?Element}
     */
    settingElement: function()
    {
        return WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show rulers"), WebInspector.moduleSetting("showMetricsRulers"));
    }
}


new WebInspector.Main();
