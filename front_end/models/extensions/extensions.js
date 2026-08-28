var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/extensions/ExtensionAPI.ts
var ExtensionAPI_exports = {};
__export(ExtensionAPI_exports, {
  PrivateAPI: () => PrivateAPI
});
var PrivateAPI;
((PrivateAPI2) => {
  let Panels;
  ((Panels2) => {
    let SearchAction;
    ((SearchAction2) => {
      SearchAction2["CancelSearch"] = "cancelSearch";
      SearchAction2["PerformSearch"] = "performSearch";
      SearchAction2["NextSearchResult"] = "nextSearchResult";
      SearchAction2["PreviousSearchResult"] = "previousSearchResult";
    })(SearchAction = Panels2.SearchAction || (Panels2.SearchAction = {}));
  })(Panels = PrivateAPI2.Panels || (PrivateAPI2.Panels = {}));
  let Events2;
  ((Events3) => {
    Events3["ButtonClicked"] = "button-clicked-";
    Events3["PanelObjectSelected"] = "panel-objectSelected-";
    Events3["InspectedURLChanged"] = "inspected-url-changed";
    Events3["NetworkRequestFinished"] = "network-request-finished";
    Events3["OpenResource"] = "open-resource";
    Events3["PanelSearch"] = "panel-search-";
    Events3["ProfilingStarted"] = "profiling-started-";
    Events3["ProfilingStopped"] = "profiling-stopped-";
    Events3["ResourceAdded"] = "resource-added";
    Events3["ResourceContentCommitted"] = "resource-content-committed";
    Events3["ViewShown"] = "view-shown-";
    Events3["ViewHidden"] = "view-hidden,";
    Events3["ThemeChange"] = "host-theme-change";
  })(Events2 = PrivateAPI2.Events || (PrivateAPI2.Events = {}));
  let Commands;
  ((Commands2) => {
    Commands2["AddRequestHeaders"] = "addRequestHeaders";
    Commands2["CreatePanel"] = "createPanel";
    Commands2["CreateSidebarPane"] = "createSidebarPane";
    Commands2["CreateToolbarButton"] = "createToolbarButton";
    Commands2["EvaluateOnInspectedPage"] = "evaluateOnInspectedPage";
    Commands2["ForwardKeyboardEvent"] = "_forwardKeyboardEvent";
    Commands2["GetHAR"] = "getHAR";
    Commands2["GetPageResources"] = "getPageResources";
    Commands2["GetRequestContent"] = "getRequestContent";
    Commands2["GetResourceContent"] = "getResourceContent";
    Commands2["OpenResource"] = "openResource";
    Commands2["Reload"] = "Reload";
    Commands2["Subscribe"] = "subscribe";
    Commands2["SetOpenResourceHandler"] = "setOpenResourceHandler";
    Commands2["SetThemeChangeHandler"] = "setThemeChangeHandler";
    Commands2["SetResourceContent"] = "setResourceContent";
    Commands2["SetSidebarContent"] = "setSidebarContent";
    Commands2["SetSidebarHeight"] = "setSidebarHeight";
    Commands2["SetSidebarPage"] = "setSidebarPage";
    Commands2["ShowPanel"] = "showPanel";
    Commands2["Unsubscribe"] = "unsubscribe";
    Commands2["UpdateButton"] = "updateButton";
    Commands2["AttachSourceMapToResource"] = "attachSourceMapToResource";
    Commands2["RegisterLanguageExtensionPlugin"] = "registerLanguageExtensionPlugin";
    Commands2["GetWasmLinearMemory"] = "getWasmLinearMemory";
    Commands2["GetWasmLocal"] = "getWasmLocal";
    Commands2["GetWasmGlobal"] = "getWasmGlobal";
    Commands2["GetWasmOp"] = "getWasmOp";
    Commands2["RegisterRecorderExtensionPlugin"] = "registerRecorderExtensionPlugin";
    Commands2["CreateRecorderView"] = "createRecorderView";
    Commands2["ShowRecorderView"] = "showRecorderView";
    Commands2["ShowNetworkPanel"] = "showNetworkPanel";
    Commands2["ReportResourceLoad"] = "reportResourceLoad";
    Commands2["SetFunctionRangesForScript"] = "setFunctionRangesForScript";
  })(Commands = PrivateAPI2.Commands || (PrivateAPI2.Commands = {}));
  let LanguageExtensionPluginCommands;
  ((LanguageExtensionPluginCommands2) => {
    LanguageExtensionPluginCommands2["AddRawModule"] = "addRawModule";
    LanguageExtensionPluginCommands2["RemoveRawModule"] = "removeRawModule";
    LanguageExtensionPluginCommands2["SourceLocationToRawLocation"] = "sourceLocationToRawLocation";
    LanguageExtensionPluginCommands2["RawLocationToSourceLocation"] = "rawLocationToSourceLocation";
    LanguageExtensionPluginCommands2["GetScopeInfo"] = "getScopeInfo";
    LanguageExtensionPluginCommands2["ListVariablesInScope"] = "listVariablesInScope";
    LanguageExtensionPluginCommands2["GetTypeInfo"] = "getTypeInfo";
    LanguageExtensionPluginCommands2["GetFormatter"] = "getFormatter";
    LanguageExtensionPluginCommands2["GetInspectableAddress"] = "getInspectableAddress";
    LanguageExtensionPluginCommands2["GetFunctionInfo"] = "getFunctionInfo";
    LanguageExtensionPluginCommands2["GetInlinedFunctionRanges"] = "getInlinedFunctionRanges";
    LanguageExtensionPluginCommands2["GetInlinedCalleesRanges"] = "getInlinedCalleesRanges";
    LanguageExtensionPluginCommands2["GetMappedLines"] = "getMappedLines";
    LanguageExtensionPluginCommands2["FormatValue"] = "formatValue";
    LanguageExtensionPluginCommands2["GetProperties"] = "getProperties";
    LanguageExtensionPluginCommands2["ReleaseObject"] = "releaseObject";
  })(LanguageExtensionPluginCommands = PrivateAPI2.LanguageExtensionPluginCommands || (PrivateAPI2.LanguageExtensionPluginCommands = {}));
  let LanguageExtensionPluginEvents;
  ((LanguageExtensionPluginEvents2) => {
    LanguageExtensionPluginEvents2["UnregisteredLanguageExtensionPlugin"] = "unregisteredLanguageExtensionPlugin";
  })(LanguageExtensionPluginEvents = PrivateAPI2.LanguageExtensionPluginEvents || (PrivateAPI2.LanguageExtensionPluginEvents = {}));
  let RecorderExtensionPluginCommands;
  ((RecorderExtensionPluginCommands2) => {
    RecorderExtensionPluginCommands2["Stringify"] = "stringify";
    RecorderExtensionPluginCommands2["StringifyStep"] = "stringifyStep";
    RecorderExtensionPluginCommands2["Replay"] = "replay";
  })(RecorderExtensionPluginCommands = PrivateAPI2.RecorderExtensionPluginCommands || (PrivateAPI2.RecorderExtensionPluginCommands = {}));
  let RecorderExtensionPluginEvents;
  ((RecorderExtensionPluginEvents2) => {
    RecorderExtensionPluginEvents2["UnregisteredRecorderExtensionPlugin"] = "unregisteredRecorderExtensionPlugin";
  })(RecorderExtensionPluginEvents = PrivateAPI2.RecorderExtensionPluginEvents || (PrivateAPI2.RecorderExtensionPluginEvents = {}));
})(PrivateAPI || (PrivateAPI = {}));
self.injectedExtensionAPI = function(extensionInfo, inspectedTabId, themeName, keysToForward, testHook, injectedScriptId, targetWindowForTest) {
  const keysToForwardSet = new Set(keysToForward);
  const chrome = window.chrome || {};
  const devtools_descriptor = Object.getOwnPropertyDescriptor(chrome, "devtools");
  if (devtools_descriptor) {
    return;
  }
  let userAction = false;
  let userRecorderAction = false;
  function EventSinkImpl(type, customDispatch) {
    this._type = type;
    this._listeners = [];
    this._customDispatch = customDispatch;
  }
  EventSinkImpl.prototype = {
    addListener: function(callback) {
      if (typeof callback !== "function") {
        throw new Error("addListener: callback is not a function");
      }
      if (this._listeners.length === 0) {
        extensionServer.sendRequest({ command: "subscribe" /* Subscribe */, type: this._type });
      }
      this._listeners.push(callback);
      extensionServer.registerHandler("notify-" + this._type, this._dispatch.bind(this));
    },
    removeListener: function(callback) {
      const listeners = this._listeners;
      for (let i = 0; i < listeners.length; ++i) {
        if (listeners[i] === callback) {
          listeners.splice(i, 1);
          break;
        }
      }
      if (this._listeners.length === 0) {
        extensionServer.sendRequest({ command: "unsubscribe" /* Unsubscribe */, type: this._type });
      }
    },
    _fire: function(..._vararg) {
      const listeners = this._listeners.slice();
      for (let i = 0; i < listeners.length; ++i) {
        listeners[i].apply(null, Array.from(arguments));
      }
    },
    _dispatch: function(request) {
      if (this._customDispatch) {
        this._customDispatch.call(this, request);
      } else {
        this._fire.apply(this, request.arguments);
      }
    }
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
    defineDeprecatedProperty(this, "webInspector", "resources", "network");
  }
  function Network() {
    function dispatchRequestEvent(message) {
      const request = message.arguments[1];
      request.__proto__ = new (Constructor(Request))(message.arguments[0]);
      this._fire(request);
    }
    this.onRequestFinished = new (Constructor(EventSink))("network-request-finished" /* NetworkRequestFinished */, dispatchRequestEvent);
    defineDeprecatedProperty(this, "network", "onFinished", "onRequestFinished");
    this.onNavigated = new (Constructor(EventSink))("inspected-url-changed" /* InspectedURLChanged */);
  }
  Network.prototype = {
    getHAR: function(_callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      function callbackWrapper(response) {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        const result = response;
        const entries = result?.entries || [];
        for (let i = 0; i < entries.length; ++i) {
          entries[i].__proto__ = new (Constructor(Request))(entries[i]._requestId);
          delete entries[i]._requestId;
        }
        resolve?.(result);
        callbackArg?.(result);
      }
      extensionServer.sendRequest({ command: "getHAR" /* GetHAR */ }, callbackWrapper);
      return promise;
    },
    addRequestHeaders: function(headers) {
      extensionServer.sendRequest(
        { command: "addRequestHeaders" /* AddRequestHeaders */, headers, extensionId: window.location.hostname }
      );
    }
  };
  function RequestImpl(id) {
    this._id = id;
  }
  RequestImpl.prototype = {
    getContent: function(_callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      function callbackWrapper(response) {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        const { content, encoding } = response;
        resolve?.({ content, encoding });
        callbackArg?.(content, encoding);
      }
      extensionServer.sendRequest({ command: "getRequestContent" /* GetRequestContent */, id: this._id }, callbackWrapper);
      return promise;
    }
  };
  function Panels() {
    const panels = {
      elements: new ElementsPanel(),
      sources: new SourcesPanel(),
      network: new (Constructor(NetworkPanel))()
    };
    function panelGetter(name) {
      return panels[name];
    }
    for (const panel in panels) {
      Object.defineProperty(this, panel, { get: panelGetter.bind(null, panel), enumerable: true });
    }
  }
  Panels.prototype = {
    create: function(title, _iconPath, pagePath, _callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      const id = "extension-panel-" + extensionServer.nextObjectId();
      const callbackWrapper = (response) => {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        const panel = new (Constructor(ExtensionPanel))(id);
        resolve?.(panel);
        callbackArg?.call(this, panel);
      };
      extensionServer.sendRequest(
        { command: "createPanel" /* CreatePanel */, id, title, page: pagePath },
        callbackWrapper
      );
      return promise;
    },
    setOpenResourceHandler: function(callback, urlScheme) {
      const hadHandler = extensionServer.hasHandler("open-resource" /* OpenResource */);
      function callbackWrapper(message) {
        userAction = true;
        try {
          const { resource, lineNumber, columnNumber } = message;
          callback.call(null, new (Constructor(Resource))(resource), lineNumber, columnNumber);
        } finally {
          userAction = false;
        }
      }
      if (!callback) {
        extensionServer.unregisterHandler("open-resource" /* OpenResource */);
      } else {
        extensionServer.registerHandler("open-resource" /* OpenResource */, callbackWrapper);
      }
      if (hadHandler === !callback) {
        extensionServer.sendRequest(
          { command: "setOpenResourceHandler" /* SetOpenResourceHandler */, handlerPresent: Boolean(callback), urlScheme }
        );
      }
    },
    setThemeChangeHandler: function(callback) {
      const hadHandler = extensionServer.hasHandler("host-theme-change" /* ThemeChange */);
      function callbackWrapper(message) {
        const { themeName: themeName2 } = message;
        chrome.devtools.panels.themeName = themeName2;
        callback.call(null, themeName2);
      }
      if (!callback) {
        extensionServer.unregisterHandler("host-theme-change" /* ThemeChange */);
      } else {
        extensionServer.registerHandler("host-theme-change" /* ThemeChange */, callbackWrapper);
      }
      if (hadHandler === !callback) {
        extensionServer.sendRequest(
          { command: "setThemeChangeHandler" /* SetThemeChangeHandler */, handlerPresent: Boolean(callback) }
        );
      }
    },
    openResource: function(url, lineNumber, columnNumber, _callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      const columnNumberArg = typeof columnNumber === "number" ? columnNumber : 0;
      const callbackWrapper = (response) => {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        resolve?.(response);
        callbackArg?.call(this, response);
      };
      extensionServer.sendRequest(
        { command: "openResource" /* OpenResource */, url, lineNumber, columnNumber: columnNumberArg },
        callbackWrapper
      );
      return promise;
    },
    get SearchAction() {
      return {
        CancelSearch: "cancelSearch" /* CancelSearch */,
        PerformSearch: "performSearch" /* PerformSearch */,
        NextSearchResult: "nextSearchResult" /* NextSearchResult */,
        PreviousSearchResult: "previousSearchResult" /* PreviousSearchResult */
      };
    }
  };
  function ExtensionViewImpl(id) {
    this._id = id;
    function dispatchShowEvent(message) {
      const frameIndex = message.arguments[0];
      if (typeof frameIndex === "number") {
        this._fire(window.parent.frames[frameIndex]);
      } else {
        this._fire();
      }
    }
    if (id) {
      this.onShown = new (Constructor(EventSink))("view-shown-" /* ViewShown */ + id, dispatchShowEvent);
      this.onHidden = new (Constructor(EventSink))("view-hidden," /* ViewHidden */ + id);
    }
  }
  function PanelWithSidebarImpl(hostPanelName) {
    ExtensionViewImpl.call(this, null);
    this._hostPanelName = hostPanelName;
    this.onSelectionChanged = new (Constructor(EventSink))("panel-objectSelected-" /* PanelObjectSelected */ + hostPanelName);
  }
  PanelWithSidebarImpl.prototype = {
    createSidebarPane: function(title, _callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      const id = "extension-sidebar-" + extensionServer.nextObjectId();
      const callbackWrapper = (response) => {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        const pane = new (Constructor(ExtensionSidebarPane))(id);
        resolve?.(pane);
        callbackArg?.call(this, pane);
      };
      extensionServer.sendRequest(
        { command: "createSidebarPane" /* CreateSidebarPane */, panel: this._hostPanelName, id, title },
        callbackWrapper
      );
      return promise;
    },
    __proto__: ExtensionViewImpl.prototype
  };
  function RecorderServicesAPIImpl() {
    this._plugins = /* @__PURE__ */ new Map();
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
      dispatchMethodCall(data).then((result) => port.postMessage({ requestId, result })).catch((error) => port.postMessage({ requestId, error: { message: error.message } }));
    };
    async function dispatchMethodCall(request) {
      switch (request.method) {
        case "stringify" /* Stringify */:
          return await plugin.stringify(request.parameters.recording);
        case "stringifyStep" /* StringifyStep */:
          return await plugin.stringifyStep(request.parameters.step);
        case "replay" /* Replay */:
          try {
            userAction = true;
            userRecorderAction = true;
            return plugin.replay(request.parameters.recording);
          } finally {
            userAction = false;
            userRecorderAction = false;
          }
        default:
          throw new Error(`'${request.method}' is not recognized`);
      }
    }
    const capabilities = [];
    if ("stringify" in plugin && "stringifyStep" in plugin) {
      capabilities.push("export");
    }
    if ("replay" in plugin) {
      capabilities.push("replay");
    }
    await new Promise((resolve) => {
      extensionServer.sendRequest(
        {
          command: "registerRecorderExtensionPlugin" /* RegisterRecorderExtensionPlugin */,
          pluginName,
          mediaType,
          capabilities,
          port: channel.port2
        },
        () => resolve(),
        [channel.port2]
      );
    });
  }
  RecorderServicesAPIImpl.prototype = {
    registerRecorderExtensionPlugin: registerRecorderExtensionPluginImpl,
    unregisterRecorderExtensionPlugin: async function(plugin) {
      const port = this._plugins.get(plugin);
      if (!port) {
        throw new Error("Tried to unregister a plugin that was not previously registered");
      }
      this._plugins.delete(plugin);
      port.postMessage({ event: "unregisteredRecorderExtensionPlugin" /* UnregisteredRecorderExtensionPlugin */ });
      port.close();
    },
    createView: async function(title, pagePath) {
      const id = "recorder-extension-view-" + extensionServer.nextObjectId();
      await new Promise((resolve) => {
        extensionServer.sendRequest(
          { command: "createRecorderView" /* CreateRecorderView */, id, title, pagePath },
          resolve
        );
      });
      return new (Constructor(RecorderView))(id);
    }
  };
  function LanguageServicesAPIImpl() {
    this._plugins = /* @__PURE__ */ new Map();
  }
  LanguageServicesAPIImpl.prototype = {
    registerLanguageExtensionPlugin: async function(plugin, pluginName, supportedScriptTypes) {
      if (this._plugins.has(plugin)) {
        throw new Error(`Tried to register plugin '${pluginName}' twice`);
      }
      const channel = new MessageChannel();
      const port = channel.port1;
      this._plugins.set(plugin, port);
      port.onmessage = ({ data }) => {
        const { requestId } = data;
        console.time(`${requestId}: ${data.method}`);
        dispatchMethodCall(data).then((result) => port.postMessage({ requestId, result })).catch((error) => port.postMessage({ requestId, error: { message: error.message } })).finally(() => console.timeEnd(`${requestId}: ${data.method}`));
      };
      function dispatchMethodCall(request) {
        switch (request.method) {
          case "addRawModule" /* AddRawModule */:
            return plugin.addRawModule(
              request.parameters.rawModuleId,
              request.parameters.symbolsURL,
              request.parameters.rawModule
            );
          case "removeRawModule" /* RemoveRawModule */:
            return plugin.removeRawModule(request.parameters.rawModuleId);
          case "sourceLocationToRawLocation" /* SourceLocationToRawLocation */:
            return plugin.sourceLocationToRawLocation(request.parameters.sourceLocation);
          case "rawLocationToSourceLocation" /* RawLocationToSourceLocation */:
            return plugin.rawLocationToSourceLocation(request.parameters.rawLocation);
          case "getScopeInfo" /* GetScopeInfo */:
            return plugin.getScopeInfo(request.parameters.type);
          case "listVariablesInScope" /* ListVariablesInScope */:
            return plugin.listVariablesInScope(request.parameters.rawLocation);
          case "getFunctionInfo" /* GetFunctionInfo */:
            return plugin.getFunctionInfo(request.parameters.rawLocation);
          case "getInlinedFunctionRanges" /* GetInlinedFunctionRanges */:
            return plugin.getInlinedFunctionRanges(request.parameters.rawLocation);
          case "getInlinedCalleesRanges" /* GetInlinedCalleesRanges */:
            return plugin.getInlinedCalleesRanges(request.parameters.rawLocation);
          case "getMappedLines" /* GetMappedLines */:
            if ("getMappedLines" in plugin) {
              return plugin.getMappedLines(request.parameters.rawModuleId, request.parameters.sourceFileURL);
            }
            return Promise.resolve(void 0);
          case "formatValue" /* FormatValue */:
            if ("evaluate" in plugin && plugin.evaluate) {
              return plugin.evaluate(
                request.parameters.expression,
                request.parameters.context,
                request.parameters.stopId
              );
            }
            return Promise.resolve(void 0);
          case "getProperties" /* GetProperties */:
            if ("getProperties" in plugin && plugin.getProperties) {
              return plugin.getProperties(request.parameters.objectId);
            }
            if (!("evaluate" in plugin && plugin.evaluate)) {
              return Promise.resolve(void 0);
            }
            break;
          case "releaseObject" /* ReleaseObject */:
            if ("releaseObject" in plugin && plugin.releaseObject) {
              return plugin.releaseObject(request.parameters.objectId);
            }
            break;
        }
        throw new Error(`Unknown language plugin method ${request.method}`);
      }
      await new Promise((resolve) => {
        extensionServer.sendRequest(
          {
            command: "registerLanguageExtensionPlugin" /* RegisterLanguageExtensionPlugin */,
            pluginName,
            port: channel.port2,
            supportedScriptTypes
          },
          () => resolve(),
          [channel.port2]
        );
      });
    },
    unregisterLanguageExtensionPlugin: async function(plugin) {
      const port = this._plugins.get(plugin);
      if (!port) {
        throw new Error("Tried to unregister a plugin that was not previously registered");
      }
      this._plugins.delete(plugin);
      port.postMessage({ event: "unregisteredLanguageExtensionPlugin" /* UnregisteredLanguageExtensionPlugin */ });
      port.close();
    },
    getWasmLinearMemory: async function(offset, length, stopId) {
      const result = await new Promise(
        (resolve) => extensionServer.sendRequest(
          { command: "getWasmLinearMemory" /* GetWasmLinearMemory */, offset, length, stopId },
          resolve
        )
      );
      if (Array.isArray(result)) {
        return new Uint8Array(result).buffer;
      }
      return new ArrayBuffer(0);
    },
    getWasmLocal: async function(local, stopId) {
      return await new Promise(
        (resolve) => extensionServer.sendRequest({ command: "getWasmLocal" /* GetWasmLocal */, local, stopId }, resolve)
      );
    },
    getWasmGlobal: async function(global, stopId) {
      return await new Promise(
        (resolve) => extensionServer.sendRequest({ command: "getWasmGlobal" /* GetWasmGlobal */, global, stopId }, resolve)
      );
    },
    getWasmOp: async function(op, stopId) {
      return await new Promise(
        (resolve) => extensionServer.sendRequest({ command: "getWasmOp" /* GetWasmOp */, op, stopId }, resolve)
      );
    },
    reportResourceLoad: function(resourceUrl, status) {
      return new Promise(
        (resolve) => extensionServer.sendRequest(
          {
            command: "reportResourceLoad" /* ReportResourceLoad */,
            extensionId: window.location.origin,
            resourceUrl,
            status
          },
          resolve
        )
      );
    }
  };
  function NetworkPanelImpl() {
  }
  NetworkPanelImpl.prototype = {
    show: function(options) {
      return new Promise(
        (resolve) => extensionServer.sendRequest(
          { command: "showNetworkPanel" /* ShowNetworkPanel */, filter: options?.filter },
          () => resolve()
        )
      );
    }
  };
  function PerformanceImpl() {
    function dispatchProfilingStartedEvent() {
      this._fire();
    }
    function dispatchProfilingStoppedEvent() {
      this._fire();
    }
    this.onProfilingStarted = new (Constructor(EventSink))("profiling-started-" /* ProfilingStarted */, dispatchProfilingStartedEvent);
    this.onProfilingStopped = new (Constructor(EventSink))("profiling-stopped-" /* ProfilingStopped */, dispatchProfilingStoppedEvent);
  }
  function declareInterfaceClass(implConstructor) {
    return function(...args) {
      const impl = { __proto__: implConstructor.prototype };
      implConstructor.apply(impl, args);
      populateInterfaceClass(this, impl);
    };
  }
  function defineDeprecatedProperty(object, className, oldName, newName) {
    let warningGiven = false;
    function getter() {
      if (!warningGiven) {
        console.warn(className + "." + oldName + " is deprecated. Use " + className + "." + newName + " instead");
        warningGiven = true;
      }
      return object[newName];
    }
    object.__defineGetter__(oldName, getter);
  }
  function extractCallbackArgument(args) {
    const lastArgument = args[args.length - 1];
    return typeof lastArgument === "function" ? lastArgument : void 0;
  }
  function callbackOrPromise(args) {
    const callback = extractCallbackArgument(args);
    if (callback) {
      return { callback };
    }
    const { promise, resolve, reject } = Promise.withResolvers();
    return { promise, resolve, reject };
  }
  function checkErrorAndReject(response, reject) {
    const res = response;
    if (res?.isError && reject) {
      reject(new Error("DevTools API encountered an error"));
      return true;
    }
    return false;
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
  class ElementsPanel extends Constructor(PanelWithSidebarClass) {
    constructor() {
      super("elements");
    }
  }
  class SourcesPanel extends Constructor(PanelWithSidebarClass) {
    constructor() {
      super("sources");
    }
  }
  function ExtensionPanelImpl(id) {
    ExtensionViewImpl.call(this, id);
    this.onSearch = new (Constructor(EventSink))("panel-search-" /* PanelSearch */ + id);
  }
  ExtensionPanelImpl.prototype = {
    createStatusBarButton: function(iconPath, tooltipText, disabled) {
      const id = "button-" + extensionServer.nextObjectId();
      extensionServer.sendRequest({
        command: "createToolbarButton" /* CreateToolbarButton */,
        panel: this._id,
        id,
        icon: iconPath,
        tooltip: tooltipText,
        disabled: Boolean(disabled)
      });
      return new (Constructor(Button))(id);
    },
    show: function() {
      if (!userAction) {
        return;
      }
      extensionServer.sendRequest({ command: "showPanel" /* ShowPanel */, id: this._id });
    },
    __proto__: ExtensionViewImpl.prototype
  };
  function RecorderViewImpl(id) {
    ExtensionViewImpl.call(this, id);
  }
  RecorderViewImpl.prototype = {
    show: function() {
      if (!userAction || !userRecorderAction) {
        return;
      }
      extensionServer.sendRequest({ command: "showRecorderView" /* ShowRecorderView */, id: this._id });
    },
    __proto__: ExtensionViewImpl.prototype
  };
  function ExtensionSidebarPaneImpl(id) {
    ExtensionViewImpl.call(this, id);
  }
  ExtensionSidebarPaneImpl.prototype = {
    setHeight: function(height) {
      extensionServer.sendRequest({ command: "setSidebarHeight" /* SetSidebarHeight */, id: this._id, height });
    },
    setExpression: function(expression, rootTitle, evaluateOptions, _callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      const callbackWrapper = (response) => {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        resolve?.();
        callbackArg?.call(this);
      };
      extensionServer.sendRequest(
        {
          command: "setSidebarContent" /* SetSidebarContent */,
          id: this._id,
          expression,
          rootTitle,
          evaluateOnPage: true,
          evaluateOptions: typeof evaluateOptions === "object" ? evaluateOptions : {}
        },
        callbackWrapper
      );
      return promise;
    },
    setObject: function(jsonObject, rootTitle, _callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      const callbackWrapper = (response) => {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        resolve?.();
        callbackArg?.call(this);
      };
      extensionServer.sendRequest(
        {
          command: "setSidebarContent" /* SetSidebarContent */,
          id: this._id,
          expression: jsonObject,
          rootTitle
        },
        callbackWrapper
      );
      return promise;
    },
    setPage: function(page) {
      extensionServer.sendRequest({ command: "setSidebarPage" /* SetSidebarPage */, id: this._id, page });
    },
    __proto__: ExtensionViewImpl.prototype
  };
  function ButtonImpl(id) {
    this._id = id;
    this.onClicked = new (Constructor(EventSink))("button-clicked-" /* ButtonClicked */ + id);
  }
  ButtonImpl.prototype = {
    update: function(iconPath, tooltipText, disabled) {
      extensionServer.sendRequest({
        command: "updateButton" /* UpdateButton */,
        id: this._id,
        icon: iconPath,
        tooltip: tooltipText,
        disabled: Boolean(disabled)
      });
    }
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
    this.onResourceAdded = new (Constructor(EventSink))("resource-added" /* ResourceAdded */, dispatchResourceEvent);
    this.onResourceContentCommitted = new (Constructor(EventSink))("resource-content-committed" /* ResourceContentCommitted */, dispatchResourceContentEvent);
  }
  InspectedWindow.prototype = {
    reload: function(optionsOrUserAgent) {
      let options = null;
      if (typeof optionsOrUserAgent === "object") {
        options = optionsOrUserAgent;
      } else if (typeof optionsOrUserAgent === "string") {
        options = { userAgent: optionsOrUserAgent };
        console.warn(
          "Passing userAgent as string parameter to inspectedWindow.reload() is deprecated. Use inspectedWindow.reload({ userAgent: value}) instead."
        );
      }
      extensionServer.sendRequest({ command: "Reload" /* Reload */, options });
    },
    eval: function(expression, optionsOrCallback, _callback) {
      const options = typeof optionsOrCallback === "object" && optionsOrCallback !== null ? optionsOrCallback : void 0;
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      function callbackWrapper(result) {
        if (checkErrorAndReject(result, reject)) {
          return;
        }
        const res = result;
        if (res.isException) {
          reject?.(res);
        } else {
          resolve?.(res.value);
        }
        if (res.isError || res.isException) {
          callbackArg?.(void 0, res);
        } else {
          callbackArg?.(res.value);
        }
      }
      extensionServer.sendRequest(
        { command: "evaluateOnInspectedPage" /* EvaluateOnInspectedPage */, expression, evaluateOptions: options },
        callbackWrapper
      );
      return promise;
    },
    getResources: function(_callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      function callbackWrapper(response) {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        const wrappedResources = (response || []).map((r) => new (Constructor(Resource))(r));
        resolve?.(wrappedResources);
        callbackArg?.(wrappedResources);
      }
      extensionServer.sendRequest({ command: "getPageResources" /* GetPageResources */ }, callbackWrapper);
      return promise;
    }
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
    getContent: function(_callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      function callbackWrapper(response) {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        const { content, encoding } = response;
        resolve?.({ content, encoding });
        callbackArg?.(content, encoding);
      }
      extensionServer.sendRequest(
        { command: "getResourceContent" /* GetResourceContent */, url: this._url },
        callbackWrapper
      );
      return promise;
    },
    setContent: function(content, commit, _callback) {
      const { callback: callbackArg, promise, resolve, reject } = callbackOrPromise(arguments);
      function callbackWrapper(response) {
        if (checkErrorAndReject(response, reject)) {
          return;
        }
        resolve?.();
        callbackArg?.(response);
      }
      extensionServer.sendRequest(
        { command: "setResourceContent" /* SetResourceContent */, url: this._url, content, commit },
        callbackWrapper
      );
      return promise;
    },
    setFunctionRangesForScript: function(ranges) {
      return new Promise(
        (resolve, reject) => extensionServer.sendRequest(
          {
            command: "setFunctionRangesForScript" /* SetFunctionRangesForScript */,
            scriptUrl: this._url,
            ranges
          },
          (response) => {
            const result = response;
            if (result.isError) {
              reject(result);
            } else {
              resolve();
            }
          }
        )
      );
    },
    attachSourceMapURL: function(sourceMapURL) {
      return new Promise(
        (resolve, reject) => extensionServer.sendRequest(
          { command: "attachSourceMapToResource" /* AttachSourceMapToResource */, contentUrl: this._url, sourceMapURL },
          (response) => {
            const result = response;
            if (result.isError) {
              reject(new Error(result.description));
            } else {
              resolve();
            }
          }
        )
      );
    }
  };
  function getTabId() {
    return inspectedTabId;
  }
  let keyboardEventRequestQueue = [];
  let forwardTimer;
  function forwardKeyboardEvent(event) {
    const requestPayload = Object.freeze({
      eventType: event.type,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      key: event.key,
      code: event.code,
      keyCode: event.keyCode,
      location: event.location
    });
    const targetDocument = targetWindowForTest?.document ?? document;
    const focused = targetDocument.activeElement;
    if (focused) {
      const isInput = focused.nodeName === "INPUT" || focused.nodeName === "TEXTAREA" || focused.isContentEditable;
      if (isInput && !(requestPayload.ctrlKey || requestPayload.altKey || requestPayload.metaKey)) {
        return;
      }
    }
    let modifiers = 0;
    if (requestPayload.shiftKey) {
      modifiers |= 1;
    }
    if (requestPayload.ctrlKey) {
      modifiers |= 2;
    }
    if (requestPayload.altKey) {
      modifiers |= 4;
    }
    if (requestPayload.metaKey) {
      modifiers |= 8;
    }
    const num = requestPayload.keyCode & 255 | modifiers << 8;
    if (!keysToForwardSet.has(num)) {
      return;
    }
    event.preventDefault();
    keyboardEventRequestQueue.push(requestPayload);
    if (!forwardTimer) {
      forwardTimer = globalThis.setTimeout(forwardEventQueue, 0);
    }
  }
  function forwardEventQueue() {
    forwardTimer = void 0;
    extensionServer.sendRequest(
      { command: "_forwardKeyboardEvent" /* ForwardKeyboardEvent */, entries: keyboardEventRequestQueue }
    );
    keyboardEventRequestQueue = [];
  }
  (targetWindowForTest?.document ?? document).addEventListener("keydown", forwardKeyboardEvent, false);
  function ExtensionServerClient(targetWindow) {
    this._callbacks = {};
    this._handlers = {};
    this._lastRequestId = 0;
    this._lastObjectId = 0;
    this.registerHandler("callback", this._onCallback.bind(this));
    const channel = new MessageChannel();
    this._port = channel.port1;
    this._port.addEventListener("message", this._onMessage.bind(this), false);
    this._port.start();
    targetWindow.postMessage("registerExtension", "*", [channel.port2]);
  }
  ExtensionServerClient.prototype = {
    sendRequest: function(message, callback, transfers) {
      if (typeof callback === "function") {
        message.requestId = this._registerCallback(callback);
      }
      this._port.postMessage(message, transfers);
    },
    hasHandler: function(command) {
      return Boolean(this._handlers[command]);
    },
    registerHandler: function(command, handler) {
      this._handlers[command] = handler;
    },
    unregisterHandler: function(command) {
      delete this._handlers[command];
    },
    nextObjectId: function() {
      return injectedScriptId.toString() + "_" + ++this._lastObjectId;
    },
    _registerCallback: function(callback) {
      const id = ++this._lastRequestId;
      this._callbacks[id] = callback;
      return id;
    },
    _onCallback: function(request) {
      if (request.requestId in this._callbacks) {
        const callback = this._callbacks[request.requestId];
        delete this._callbacks[request.requestId];
        callback(request.result);
      }
    },
    _onMessage: function(event) {
      const request = event.data;
      const handler = this._handlers[request.command];
      if (handler) {
        handler.call(this, request);
      }
    }
  };
  function populateInterfaceClass(interfaze, implementation) {
    for (const member in implementation) {
      if (member.charAt(0) === "_") {
        continue;
      }
      let descriptor = null;
      for (let owner = implementation; owner && !descriptor; owner = owner.__proto__) {
        descriptor = Object.getOwnPropertyDescriptor(owner, member);
      }
      if (!descriptor) {
        continue;
      }
      if (typeof descriptor.value === "function") {
        interfaze[member] = descriptor.value.bind(implementation);
      } else if (typeof descriptor.get === "function") {
        interfaze.__defineGetter__(member, descriptor.get.bind(implementation));
      } else {
        Object.defineProperty(interfaze, member, descriptor);
      }
    }
  }
  const extensionServer = new (Constructor(ExtensionServerClient))(targetWindowForTest || window.parent);
  const coreAPI = new (Constructor(InspectorExtensionAPI))();
  Object.defineProperty(chrome, "devtools", { value: {}, enumerable: true });
  chrome.devtools.inspectedWindow = {};
  Object.defineProperty(chrome.devtools.inspectedWindow, "tabId", { get: getTabId });
  chrome.devtools.inspectedWindow.__proto__ = coreAPI.inspectedWindow;
  chrome.devtools.network = coreAPI.network;
  chrome.devtools.panels = coreAPI.panels;
  chrome.devtools.panels.themeName = themeName;
  chrome.devtools.languageServices = coreAPI.languageServices;
  chrome.devtools.recorder = coreAPI.recorder;
  chrome.devtools.performance = coreAPI.performance;
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
self.buildExtensionAPIInjectedScript = function(extensionInfo, inspectedTabId, themeName, keysToForward, testHook) {
  const argumentsJSON = [extensionInfo, inspectedTabId || null, themeName, keysToForward].map((_) => JSON.stringify(_)).join(",");
  if (!testHook) {
    testHook = () => {
    };
  }
  return "(function(injectedScriptId){ (" + self.injectedExtensionAPI.toString() + ")(" + argumentsJSON + "," + testHook + ", injectedScriptId);})";
};

// ../../front_end/models/extensions/ExtensionEndpoint.ts
var ExtensionEndpoint_exports = {};
__export(ExtensionEndpoint_exports, {
  ExtensionEndpoint: () => ExtensionEndpoint
});
var ExtensionEndpoint = class {
  port;
  nextRequestId = 0;
  pendingRequests;
  constructor(port) {
    this.port = port;
    this.port.onmessage = this.onResponse.bind(this);
    this.pendingRequests = /* @__PURE__ */ new Map();
  }
  sendRequest(method, parameters) {
    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      this.pendingRequests.set(requestId, { resolve, reject });
      this.port.postMessage({ requestId, method, parameters });
    });
  }
  disconnect() {
    for (const { reject } of this.pendingRequests.values()) {
      reject(new Error("Extension endpoint disconnected"));
    }
    this.pendingRequests.clear();
    this.port.close();
  }
  onResponse({ data }) {
    if ("event" in data) {
      this.handleEvent(data);
      return;
    }
    const { requestId, result, error } = data;
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) {
      console.error(`No pending request ${requestId}`);
      return;
    }
    this.pendingRequests.delete(requestId);
    if (error) {
      pendingRequest.reject(new Error(error.message));
    } else {
      pendingRequest.resolve(result);
    }
  }
  handleEvent(_event) {
    throw new Error("handleEvent is not implemented");
  }
};

