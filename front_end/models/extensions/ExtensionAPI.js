// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
self.injectedExtensionAPI = function (extensionInfo, inspectedTabId, themeName, keysToForward, testHook, injectedScriptId, targetWindowForTest) {
    const keysToForwardSet = new Set(keysToForward);
    const chrome = window.chrome || {};
    const devtools_descriptor = Object.getOwnPropertyDescriptor(chrome, 'devtools');
    if (devtools_descriptor) {
        return;
    }
    let userAction = false;
    let userRecorderAction = false;
    // Here and below, all constructors are private to API implementation.
    // For a public type Foo, if internal fields are present, these are on
    // a private FooImpl type, an instance of FooImpl is used in a closure
    // by Foo consutrctor to re-bind publicly exported members to an instance
    // of Foo.
    function EventSinkImpl(type, customDispatch) {
        this._type = type;
        this._listeners = [];
        this._customDispatch = customDispatch;
    }
    EventSinkImpl.prototype = {
        addListener: function (callback) {
            if (typeof callback !== 'function') {
                throw new Error('addListener: callback is not a function');
            }
            if (this._listeners.length === 0) {
                extensionServer.sendRequest({ command: "subscribe" /* PrivateAPI.Commands.Subscribe */, type: this._type });
            }
            this._listeners.push(callback);
            extensionServer.registerHandler('notify-' + this._type, this._dispatch.bind(this));
        },
        removeListener: function (callback) {
            const listeners = this._listeners;
            for (let i = 0; i < listeners.length; ++i) {
                if (listeners[i] === callback) {
                    listeners.splice(i, 1);
                    break;
                }
            }
            if (this._listeners.length === 0) {
                extensionServer.sendRequest({ command: "unsubscribe" /* PrivateAPI.Commands.Unsubscribe */, type: this._type });
            }
        },
        _fire: function (..._vararg) {
            const listeners = this._listeners.slice();
            for (let i = 0; i < listeners.length; ++i) {
                listeners[i].apply(null, Array.from(arguments));
            }
        },
        _dispatch: function (request) {
            if (this._customDispatch) {
                this._customDispatch.call(this, request);
            }
            else {
                this._fire.apply(this, request.arguments);
            }
        },
    };
    function Constructor(ctor) {
        return ctor;
    }
    function InspectorExtensionAPI() {
        this.inspectedWindow = new (Constructor(InspectedWindow))();
        this.panels = new (Constructor(Panels))();
        this.network = new (Constructor(Network))();
        this.languageServices = new (Constructor(LanguageServicesAPI))();
        this.recorder = new (Constructor(RecorderServicesAPI))();
        this.performance = new (Constructor(Performance))();
        defineDeprecatedProperty(this, 'webInspector', 'resources', 'network');
    }
    function Network() {
        function dispatchRequestEvent(message) {
            const request = message.arguments[1];
            request.__proto__ = new (Constructor(Request))(message.arguments[0]);
            this._fire(request);
        }
        this.onRequestFinished =
            new (Constructor(EventSink))("network-request-finished" /* PrivateAPI.Events.NetworkRequestFinished */, dispatchRequestEvent);
        defineDeprecatedProperty(this, 'network', 'onFinished', 'onRequestFinished');
        this.onNavigated = new (Constructor(EventSink))("inspected-url-changed" /* PrivateAPI.Events.InspectedURLChanged */);
    }
    Network.prototype = {
        getHAR: function (callback) {
            function callbackWrapper(response) {
                const result = response;
                const entries = (result?.entries) || [];
                for (let i = 0; i < entries.length; ++i) {
                    entries[i].__proto__ = new (Constructor(Request))(entries[i]._requestId);
                    delete entries[i]._requestId;
                }
                callback?.(result);
            }
            extensionServer.sendRequest({ command: "getHAR" /* PrivateAPI.Commands.GetHAR */ }, callback && callbackWrapper);
        },
        addRequestHeaders: function (headers) {
            extensionServer.sendRequest({ command: "addRequestHeaders" /* PrivateAPI.Commands.AddRequestHeaders */, headers, extensionId: window.location.hostname });
        },
    };
    function RequestImpl(id) {
        this._id = id;
    }
    RequestImpl.prototype = {
        getContent: function (callback) {
            function callbackWrapper(response) {
                const { content, encoding } = response;
                callback?.(content, encoding);
            }
            extensionServer.sendRequest({ command: "getRequestContent" /* PrivateAPI.Commands.GetRequestContent */, id: this._id }, callback && callbackWrapper);
        },
    };
    function Panels() {
        const panels = {
            elements: new ElementsPanel(),
            sources: new SourcesPanel(),
            network: new (Constructor(NetworkPanel))(),
        };
        function panelGetter(name) {
            return panels[name];
        }
        for (const panel in panels) {
            Object.defineProperty(this, panel, { get: panelGetter.bind(null, panel), enumerable: true });
        }
    }
    Panels.prototype = {
        create: function (title, _icon, page, callback) {
            const id = 'extension-panel-' + extensionServer.nextObjectId();
            extensionServer.sendRequest({ command: "createPanel" /* PrivateAPI.Commands.CreatePanel */, id, title, page }, callback && (() => callback.call(this, new (Constructor(ExtensionPanel))(id))));
        },
        setOpenResourceHandler: function (callback, urlScheme) {
            const hadHandler = extensionServer.hasHandler("open-resource" /* PrivateAPI.Events.OpenResource */);
            function callbackWrapper(message) {
                // Allow the panel to show itself when handling the event.
                userAction = true;
                try {
                    const { resource, lineNumber, columnNumber } = message;
                    callback.call(null, new (Constructor(Resource))(resource), lineNumber, columnNumber);
                }
                finally {
                    userAction = false;
                }
            }
            if (!callback) {
                extensionServer.unregisterHandler("open-resource" /* PrivateAPI.Events.OpenResource */);
            }
            else {
                extensionServer.registerHandler("open-resource" /* PrivateAPI.Events.OpenResource */, callbackWrapper);
            }
            // Only send command if we either removed an existing handler or added handler and had none before.
            if (hadHandler === !callback) {
                extensionServer.sendRequest({ command: "setOpenResourceHandler" /* PrivateAPI.Commands.SetOpenResourceHandler */, handlerPresent: Boolean(callback), urlScheme });
            }
        },
        setThemeChangeHandler: function (callback) {
            const hadHandler = extensionServer.hasHandler("host-theme-change" /* PrivateAPI.Events.ThemeChange */);
            function callbackWrapper(message) {
                const { themeName } = message;
                chrome.devtools.panels.themeName = themeName;
                callback.call(null, themeName);
            }
            if (!callback) {
                extensionServer.unregisterHandler("host-theme-change" /* PrivateAPI.Events.ThemeChange */);
            }
            else {
                extensionServer.registerHandler("host-theme-change" /* PrivateAPI.Events.ThemeChange */, callbackWrapper);
            }
            // Only send command if we either removed an existing handler or added handler and had none before.
            if (hadHandler === !callback) {
                extensionServer.sendRequest({ command: "setThemeChangeHandler" /* PrivateAPI.Commands.SetThemeChangeHandler */, handlerPresent: Boolean(callback) });
            }
        },
        openResource: function (url, lineNumber, columnNumber, _callback) {
            const callbackArg = extractCallbackArgument(arguments);
            // Handle older API:
            const columnNumberArg = typeof columnNumber === 'number' ? columnNumber : 0;
            extensionServer.sendRequest({ command: "openResource" /* PrivateAPI.Commands.OpenResource */, url, lineNumber, columnNumber: columnNumberArg }, callbackArg);
        },
        get SearchAction() {
            return {
                CancelSearch: "cancelSearch" /* PrivateAPI.Panels.SearchAction.CancelSearch */,
                PerformSearch: "performSearch" /* PrivateAPI.Panels.SearchAction.PerformSearch */,
                NextSearchResult: "nextSearchResult" /* PrivateAPI.Panels.SearchAction.NextSearchResult */,
                PreviousSearchResult: "previousSearchResult" /* PrivateAPI.Panels.SearchAction.PreviousSearchResult */,
            };
        },
    };
    function ExtensionViewImpl(id) {
        this._id = id;
        function dispatchShowEvent(message) {
            const frameIndex = message.arguments[0];
            if (typeof frameIndex === 'number') {
                this._fire(window.parent.frames[frameIndex]);
            }
            else {
                this._fire();
            }
        }
        if (id) {
            this.onShown = new (Constructor(EventSink))("view-shown-" /* PrivateAPI.Events.ViewShown */ + id, dispatchShowEvent);
            this.onHidden = new (Constructor(EventSink))("view-hidden," /* PrivateAPI.Events.ViewHidden */ + id);
        }
    }
    function PanelWithSidebarImpl(hostPanelName) {
        ExtensionViewImpl.call(this, null);
        this._hostPanelName = hostPanelName;
        this.onSelectionChanged = new (Constructor(EventSink))("panel-objectSelected-" /* PrivateAPI.Events.PanelObjectSelected */ + hostPanelName);
    }
    PanelWithSidebarImpl.prototype = {
        createSidebarPane: function (title, callback) {
            const id = 'extension-sidebar-' + extensionServer.nextObjectId();
            function callbackWrapper() {
                callback?.(new (Constructor(ExtensionSidebarPane))(id));
            }
            extensionServer.sendRequest({ command: "createSidebarPane" /* PrivateAPI.Commands.CreateSidebarPane */, panel: this._hostPanelName, id, title }, callback && callbackWrapper);
        },
        __proto__: ExtensionViewImpl.prototype,
    };
    function RecorderServicesAPIImpl() {
        this._plugins = new Map();
    }
    async function registerRecorderExtensionPluginImpl(plugin, pluginName, mediaType) {
        if (this._plugins.has(plugin)) {
            throw new Error(`Tried to register plugin '${pluginName}' twice`);
        }
        const channel = new MessageChannel();
        const port = channel.port1;
        this._plugins.set(plugin, port);
        port.onmessage = ({ data }) => {
            const { requestId } = data;
            dispatchMethodCall(data)
                .then(result => port.postMessage({ requestId, result }))
                .catch(error => port.postMessage({ requestId, error: { message: error.message } }));
        };
        async function dispatchMethodCall(request) {
            switch (request.method) {
                case "stringify" /* PrivateAPI.RecorderExtensionPluginCommands.Stringify */:
                    return await plugin
                        .stringify(request.parameters.recording);
                case "stringifyStep" /* PrivateAPI.RecorderExtensionPluginCommands.StringifyStep */:
                    return await plugin
                        .stringifyStep(request.parameters.step);
                case "replay" /* PrivateAPI.RecorderExtensionPluginCommands.Replay */:
                    try {
                        userAction = true;
                        userRecorderAction = true;
                        return plugin
                            .replay(request.parameters.recording);
                    }
                    finally {
                        userAction = false;
                        userRecorderAction = false;
                    }
                default:
                    // @ts-expect-error
                    throw new Error(`'${request.method}' is not recognized`);
            }
        }
        const capabilities = [];
        if ('stringify' in plugin && 'stringifyStep' in plugin) {
            capabilities.push('export');
        }
        if ('replay' in plugin) {
            capabilities.push('replay');
        }
        await new Promise(resolve => {
            extensionServer.sendRequest({
                command: "registerRecorderExtensionPlugin" /* PrivateAPI.Commands.RegisterRecorderExtensionPlugin */,
                pluginName,
                mediaType,
                capabilities,
                port: channel.port2,
            }, () => resolve(), [channel.port2]);
        });
    }
    RecorderServicesAPIImpl.prototype = {
        registerRecorderExtensionPlugin: registerRecorderExtensionPluginImpl,
        unregisterRecorderExtensionPlugin: async function (plugin) {
            const port = this._plugins.get(plugin);
            if (!port) {
                throw new Error('Tried to unregister a plugin that was not previously registered');
            }
            this._plugins.delete(plugin);
            port.postMessage({ event: "unregisteredRecorderExtensionPlugin" /* PrivateAPI.RecorderExtensionPluginEvents.UnregisteredRecorderExtensionPlugin */ });
            port.close();
        },
        createView: async function (title, pagePath) {
            const id = 'recorder-extension-view-' + extensionServer.nextObjectId();
            await new Promise(resolve => {
                extensionServer.sendRequest({ command: "createRecorderView" /* PrivateAPI.Commands.CreateRecorderView */, id, title, pagePath }, resolve);
            });
            return new (Constructor(RecorderView))(id);
        },
    };
    function LanguageServicesAPIImpl() {
        this._plugins = new Map();
    }
    LanguageServicesAPIImpl.prototype = {
        registerLanguageExtensionPlugin: async function (plugin, pluginName, supportedScriptTypes) {
            if (this._plugins.has(plugin)) {
                throw new Error(`Tried to register plugin '${pluginName}' twice`);
            }
            const channel = new MessageChannel();
            const port = channel.port1;
            this._plugins.set(plugin, port);
            port.onmessage = ({ data }) => {
                const { requestId } = data;
                console.time(`${requestId}: ${data.method}`);
                dispatchMethodCall(data)
                    .then(result => port.postMessage({ requestId, result }))
                    .catch(error => port.postMessage({ requestId, error: { message: error.message } }))
                    .finally(() => console.timeEnd(`${requestId}: ${data.method}`));
            };
            function dispatchMethodCall(request) {
                switch (request.method) {
                    case "addRawModule" /* PrivateAPI.LanguageExtensionPluginCommands.AddRawModule */:
                        return plugin.addRawModule(request.parameters.rawModuleId, request.parameters.symbolsURL, request.parameters.rawModule);
                    case "removeRawModule" /* PrivateAPI.LanguageExtensionPluginCommands.RemoveRawModule */:
                        return plugin.removeRawModule(request.parameters.rawModuleId);
                    case "sourceLocationToRawLocation" /* PrivateAPI.LanguageExtensionPluginCommands.SourceLocationToRawLocation */:
                        return plugin.sourceLocationToRawLocation(request.parameters.sourceLocation);
                    case "rawLocationToSourceLocation" /* PrivateAPI.LanguageExtensionPluginCommands.RawLocationToSourceLocation */:
                        return plugin.rawLocationToSourceLocation(request.parameters.rawLocation);
                    case "getScopeInfo" /* PrivateAPI.LanguageExtensionPluginCommands.GetScopeInfo */:
                        return plugin.getScopeInfo(request.parameters.type);
                    case "listVariablesInScope" /* PrivateAPI.LanguageExtensionPluginCommands.ListVariablesInScope */:
                        return plugin.listVariablesInScope(request.parameters.rawLocation);
                    case "getFunctionInfo" /* PrivateAPI.LanguageExtensionPluginCommands.GetFunctionInfo */:
                        return plugin.getFunctionInfo(request.parameters.rawLocation);
                    case "getInlinedFunctionRanges" /* PrivateAPI.LanguageExtensionPluginCommands.GetInlinedFunctionRanges */:
                        return plugin.getInlinedFunctionRanges(request.parameters.rawLocation);
                    case "getInlinedCalleesRanges" /* PrivateAPI.LanguageExtensionPluginCommands.GetInlinedCalleesRanges */:
                        return plugin.getInlinedCalleesRanges(request.parameters.rawLocation);
                    case "getMappedLines" /* PrivateAPI.LanguageExtensionPluginCommands.GetMappedLines */:
                        if ('getMappedLines' in plugin) {
                            return plugin.getMappedLines(request.parameters.rawModuleId, request.parameters.sourceFileURL);
                        }
                        return Promise.resolve(undefined);
                    case "formatValue" /* PrivateAPI.LanguageExtensionPluginCommands.FormatValue */:
                        if ('evaluate' in plugin && plugin.evaluate) {
                            return plugin.evaluate(request.parameters.expression, request.parameters.context, request.parameters.stopId);
                        }
                        return Promise.resolve(undefined);
                    case "getProperties" /* PrivateAPI.LanguageExtensionPluginCommands.GetProperties */:
                        if ('getProperties' in plugin && plugin.getProperties) {
                            return plugin.getProperties(request.parameters.objectId);
                        }
                        if (!('evaluate' in plugin &&
                            plugin.evaluate)) { // If evalute is defined but the remote objects methods aren't, that's a bug
                            return Promise.resolve(undefined);
                        }
                        break;
                    case "releaseObject" /* PrivateAPI.LanguageExtensionPluginCommands.ReleaseObject */:
                        if ('releaseObject' in plugin && plugin.releaseObject) {
                            return plugin.releaseObject(request.parameters.objectId);
                        }
                        break;
                }
                throw new Error(`Unknown language plugin method ${request.method}`);
            }
            await new Promise(resolve => {
                extensionServer.sendRequest({
                    command: "registerLanguageExtensionPlugin" /* PrivateAPI.Commands.RegisterLanguageExtensionPlugin */,
                    pluginName,
                    port: channel.port2,
                    supportedScriptTypes,
                }, () => resolve(), [channel.port2]);
            });
        },
        unregisterLanguageExtensionPlugin: async function (plugin) {
            const port = this._plugins.get(plugin);
            if (!port) {
                throw new Error('Tried to unregister a plugin that was not previously registered');
            }
            this._plugins.delete(plugin);
            port.postMessage({ event: "unregisteredLanguageExtensionPlugin" /* PrivateAPI.LanguageExtensionPluginEvents.UnregisteredLanguageExtensionPlugin */ });
            port.close();
        },
        getWasmLinearMemory: async function (offset, length, stopId) {
            const result = await new Promise(resolve => extensionServer.sendRequest({ command: "getWasmLinearMemory" /* PrivateAPI.Commands.GetWasmLinearMemory */, offset, length, stopId }, resolve));
            if (Array.isArray(result)) {
                return new Uint8Array(result).buffer;
            }
            return new ArrayBuffer(0);
        },
        getWasmLocal: async function (local, stopId) {
            return await new Promise(resolve => extensionServer.sendRequest({ command: "getWasmLocal" /* PrivateAPI.Commands.GetWasmLocal */, local, stopId }, resolve));
        },
        getWasmGlobal: async function (global, stopId) {
            return await new Promise(resolve => extensionServer.sendRequest({ command: "getWasmGlobal" /* PrivateAPI.Commands.GetWasmGlobal */, global, stopId }, resolve));
        },
        getWasmOp: async function (op, stopId) {
            return await new Promise(resolve => extensionServer.sendRequest({ command: "getWasmOp" /* PrivateAPI.Commands.GetWasmOp */, op, stopId }, resolve));
        },
        reportResourceLoad: function (resourceUrl, status) {
            return new Promise(resolve => extensionServer.sendRequest({
                command: "reportResourceLoad" /* PrivateAPI.Commands.ReportResourceLoad */,
                extensionId: window.location.origin,
                resourceUrl,
                status,
            }, resolve));
        },
    };
    function NetworkPanelImpl() {
    }
    NetworkPanelImpl.prototype = {
        show: function (options) {
            return new Promise(resolve => extensionServer.sendRequest({ command: "showNetworkPanel" /* PrivateAPI.Commands.ShowNetworkPanel */, filter: options?.filter }, () => resolve()));
        },
    };
    function PerformanceImpl() {
        function dispatchProfilingStartedEvent() {
            this._fire();
        }
        function dispatchProfilingStoppedEvent() {
            this._fire();
        }
        this.onProfilingStarted =
            new (Constructor(EventSink))("profiling-started-" /* PrivateAPI.Events.ProfilingStarted */, dispatchProfilingStartedEvent);
        this.onProfilingStopped =
            new (Constructor(EventSink))("profiling-stopped-" /* PrivateAPI.Events.ProfilingStopped */, dispatchProfilingStoppedEvent);
    }
    function declareInterfaceClass(implConstructor) {
        return function (...args) {
            const impl = { __proto__: implConstructor.prototype };
            implConstructor.apply(impl, args);
            populateInterfaceClass(this, impl);
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function defineDeprecatedProperty(object, className, oldName, newName) {
        let warningGiven = false;
        function getter() {
            if (!warningGiven) {
                console.warn(className + '.' + oldName + ' is deprecated. Use ' + className + '.' + newName + ' instead');
                warningGiven = true;
            }
            return object[newName];
        }
        object.__defineGetter__(oldName, getter);
    }
    function extractCallbackArgument(args) {
        const lastArgument = args[args.length - 1];
        return typeof lastArgument === 'function' ? lastArgument : undefined;
    }
    const LanguageServicesAPI = declareInterfaceClass(LanguageServicesAPIImpl);
    const RecorderServicesAPI = declareInterfaceClass(RecorderServicesAPIImpl);
    const Performance = declareInterfaceClass(PerformanceImpl);
    const Button = declareInterfaceClass(ButtonImpl);
    const EventSink = declareInterfaceClass(EventSinkImpl);
    const ExtensionPanel = declareInterfaceClass(ExtensionPanelImpl);
    const RecorderView = declareInterfaceClass(RecorderViewImpl);
    const ExtensionSidebarPane = declareInterfaceClass(ExtensionSidebarPaneImpl);
    const PanelWithSidebarClass = declareInterfaceClass(PanelWithSidebarImpl);
    const Request = declareInterfaceClass(RequestImpl);
    const Resource = declareInterfaceClass(ResourceImpl);
    const NetworkPanel = declareInterfaceClass(NetworkPanelImpl);
    class ElementsPanel extends (Constructor(PanelWithSidebarClass)) {
        constructor() {
            super('elements');
        }
    }
    class SourcesPanel extends (Constructor(PanelWithSidebarClass)) {
        constructor() {
            super('sources');
        }
    }
    function ExtensionPanelImpl(id) {
        ExtensionViewImpl.call(this, id);
        this.onSearch = new (Constructor(EventSink))("panel-search-" /* PrivateAPI.Events.PanelSearch */ + id);
    }
    ExtensionPanelImpl.prototype = {
        createStatusBarButton: function (iconPath, tooltipText, disabled) {
            const id = 'button-' + extensionServer.nextObjectId();
            extensionServer.sendRequest({
                command: "createToolbarButton" /* PrivateAPI.Commands.CreateToolbarButton */,
                panel: this._id,
                id,
                icon: iconPath,
                tooltip: tooltipText,
                disabled: Boolean(disabled),
            });
            return new (Constructor(Button))(id);
        },
        show: function () {
            if (!userAction) {
                return;
            }
            extensionServer.sendRequest({ command: "showPanel" /* PrivateAPI.Commands.ShowPanel */, id: this._id });
        },
        __proto__: ExtensionViewImpl.prototype,
    };
    function RecorderViewImpl(id) {
        ExtensionViewImpl.call(this, id);
    }
    RecorderViewImpl.prototype = {
        show: function () {
            if (!userAction || !userRecorderAction) {
                return;
            }
            extensionServer.sendRequest({ command: "showRecorderView" /* PrivateAPI.Commands.ShowRecorderView */, id: this._id });
        },
        __proto__: ExtensionViewImpl.prototype,
    };
    function ExtensionSidebarPaneImpl(id) {
        ExtensionViewImpl.call(this, id);
    }
    ExtensionSidebarPaneImpl.prototype = {
        setHeight: function (height) {
            extensionServer.sendRequest({ command: "setSidebarHeight" /* PrivateAPI.Commands.SetSidebarHeight */, id: this._id, height });
        },
        setExpression: function (expression, rootTitle, evaluateOptions, _callback) {
            extensionServer.sendRequest({
                command: "setSidebarContent" /* PrivateAPI.Commands.SetSidebarContent */,
                id: this._id,
                expression,
                rootTitle,
                evaluateOnPage: true,
                evaluateOptions: (typeof evaluateOptions === 'object' ? evaluateOptions : {}),
            }, extractCallbackArgument(arguments));
        },
        setObject: function (jsonObject, rootTitle, callback) {
            extensionServer.sendRequest({
                command: "setSidebarContent" /* PrivateAPI.Commands.SetSidebarContent */,
                id: this._id,
                expression: jsonObject,
                rootTitle,
            }, callback);
        },
        setPage: function (page) {
            extensionServer.sendRequest({ command: "setSidebarPage" /* PrivateAPI.Commands.SetSidebarPage */, id: this._id, page });
        },
        __proto__: ExtensionViewImpl.prototype,
    };
    function ButtonImpl(id) {
        this._id = id;
        this.onClicked = new (Constructor(EventSink))("button-clicked-" /* PrivateAPI.Events.ButtonClicked */ + id);
    }
    ButtonImpl.prototype = {
        update: function (iconPath, tooltipText, disabled) {
            extensionServer.sendRequest({
                command: "updateButton" /* PrivateAPI.Commands.UpdateButton */,
                id: this._id,
                icon: iconPath,
                tooltip: tooltipText,
                disabled: Boolean(disabled),
            });
        },
    };
    function InspectedWindow() {
        function dispatchResourceEvent(message) {
            const resourceData = message.arguments[0];
            this._fire(new (Constructor(Resource))(resourceData));
        }
        function dispatchResourceContentEvent(message) {
            const resourceData = message.arguments[0];
            this._fire(new (Constructor(Resource))(resourceData), message.arguments[1]);
        }
        this.onResourceAdded = new (Constructor(EventSink))("resource-added" /* PrivateAPI.Events.ResourceAdded */, dispatchResourceEvent);
        this.onResourceContentCommitted =
            new (Constructor(EventSink))("resource-content-committed" /* PrivateAPI.Events.ResourceContentCommitted */, dispatchResourceContentEvent);
    }
    InspectedWindow.prototype = {
        reload: function (optionsOrUserAgent) {
            let options = null;
            if (typeof optionsOrUserAgent === 'object') {
                options = optionsOrUserAgent;
            }
            else if (typeof optionsOrUserAgent === 'string') {
                options = { userAgent: optionsOrUserAgent };
                console.warn('Passing userAgent as string parameter to inspectedWindow.reload() is deprecated. ' +
                    'Use inspectedWindow.reload({ userAgent: value}) instead.');
            }
            extensionServer.sendRequest({ command: "Reload" /* PrivateAPI.Commands.Reload */, options });
        },
        eval: function (expression, evaluateOptions) {
            const callback = extractCallbackArgument(arguments);
            function callbackWrapper(result) {
                const { isError, isException, value } = result;
                if (isError || isException) {
                    callback?.(undefined, result);
                }
                else {
                    callback?.(value);
                }
            }
            extensionServer.sendRequest({
                command: "evaluateOnInspectedPage" /* PrivateAPI.Commands.EvaluateOnInspectedPage */,
                expression,
                evaluateOptions: (typeof evaluateOptions === 'object' ? evaluateOptions : undefined),
            }, callback && callbackWrapper);
            return null;
        },
        getResources: function (callback) {
            function wrapResource(resourceData) {
                return new (Constructor(Resource))(resourceData);
            }
            function callbackWrapper(resources) {
                callback?.(resources.map(wrapResource));
            }
            extensionServer.sendRequest({ command: "getPageResources" /* PrivateAPI.Commands.GetPageResources */ }, callback && callbackWrapper);
        },
    };
    function ResourceImpl(resourceData) {
        this._url = resourceData.url;
        this._type = resourceData.type;
        this._buildId = resourceData.buildId;
    }
    ResourceImpl.prototype = {
        get url() {
            return this._url;
        },
        get type() {
            return this._type;
        },
        get buildId() {
            return this._buildId;
        },
        getContent: function (callback) {
            function callbackWrapper(response) {
                const { content, encoding } = response;
                callback?.(content, encoding);
            }
            extensionServer.sendRequest({ command: "getResourceContent" /* PrivateAPI.Commands.GetResourceContent */, url: this._url }, callback && callbackWrapper);
        },
        setContent: function (content, commit, callback) {
            extensionServer.sendRequest({ command: "setResourceContent" /* PrivateAPI.Commands.SetResourceContent */, url: this._url, content, commit }, callback);
        },
        setFunctionRangesForScript: function (ranges) {
            return new Promise((resolve, reject) => extensionServer.sendRequest({
                command: "setFunctionRangesForScript" /* PrivateAPI.Commands.SetFunctionRangesForScript */,
                scriptUrl: this._url,
                ranges,
            }, (response) => {
                const result = response;
                if (result.isError) {
                    reject(result);
                }
                else {
                    resolve();
                }
            }));
        },
        attachSourceMapURL: function (sourceMapURL) {
            return new Promise((resolve, reject) => extensionServer.sendRequest({ command: "attachSourceMapToResource" /* PrivateAPI.Commands.AttachSourceMapToResource */, contentUrl: this._url, sourceMapURL }, (response) => {
                const result = response;
                if (result.isError) {
                    reject(new Error(result.description));
                }
                else {
                    resolve();
                }
            }));
        },
    };
    function getTabId() {
        return inspectedTabId;
    }
    let keyboardEventRequestQueue = [];
    let forwardTimer = null;
    function forwardKeyboardEvent(event) {
        // Check if the event should be forwarded.
        // This is a workaround for crbug.com/923338.
        const focused = document.activeElement;
        if (focused) {
            const isInput = focused.nodeName === 'INPUT' || focused.nodeName === 'TEXTAREA' || focused.isContentEditable;
            if (isInput && !(event.ctrlKey || event.altKey || event.metaKey)) {
                return;
            }
        }
        let modifiers = 0;
        if (event.shiftKey) {
            modifiers |= 1;
        }
        if (event.ctrlKey) {
            modifiers |= 2;
        }
        if (event.altKey) {
            modifiers |= 4;
        }
        if (event.metaKey) {
            modifiers |= 8;
        }
        const num = (event.keyCode & 255) | (modifiers << 8);
        // We only care about global hotkeys, not about random text
        if (!keysToForwardSet.has(num)) {
            return;
        }
        event.preventDefault();
        const requestPayload = {
            eventType: event.type,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            // @ts-expect-error keyIdentifier is a deprecated non-standard property that typescript doesn't know about.
            keyIdentifier: event.keyIdentifier,
            key: event.key,
            code: event.code,
            location: event.location,
            keyCode: event.keyCode,
        };
        keyboardEventRequestQueue.push(requestPayload);
        if (!forwardTimer) {
            forwardTimer = window.setTimeout(forwardEventQueue, 0);
        }
    }
    function forwardEventQueue() {
        forwardTimer = null;
        extensionServer.sendRequest({ command: "_forwardKeyboardEvent" /* PrivateAPI.Commands.ForwardKeyboardEvent */, entries: keyboardEventRequestQueue });
        keyboardEventRequestQueue = [];
    }
    document.addEventListener('keydown', forwardKeyboardEvent, false);
    function ExtensionServerClient(targetWindow) {
        this._callbacks = {};
        this._handlers = {};
        this._lastRequestId = 0;
        this._lastObjectId = 0;
        this.registerHandler('callback', this._onCallback.bind(this));
        const channel = new MessageChannel();
        this._port = channel.port1;
        this._port.addEventListener('message', this._onMessage.bind(this), false);
        this._port.start();
        targetWindow.postMessage('registerExtension', '*', [channel.port2]);
    }
    ExtensionServerClient.prototype = {
        sendRequest: function (message, callback, transfers) {
            if (typeof callback === 'function') {
                message.requestId =
                    this._registerCallback(callback);
            }
            // @ts-expect-error
            this._port.postMessage(message, transfers);
        },
        hasHandler: function (command) {
            return Boolean(this._handlers[command]);
        },
        registerHandler: function (command, handler) {
            this._handlers[command] = handler;
        },
        unregisterHandler: function (command) {
            delete this._handlers[command];
        },
        nextObjectId: function () {
            return injectedScriptId.toString() + '_' + ++this._lastObjectId;
        },
        _registerCallback: function (callback) {
            const id = ++this._lastRequestId;
            this._callbacks[id] = callback;
            return id;
        },
        _onCallback: function (request) {
            if (request.requestId in this._callbacks) {
                const callback = this._callbacks[request.requestId];
                delete this._callbacks[request.requestId];
                callback(request.result);
            }
        },
        _onMessage: function (event) {
            const request = event.data;
            const handler = this._handlers[request.command];
            if (handler) {
                handler.call(this, request);
            }
        },
    };
    function populateInterfaceClass(interfaze, implementation) {
        for (const member in implementation) {
            if (member.charAt(0) === '_') {
                continue;
            }
            let descriptor = null;
            // Traverse prototype chain until we find the owner.
            for (let owner = implementation; owner && !descriptor; owner = owner.__proto__) {
                descriptor = Object.getOwnPropertyDescriptor(owner, member);
            }
            if (!descriptor) {
                continue;
            }
            if (typeof descriptor.value === 'function') {
                interfaze[member] = descriptor.value.bind(implementation);
            }
            else if (typeof descriptor.get === 'function') {
                // @ts-expect-error
                interfaze.__defineGetter__(member, descriptor.get.bind(implementation));
            }
            else {
                Object.defineProperty(interfaze, member, descriptor);
            }
        }
    }
    const extensionServer = new (Constructor(ExtensionServerClient))(targetWindowForTest || window.parent);
    const coreAPI = new (Constructor(InspectorExtensionAPI))();
    Object.defineProperty(chrome, 'devtools', { value: {}, enumerable: true });
    // Only expose tabId on chrome.devtools.inspectedWindow, not webInspector.inspectedWindow.
    // @ts-expect-error
    chrome.devtools.inspectedWindow = {};
    Object.defineProperty(chrome.devtools.inspectedWindow, 'tabId', { get: getTabId });
    // @ts-expect-error
    chrome.devtools.inspectedWindow.__proto__ = coreAPI.inspectedWindow;
    chrome.devtools.network = coreAPI.network;
    chrome.devtools.panels = coreAPI.panels;
    chrome.devtools.panels.themeName = themeName;
    chrome.devtools.languageServices = coreAPI.languageServices;
    chrome.devtools.recorder = coreAPI.recorder;
    chrome.devtools.performance = coreAPI.performance;
    // default to expose experimental APIs for now.
    if (extensionInfo.exposeExperimentalAPIs !== false) {
        chrome.experimental = chrome.experimental || {};
        chrome.experimental.devtools = chrome.experimental.devtools || {};
        const properties = Object.getOwnPropertyNames(coreAPI);
        for (let i = 0; i < properties.length; ++i) {
            const descriptor = Object.getOwnPropertyDescriptor(coreAPI, properties[i]);
            if (descriptor) {
                Object.defineProperty(chrome.experimental.devtools, properties[i], descriptor);
            }
        }
        chrome.experimental.devtools.inspectedWindow = chrome.devtools.inspectedWindow;
    }
    if (extensionInfo.exposeWebInspectorNamespace) {
        window.webInspector = coreAPI;
    }
    testHook(extensionServer, coreAPI);
};
self.buildExtensionAPIInjectedScript = function (extensionInfo, inspectedTabId, themeName, keysToForward, testHook) {
    const argumentsJSON = [extensionInfo, inspectedTabId || null, themeName, keysToForward].map(_ => JSON.stringify(_)).join(',');
    if (!testHook) {
        testHook = () => { };
    }
    return '(function(injectedScriptId){ ' +
        '(' + self.injectedExtensionAPI.toString() + ')(' + argumentsJSON + ',' + testHook + ', injectedScriptId);' +
        '})';
};
export {};
//# sourceMappingURL=ExtensionAPI.js.map