// ../../front_end/models/extensions/HostUrlPattern.ts
var HostUrlPattern_exports = {};
__export(HostUrlPattern_exports, {
  HostUrlPattern: () => HostUrlPattern
});
function parseScheme(pattern) {
  const SCHEME_SEPARATOR = "://";
  const schemeEnd = pattern.indexOf(SCHEME_SEPARATOR);
  if (schemeEnd < 0) {
    return void 0;
  }
  const scheme = pattern.substr(0, schemeEnd).toLowerCase();
  const validSchemes = [
    "*",
    "http",
    "https",
    "ftp",
    "chrome",
    "chrome-extension"
    // Chromium additionally defines the following schemes, but these aren't relevant for host url patterns:
    /* 'file', 'filesystem', 'ws', 'wss', 'data', 'uuid-in-package'*/
  ];
  if (!validSchemes.includes(scheme)) {
    return void 0;
  }
  return { scheme, hostPattern: pattern.substr(schemeEnd + SCHEME_SEPARATOR.length) };
}
function defaultPort(scheme) {
  switch (scheme) {
    case "http":
      return "80";
    case "https":
      return "443";
    case "ftp":
      return "25";
  }
  return void 0;
}
function parseHostAndPort(pattern, scheme) {
  const pathnameStart = pattern.indexOf("/");
  if (pathnameStart >= 0) {
    const path = pattern.substr(pathnameStart);
    if (path !== "/*" && path !== "/") {
      return void 0;
    }
    pattern = pattern.substr(0, pathnameStart);
  }
  const PORT_WILDCARD = ":*";
  if (pattern.endsWith(PORT_WILDCARD)) {
    pattern = pattern.substr(0, pattern.length - PORT_WILDCARD.length);
  }
  if (pattern.endsWith(":")) {
    return void 0;
  }
  const SUBDOMAIN_WILDCARD = "*.";
  let asUrl;
  try {
    asUrl = new URL(
      pattern.startsWith(SUBDOMAIN_WILDCARD) ? `http://${pattern.substr(SUBDOMAIN_WILDCARD.length)}` : `http://${pattern}`
    );
  } catch {
    return void 0;
  }
  if (asUrl.pathname !== "/") {
    return void 0;
  }
  if (asUrl.hostname.endsWith(".")) {
    asUrl.hostname = asUrl.hostname.substr(0, asUrl.hostname.length - 1);
  }
  if (asUrl.hostname !== "%2A" && asUrl.hostname.includes("%2A")) {
    return void 0;
  }
  const httpPort = defaultPort("http");
  if (!httpPort) {
    return void 0;
  }
  const port = pattern.endsWith(`:${httpPort}`) ? httpPort : asUrl.port === "" ? "*" : asUrl.port;
  const schemesWithPort = ["http", "https", "ftp"];
  if (port !== "*" && !schemesWithPort.includes(scheme)) {
    return void 0;
  }
  const host = asUrl.hostname !== "%2A" ? pattern.startsWith("*.") ? `*.${asUrl.hostname}` : asUrl.hostname : "*";
  return {
    host,
    port
  };
}
var HostUrlPattern = class _HostUrlPattern {
  constructor(pattern) {
    this.pattern = pattern;
  }
  static parse(pattern) {
    if (pattern === "<all_urls>") {
      return new _HostUrlPattern({ matchesAll: true });
    }
    const parsedScheme = parseScheme(pattern);
    if (!parsedScheme) {
      return void 0;
    }
    const { scheme, hostPattern } = parsedScheme;
    const parsedHost = parseHostAndPort(hostPattern, scheme);
    if (!parsedHost) {
      return void 0;
    }
    const { host, port } = parsedHost;
    return new _HostUrlPattern({ scheme, host, port, matchesAll: false });
  }
  get scheme() {
    return this.pattern.matchesAll ? "*" : this.pattern.scheme;
  }
  get host() {
    return this.pattern.matchesAll ? "*" : this.pattern.host;
  }
  get port() {
    return this.pattern.matchesAll ? "*" : this.pattern.port;
  }
  matchesAllUrls() {
    return this.pattern.matchesAll;
  }
  matchesUrl(url) {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return false;
    }
    if (this.matchesAllUrls()) {
      return true;
    }
    const scheme = parsedUrl.protocol.substr(0, parsedUrl.protocol.length - 1);
    const port = parsedUrl.port || defaultPort(scheme);
    return this.matchesScheme(scheme) && this.matchesHost(parsedUrl.hostname) && (!port || this.matchesPort(port));
  }
  matchesScheme(scheme) {
    if (this.pattern.matchesAll) {
      return true;
    }
    if (this.pattern.scheme === "*") {
      return scheme === "http" || scheme === "https";
    }
    return this.pattern.scheme === scheme;
  }
  matchesHost(host) {
    if (this.pattern.matchesAll) {
      return true;
    }
    if (this.pattern.host === "*") {
      return true;
    }
    let normalizedHost = new URL(`http://${host}`).hostname;
    if (normalizedHost.endsWith(".")) {
      normalizedHost = normalizedHost.substr(0, normalizedHost.length - 1);
    }
    if (this.pattern.host.startsWith("*.")) {
      return normalizedHost === this.pattern.host.substr(2) || normalizedHost.endsWith(this.pattern.host.substr(1));
    }
    return this.pattern.host === normalizedHost;
  }
  matchesPort(port) {
    if (this.pattern.matchesAll) {
      return true;
    }
    return this.pattern.port === "*" || this.pattern.port === port;
  }
};

// ../../front_end/models/extensions/LanguageExtensionEndpoint.ts
var LanguageExtensionEndpoint_exports = {};
__export(LanguageExtensionEndpoint_exports, {
  LanguageExtensionEndpoint: () => LanguageExtensionEndpoint
});
var LanguageExtensionEndpointImpl = class extends ExtensionEndpoint {
  plugin;
  #pluginManager;
  constructor(plugin, port, pluginManager) {
    super(port);
    this.plugin = plugin;
    this.#pluginManager = pluginManager;
  }
  handleEvent({ event }) {
    switch (event) {
      case PrivateAPI.LanguageExtensionPluginEvents.UnregisteredLanguageExtensionPlugin: {
        this.disconnect();
        this.#pluginManager.removePlugin(this.plugin);
        break;
      }
    }
  }
};
var LanguageExtensionEndpoint = class {
  supportedScriptTypes;
  endpoint;
  extensionOrigin;
  allowFileAccess;
  name;
  constructor(allowFileAccess, extensionOrigin, name, supportedScriptTypes, port, pluginManager) {
    this.name = name;
    this.extensionOrigin = extensionOrigin;
    this.supportedScriptTypes = supportedScriptTypes;
    this.endpoint = new LanguageExtensionEndpointImpl(this, port, pluginManager);
    this.allowFileAccess = allowFileAccess;
  }
  canAccessURL(url) {
    try {
      return !url || this.allowFileAccess || new URL(url).protocol !== "file:";
    } catch {
      return true;
    }
  }
  handleScript(script) {
    try {
      if (!this.canAccessURL(script.contentURL()) || script.hasSourceURL && !this.canAccessURL(script.sourceURL) || script.debugSymbols?.externalURL && !this.canAccessURL(script.debugSymbols.externalURL)) {
        return false;
      }
    } catch {
      return false;
    }
    const language = script.scriptLanguage();
    return language !== null && script.debugSymbols !== null && language === this.supportedScriptTypes.language && this.supportedScriptTypes.symbol_types.includes(script.debugSymbols.type);
  }
  createPageResourceLoadInitiator() {
    return {
      target: null,
      frameId: null,
      extensionId: this.extensionOrigin,
      initiatorUrl: this.extensionOrigin
    };
  }
  /**
   * Notify the plugin about a new script
   */
  addRawModule(rawModuleId, symbolsURL, rawModule) {
    if (!this.canAccessURL(symbolsURL) || !this.canAccessURL(rawModule.url)) {
      return Promise.resolve([]);
    }
    return this.endpoint.sendRequest(
      PrivateAPI.LanguageExtensionPluginCommands.AddRawModule,
      { rawModuleId, symbolsURL, rawModule }
    );
  }
  /**
   * Notifies the plugin that a script is removed.
   */
  removeRawModule(rawModuleId) {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.RemoveRawModule, { rawModuleId });
  }
  /**
   * Find locations in raw modules from a location in a source file
   */
  sourceLocationToRawLocation(sourceLocation) {
    return this.endpoint.sendRequest(
      PrivateAPI.LanguageExtensionPluginCommands.SourceLocationToRawLocation,
      { sourceLocation }
    );
  }
  /**
   * Find locations in source files from a location in a raw module
   */
  rawLocationToSourceLocation(rawLocation) {
    return this.endpoint.sendRequest(
      PrivateAPI.LanguageExtensionPluginCommands.RawLocationToSourceLocation,
      { rawLocation }
    );
  }
  getScopeInfo(type) {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetScopeInfo, { type });
  }
  /**
   * List all variables in lexical scope at a given location in a raw module
   */
  listVariablesInScope(rawLocation) {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.ListVariablesInScope, { rawLocation });
  }
  /**
   * List all function names (including inlined frames) at location
   */
  getFunctionInfo(rawLocation) {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetFunctionInfo, { rawLocation });
  }
  /**
   * Find locations in raw modules corresponding to the inline function
   *  that rawLocation is in.
   */
  getInlinedFunctionRanges(rawLocation) {
    return this.endpoint.sendRequest(
      PrivateAPI.LanguageExtensionPluginCommands.GetInlinedFunctionRanges,
      { rawLocation }
    );
  }
  /**
   * Find locations in raw modules corresponding to inline functions
   *  called by the function or inline frame that rawLocation is in.
   */
  getInlinedCalleesRanges(rawLocation) {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetInlinedCalleesRanges, { rawLocation });
  }
  async getMappedLines(rawModuleId, sourceFileURL) {
    return await this.endpoint.sendRequest(
      PrivateAPI.LanguageExtensionPluginCommands.GetMappedLines,
      { rawModuleId, sourceFileURL }
    );
  }
  async evaluate(expression, context, stopId) {
    return await this.endpoint.sendRequest(
      PrivateAPI.LanguageExtensionPluginCommands.FormatValue,
      { expression, context, stopId }
    );
  }
  getProperties(objectId) {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetProperties, { objectId });
  }
  releaseObject(objectId) {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.ReleaseObject, { objectId });
  }
};

// ../../front_end/models/extensions/RecorderExtensionEndpoint.ts
var RecorderExtensionEndpoint_exports = {};
__export(RecorderExtensionEndpoint_exports, {
  RecorderExtensionEndpoint: () => RecorderExtensionEndpoint
});
var RecorderExtensionEndpoint = class extends ExtensionEndpoint {
  name;
  mediaType;
  capabilities;
  #extensionOrigin;
  #recorderPluginManager;
  constructor(name, port, capabilities, extensionOrigin, recorderPluginManager, mediaType) {
    super(port);
    this.name = name;
    this.mediaType = mediaType;
    this.capabilities = capabilities;
    this.#extensionOrigin = extensionOrigin;
    this.#recorderPluginManager = recorderPluginManager;
  }
  getName() {
    return this.name;
  }
  getOrigin() {
    return this.#extensionOrigin;
  }
  getCapabilities() {
    return this.capabilities;
  }
  getMediaType() {
    return this.mediaType;
  }
  handleEvent({ event }) {
    switch (event) {
      case PrivateAPI.RecorderExtensionPluginEvents.UnregisteredRecorderExtensionPlugin: {
        this.disconnect();
        this.#recorderPluginManager.removePlugin(this);
        break;
      }
      default:
        throw new Error(`Unrecognized Recorder extension endpoint event: ${event}`);
    }
  }
  /**
   * In practice, `recording` is a UserFlow[1], but we avoid defining this type on the
   * API in order to prevent dependencies between Chrome and puppeteer. Extensions
   * are responsible for working out potential compatibility issues.
   *
   * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L245
   */
  stringify(recording) {
    return this.sendRequest(PrivateAPI.RecorderExtensionPluginCommands.Stringify, { recording });
  }
  /**
   * In practice, `step` is a Step[1], but we avoid defining this type on the
   * API in order to prevent dependencies between Chrome and puppeteer. Extensions
   * are responsible for working out compatibility issues.
   *
   * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L243
   */
  stringifyStep(step) {
    return this.sendRequest(PrivateAPI.RecorderExtensionPluginCommands.StringifyStep, { step });
  }
  /**
   * In practice, `recording` is a UserFlow[1], but we avoid defining this type on the
   * API in order to prevent dependencies between Chrome and puppeteer. Extensions
   * are responsible for working out potential compatibility issues.
   *
   * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L245
   */
  replay(recording) {
    return this.sendRequest(PrivateAPI.RecorderExtensionPluginCommands.Replay, { recording });
  }
};

// ../../front_end/models/extensions/RecorderPluginManager.ts
var RecorderPluginManager_exports = {};
__export(RecorderPluginManager_exports, {
  Events: () => Events,
  RecorderPluginManager: () => RecorderPluginManager
});
import * as Common from "../../core/common/common.js";
import * as Root from "../../core/root/root.js";
var RecorderPluginManager = class _RecorderPluginManager extends Common.ObjectWrapper.ObjectWrapper {
  #plugins = /* @__PURE__ */ new Set();
  #views = /* @__PURE__ */ new Map();
  static instance(opts) {
    if (!Root.DevToolsContext.globalInstance().has(_RecorderPluginManager) || opts?.forceNew) {
      Root.DevToolsContext.globalInstance().set(_RecorderPluginManager, new _RecorderPluginManager());
    }
    return Root.DevToolsContext.globalInstance().get(_RecorderPluginManager);
  }
  static removeInstance() {
    Root.DevToolsContext.globalInstance().delete(_RecorderPluginManager);
  }
  addPlugin(plugin) {
    this.#plugins.add(plugin);
    this.dispatchEventToListeners("pluginAdded" /* PLUGIN_ADDED */, plugin);
  }
  removePlugin(plugin) {
    this.#plugins.delete(plugin);
    this.dispatchEventToListeners("pluginRemoved" /* PLUGIN_REMOVED */, plugin);
  }
  plugins() {
    return Array.from(this.#plugins.values());
  }
  registerView(descriptor) {
    this.#views.set(descriptor.id, descriptor);
    this.dispatchEventToListeners("viewRegistered" /* VIEW_REGISTERED */, descriptor);
  }
  views() {
    return Array.from(this.#views.values());
  }
  getViewDescriptor(id) {
    return this.#views.get(id);
  }
  showView(id) {
    const descriptor = this.#views.get(id);
    if (!descriptor) {
      throw new Error(`View with id ${id} is not found.`);
    }
    this.dispatchEventToListeners("showViewRequested" /* SHOW_VIEW_REQUESTED */, descriptor);
  }
};
var Events = /* @__PURE__ */ ((Events2) => {
  Events2["PLUGIN_ADDED"] = "pluginAdded";
  Events2["PLUGIN_REMOVED"] = "pluginRemoved";
  Events2["VIEW_REGISTERED"] = "viewRegistered";
  Events2["SHOW_VIEW_REQUESTED"] = "showViewRequested";
  return Events2;
})(Events || {});
export {
  ExtensionAPI_exports as ExtensionAPI,
  ExtensionEndpoint_exports as ExtensionEndpoint,
  HostUrlPattern_exports as HostUrlPattern,
  LanguageExtensionEndpoint_exports as LanguageExtensionEndpoint,
  RecorderExtensionEndpoint_exports as RecorderExtensionEndpoint,
  RecorderPluginManager_exports as RecorderPluginManager
};
//# sourceMappingURL=extensions.js.map
