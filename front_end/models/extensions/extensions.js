var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/extensions/ExtensionAPI.js
var ExtensionAPI_exports = {};
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
        extensionServer.sendRequest({ command: "subscribe", type: this._type });
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
        extensionServer.sendRequest({ command: "unsubscribe", type: this._type });
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
    this.onRequestFinished = new (Constructor(EventSink))("network-request-finished", dispatchRequestEvent);
    defineDeprecatedProperty(this, "network", "onFinished", "onRequestFinished");
    this.onNavigated = new (Constructor(EventSink))(
      "inspected-url-changed"
      /* PrivateAPI.Events.InspectedURLChanged */
    );
  }
  Network.prototype = {
    getHAR: function(callback) {
      function callbackWrapper(response) {
        const result = response;
        const entries = result?.entries || [];
        for (let i = 0; i < entries.length; ++i) {
          entries[i].__proto__ = new (Constructor(Request))(entries[i]._requestId);
          delete entries[i]._requestId;
        }
        callback?.(result);
      }
      extensionServer.sendRequest({
        command: "getHAR"
        /* PrivateAPI.Commands.GetHAR */
      }, callback && callbackWrapper);
    },
    addRequestHeaders: function(headers) {
      extensionServer.sendRequest({ command: "addRequestHeaders", headers, extensionId: window.location.hostname });
    }
  };
  function RequestImpl(id) {
    this._id = id;
  }
  RequestImpl.prototype = {
    getContent: function(callback) {
      function callbackWrapper(response) {
        const { content, encoding } = response;
        callback?.(content, encoding);
      }
      extensionServer.sendRequest({ command: "getRequestContent", id: this._id }, callback && callbackWrapper);
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
    create: function(title, _icon, page, callback) {
      const id = "extension-panel-" + extensionServer.nextObjectId();
      extensionServer.sendRequest({ command: "createPanel", id, title, page }, callback && (() => callback.call(this, new (Constructor(ExtensionPanel))(id))));
    },
    setOpenResourceHandler: function(callback, urlScheme) {
      const hadHandler = extensionServer.hasHandler(
        "open-resource"
        /* PrivateAPI.Events.OpenResource */
      );
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
        extensionServer.unregisterHandler(
          "open-resource"
          /* PrivateAPI.Events.OpenResource */
        );
      } else {
        extensionServer.registerHandler("open-resource", callbackWrapper);
      }
      if (hadHandler === !callback) {
        extensionServer.sendRequest({ command: "setOpenResourceHandler", handlerPresent: Boolean(callback), urlScheme });
      }
    },
    setThemeChangeHandler: function(callback) {
      const hadHandler = extensionServer.hasHandler(
        "host-theme-change"
        /* PrivateAPI.Events.ThemeChange */
      );
      function callbackWrapper(message) {
        const { themeName: themeName2 } = message;
        chrome.devtools.panels.themeName = themeName2;
        callback.call(null, themeName2);
      }
      if (!callback) {
        extensionServer.unregisterHandler(
          "host-theme-change"
          /* PrivateAPI.Events.ThemeChange */
        );
      } else {
        extensionServer.registerHandler("host-theme-change", callbackWrapper);
      }
      if (hadHandler === !callback) {
        extensionServer.sendRequest({ command: "setThemeChangeHandler", handlerPresent: Boolean(callback) });
      }
    },
    openResource: function(url, lineNumber, columnNumber, _callback) {
      const callbackArg = extractCallbackArgument(arguments);
      const columnNumberArg = typeof columnNumber === "number" ? columnNumber : 0;
      extensionServer.sendRequest({ command: "openResource", url, lineNumber, columnNumber: columnNumberArg }, callbackArg);
    },
    get SearchAction() {
      return {
        CancelSearch: "cancelSearch",
        PerformSearch: "performSearch",
        NextSearchResult: "nextSearchResult",
        PreviousSearchResult: "previousSearchResult"
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
      this.onShown = new (Constructor(EventSink))("view-shown-" + id, dispatchShowEvent);
      this.onHidden = new (Constructor(EventSink))("view-hidden," + id);
    }
  }
  function PanelWithSidebarImpl(hostPanelName) {
    ExtensionViewImpl.call(this, null);
    this._hostPanelName = hostPanelName;
    this.onSelectionChanged = new (Constructor(EventSink))("panel-objectSelected-" + hostPanelName);
  }
  PanelWithSidebarImpl.prototype = {
    createSidebarPane: function(title, callback) {
      const id = "extension-sidebar-" + extensionServer.nextObjectId();
      function callbackWrapper() {
        callback?.(new (Constructor(ExtensionSidebarPane))(id));
      }
      extensionServer.sendRequest({ command: "createSidebarPane", panel: this._hostPanelName, id, title }, callback && callbackWrapper);
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
        case "stringify":
          return await plugin.stringify(request.parameters.recording);
        case "stringifyStep":
          return await plugin.stringifyStep(request.parameters.step);
        case "replay":
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
      extensionServer.sendRequest({
        command: "registerRecorderExtensionPlugin",
        pluginName,
        mediaType,
        capabilities,
        port: channel.port2
      }, () => resolve(), [channel.port2]);
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
      port.postMessage({
        event: "unregisteredRecorderExtensionPlugin"
        /* PrivateAPI.RecorderExtensionPluginEvents.UnregisteredRecorderExtensionPlugin */
      });
      port.close();
    },
    createView: async function(title, pagePath) {
      const id = "recorder-extension-view-" + extensionServer.nextObjectId();
      await new Promise((resolve) => {
        extensionServer.sendRequest({ command: "createRecorderView", id, title, pagePath }, resolve);
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
          case "addRawModule":
            return plugin.addRawModule(request.parameters.rawModuleId, request.parameters.symbolsURL, request.parameters.rawModule);
          case "removeRawModule":
            return plugin.removeRawModule(request.parameters.rawModuleId);
          case "sourceLocationToRawLocation":
            return plugin.sourceLocationToRawLocation(request.parameters.sourceLocation);
          case "rawLocationToSourceLocation":
            return plugin.rawLocationToSourceLocation(request.parameters.rawLocation);
          case "getScopeInfo":
            return plugin.getScopeInfo(request.parameters.type);
          case "listVariablesInScope":
            return plugin.listVariablesInScope(request.parameters.rawLocation);
          case "getFunctionInfo":
            return plugin.getFunctionInfo(request.parameters.rawLocation);
          case "getInlinedFunctionRanges":
            return plugin.getInlinedFunctionRanges(request.parameters.rawLocation);
          case "getInlinedCalleesRanges":
            return plugin.getInlinedCalleesRanges(request.parameters.rawLocation);
          case "getMappedLines":
            if ("getMappedLines" in plugin) {
              return plugin.getMappedLines(request.parameters.rawModuleId, request.parameters.sourceFileURL);
            }
            return Promise.resolve(void 0);
          case "formatValue":
            if ("evaluate" in plugin && plugin.evaluate) {
              return plugin.evaluate(request.parameters.expression, request.parameters.context, request.parameters.stopId);
            }
            return Promise.resolve(void 0);
          case "getProperties":
            if ("getProperties" in plugin && plugin.getProperties) {
              return plugin.getProperties(request.parameters.objectId);
            }
            if (!("evaluate" in plugin && plugin.evaluate)) {
              return Promise.resolve(void 0);
            }
            break;
          case "releaseObject":
            if ("releaseObject" in plugin && plugin.releaseObject) {
              return plugin.releaseObject(request.parameters.objectId);
            }
            break;
        }
        throw new Error(`Unknown language plugin method ${request.method}`);
      }
      await new Promise((resolve) => {
        extensionServer.sendRequest({
          command: "registerLanguageExtensionPlugin",
          pluginName,
          port: channel.port2,
          supportedScriptTypes
        }, () => resolve(), [channel.port2]);
      });
    },
    unregisterLanguageExtensionPlugin: async function(plugin) {
      const port = this._plugins.get(plugin);
      if (!port) {
        throw new Error("Tried to unregister a plugin that was not previously registered");
      }
      this._plugins.delete(plugin);
      port.postMessage({
        event: "unregisteredLanguageExtensionPlugin"
        /* PrivateAPI.LanguageExtensionPluginEvents.UnregisteredLanguageExtensionPlugin */
      });
      port.close();
    },
    getWasmLinearMemory: async function(offset, length, stopId) {
      const result = await new Promise((resolve) => extensionServer.sendRequest({ command: "getWasmLinearMemory", offset, length, stopId }, resolve));
      if (Array.isArray(result)) {
        return new Uint8Array(result).buffer;
      }
      return new ArrayBuffer(0);
    },
    getWasmLocal: async function(local, stopId) {
      return await new Promise((resolve) => extensionServer.sendRequest({ command: "getWasmLocal", local, stopId }, resolve));
    },
    getWasmGlobal: async function(global, stopId) {
      return await new Promise((resolve) => extensionServer.sendRequest({ command: "getWasmGlobal", global, stopId }, resolve));
    },
    getWasmOp: async function(op, stopId) {
      return await new Promise((resolve) => extensionServer.sendRequest({ command: "getWasmOp", op, stopId }, resolve));
    },
    reportResourceLoad: function(resourceUrl, status) {
      return new Promise((resolve) => extensionServer.sendRequest({
        command: "reportResourceLoad",
        extensionId: window.location.origin,
        resourceUrl,
        status
      }, resolve));
    }
  };
  function NetworkPanelImpl() {
  }
  NetworkPanelImpl.prototype = {
    show: function(options) {
      return new Promise((resolve) => extensionServer.sendRequest({ command: "showNetworkPanel", filter: options?.filter }, () => resolve()));
    }
  };
  function PerformanceImpl() {
    function dispatchProfilingStartedEvent() {
      this._fire();
    }
    function dispatchProfilingStoppedEvent() {
      this._fire();
    }
    this.onProfilingStarted = new (Constructor(EventSink))("profiling-started-", dispatchProfilingStartedEvent);
    this.onProfilingStopped = new (Constructor(EventSink))("profiling-stopped-", dispatchProfilingStoppedEvent);
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
    this.onSearch = new (Constructor(EventSink))("panel-search-" + id);
  }
  ExtensionPanelImpl.prototype = {
    createStatusBarButton: function(iconPath, tooltipText, disabled) {
      const id = "button-" + extensionServer.nextObjectId();
      extensionServer.sendRequest({
        command: "createToolbarButton",
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
      extensionServer.sendRequest({ command: "showPanel", id: this._id });
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
      extensionServer.sendRequest({ command: "showRecorderView", id: this._id });
    },
    __proto__: ExtensionViewImpl.prototype
  };
  function ExtensionSidebarPaneImpl(id) {
    ExtensionViewImpl.call(this, id);
  }
  ExtensionSidebarPaneImpl.prototype = {
    setHeight: function(height) {
      extensionServer.sendRequest({ command: "setSidebarHeight", id: this._id, height });
    },
    setExpression: function(expression, rootTitle, evaluateOptions, _callback) {
      extensionServer.sendRequest({
        command: "setSidebarContent",
        id: this._id,
        expression,
        rootTitle,
        evaluateOnPage: true,
        evaluateOptions: typeof evaluateOptions === "object" ? evaluateOptions : {}
      }, extractCallbackArgument(arguments));
    },
    setObject: function(jsonObject, rootTitle, callback) {
      extensionServer.sendRequest({
        command: "setSidebarContent",
        id: this._id,
        expression: jsonObject,
        rootTitle
      }, callback);
    },
    setPage: function(page) {
      extensionServer.sendRequest({ command: "setSidebarPage", id: this._id, page });
    },
    __proto__: ExtensionViewImpl.prototype
  };
  function ButtonImpl(id) {
    this._id = id;
    this.onClicked = new (Constructor(EventSink))("button-clicked-" + id);
  }
  ButtonImpl.prototype = {
    update: function(iconPath, tooltipText, disabled) {
      extensionServer.sendRequest({
        command: "updateButton",
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
    this.onResourceAdded = new (Constructor(EventSink))("resource-added", dispatchResourceEvent);
    this.onResourceContentCommitted = new (Constructor(EventSink))("resource-content-committed", dispatchResourceContentEvent);
  }
  InspectedWindow.prototype = {
    reload: function(optionsOrUserAgent) {
      let options = null;
      if (typeof optionsOrUserAgent === "object") {
        options = optionsOrUserAgent;
      } else if (typeof optionsOrUserAgent === "string") {
        options = { userAgent: optionsOrUserAgent };
        console.warn("Passing userAgent as string parameter to inspectedWindow.reload() is deprecated. Use inspectedWindow.reload({ userAgent: value}) instead.");
      }
      extensionServer.sendRequest({ command: "Reload", options });
    },
    eval: function(expression, evaluateOptions) {
      const callback = extractCallbackArgument(arguments);
      function callbackWrapper(result) {
        const { isError, isException, value } = result;
        if (isError || isException) {
          callback?.(void 0, result);
        } else {
          callback?.(value);
        }
      }
      extensionServer.sendRequest({
        command: "evaluateOnInspectedPage",
        expression,
        evaluateOptions: typeof evaluateOptions === "object" ? evaluateOptions : void 0
      }, callback && callbackWrapper);
      return null;
    },
    getResources: function(callback) {
      function wrapResource(resourceData) {
        return new (Constructor(Resource))(resourceData);
      }
      function callbackWrapper(resources) {
        callback?.(resources.map(wrapResource));
      }
      extensionServer.sendRequest({
        command: "getPageResources"
        /* PrivateAPI.Commands.GetPageResources */
      }, callback && callbackWrapper);
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
    getContent: function(callback) {
      function callbackWrapper(response) {
        const { content, encoding } = response;
        callback?.(content, encoding);
      }
      extensionServer.sendRequest({ command: "getResourceContent", url: this._url }, callback && callbackWrapper);
    },
    setContent: function(content, commit, callback) {
      extensionServer.sendRequest({ command: "setResourceContent", url: this._url, content, commit }, callback);
    },
    setFunctionRangesForScript: function(ranges) {
      return new Promise((resolve, reject) => extensionServer.sendRequest({
        command: "setFunctionRangesForScript",
        scriptUrl: this._url,
        ranges
      }, (response) => {
        const result = response;
        if (result.isError) {
          reject(result);
        } else {
          resolve();
        }
      }));
    },
    attachSourceMapURL: function(sourceMapURL) {
      return new Promise((resolve, reject) => extensionServer.sendRequest({ command: "attachSourceMapToResource", contentUrl: this._url, sourceMapURL }, (response) => {
        const result = response;
        if (result.isError) {
          reject(new Error(result.description));
        } else {
          resolve();
        }
      }));
    }
  };
  function getTabId() {
    return inspectedTabId;
  }
  let keyboardEventRequestQueue = [];
  let forwardTimer = null;
  function forwardKeyboardEvent(event) {
    const focused = document.activeElement;
    if (focused) {
      const isInput = focused.nodeName === "INPUT" || focused.nodeName === "TEXTAREA" || focused.isContentEditable;
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
    const num = event.keyCode & 255 | modifiers << 8;
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
      keyCode: event.keyCode
    };
    keyboardEventRequestQueue.push(requestPayload);
    if (!forwardTimer) {
      forwardTimer = window.setTimeout(forwardEventQueue, 0);
    }
  }
  function forwardEventQueue() {
    forwardTimer = null;
    extensionServer.sendRequest({ command: "_forwardKeyboardEvent", entries: keyboardEventRequestQueue });
    keyboardEventRequestQueue = [];
  }
  document.addEventListener("keydown", forwardKeyboardEvent, false);
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

// gen/front_end/models/extensions/ExtensionEndpoint.js
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

// gen/front_end/models/extensions/HostUrlPattern.js
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
    asUrl = new URL(pattern.startsWith(SUBDOMAIN_WILDCARD) ? `http://${pattern.substr(SUBDOMAIN_WILDCARD.length)}` : `http://${pattern}`);
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
  pattern;
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
  constructor(pattern) {
    this.pattern = pattern;
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

// gen/front_end/models/extensions/LanguageExtensionEndpoint.js
var LanguageExtensionEndpoint_exports = {};
__export(LanguageExtensionEndpoint_exports, {
  LanguageExtensionEndpoint: () => LanguageExtensionEndpoint
});
import * as Bindings from "./../bindings/bindings.js";
var LanguageExtensionEndpointImpl = class extends ExtensionEndpoint {
  plugin;
  constructor(plugin, port) {
    super(port);
    this.plugin = plugin;
  }
  handleEvent({ event }) {
    switch (event) {
      case "unregisteredLanguageExtensionPlugin": {
        this.disconnect();
        const { pluginManager } = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
        pluginManager.removePlugin(this.plugin);
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
  constructor(allowFileAccess, extensionOrigin, name, supportedScriptTypes, port) {
    this.name = name;
    this.extensionOrigin = extensionOrigin;
    this.supportedScriptTypes = supportedScriptTypes;
    this.endpoint = new LanguageExtensionEndpointImpl(this, port);
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
    return this.endpoint.sendRequest("addRawModule", { rawModuleId, symbolsURL, rawModule });
  }
  /**
   * Notifies the plugin that a script is removed.
   */
  removeRawModule(rawModuleId) {
    return this.endpoint.sendRequest("removeRawModule", { rawModuleId });
  }
  /**
   * Find locations in raw modules from a location in a source file
   */
  sourceLocationToRawLocation(sourceLocation) {
    return this.endpoint.sendRequest("sourceLocationToRawLocation", { sourceLocation });
  }
  /**
   * Find locations in source files from a location in a raw module
   */
  rawLocationToSourceLocation(rawLocation) {
    return this.endpoint.sendRequest("rawLocationToSourceLocation", { rawLocation });
  }
  getScopeInfo(type) {
    return this.endpoint.sendRequest("getScopeInfo", { type });
  }
  /**
   * List all variables in lexical scope at a given location in a raw module
   */
  listVariablesInScope(rawLocation) {
    return this.endpoint.sendRequest("listVariablesInScope", { rawLocation });
  }
  /**
   * List all function names (including inlined frames) at location
   */
  getFunctionInfo(rawLocation) {
    return this.endpoint.sendRequest("getFunctionInfo", { rawLocation });
  }
  /**
   * Find locations in raw modules corresponding to the inline function
   *  that rawLocation is in.
   */
  getInlinedFunctionRanges(rawLocation) {
    return this.endpoint.sendRequest("getInlinedFunctionRanges", { rawLocation });
  }
  /**
   * Find locations in raw modules corresponding to inline functions
   *  called by the function or inline frame that rawLocation is in.
   */
  getInlinedCalleesRanges(rawLocation) {
    return this.endpoint.sendRequest("getInlinedCalleesRanges", { rawLocation });
  }
  async getMappedLines(rawModuleId, sourceFileURL) {
    return await this.endpoint.sendRequest("getMappedLines", { rawModuleId, sourceFileURL });
  }
  async evaluate(expression, context, stopId) {
    return await this.endpoint.sendRequest("formatValue", { expression, context, stopId });
  }
  getProperties(objectId) {
    return this.endpoint.sendRequest("getProperties", { objectId });
  }
  releaseObject(objectId) {
    return this.endpoint.sendRequest("releaseObject", { objectId });
  }
};

// gen/front_end/models/extensions/RecorderExtensionEndpoint.js
var RecorderExtensionEndpoint_exports = {};
__export(RecorderExtensionEndpoint_exports, {
  RecorderExtensionEndpoint: () => RecorderExtensionEndpoint
});

// gen/front_end/models/extensions/RecorderPluginManager.js
var RecorderPluginManager_exports = {};
__export(RecorderPluginManager_exports, {
  RecorderPluginManager: () => RecorderPluginManager
});
import * as Common from "./../../core/common/common.js";
var instance = null;
var RecorderPluginManager = class _RecorderPluginManager extends Common.ObjectWrapper.ObjectWrapper {
  #plugins = /* @__PURE__ */ new Set();
  #views = /* @__PURE__ */ new Map();
  static instance() {
    if (!instance) {
      instance = new _RecorderPluginManager();
    }
    return instance;
  }
  addPlugin(plugin) {
    this.#plugins.add(plugin);
    this.dispatchEventToListeners("pluginAdded", plugin);
  }
  removePlugin(plugin) {
    this.#plugins.delete(plugin);
    this.dispatchEventToListeners("pluginRemoved", plugin);
  }
  plugins() {
    return Array.from(this.#plugins.values());
  }
  registerView(descriptor) {
    this.#views.set(descriptor.id, descriptor);
    this.dispatchEventToListeners("viewRegistered", descriptor);
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
    this.dispatchEventToListeners("showViewRequested", descriptor);
  }
};

// gen/front_end/models/extensions/RecorderExtensionEndpoint.js
var RecorderExtensionEndpoint = class extends ExtensionEndpoint {
  name;
  mediaType;
  capabilities;
  constructor(name, port, capabilities, mediaType) {
    super(port);
    this.name = name;
    this.mediaType = mediaType;
    this.capabilities = capabilities;
  }
  getName() {
    return this.name;
  }
  getCapabilities() {
    return this.capabilities;
  }
  getMediaType() {
    return this.mediaType;
  }
  handleEvent({ event }) {
    switch (event) {
      case "unregisteredRecorderExtensionPlugin": {
        this.disconnect();
        RecorderPluginManager.instance().removePlugin(this);
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
    return this.sendRequest("stringify", { recording });
  }
  /**
   * In practice, `step` is a Step[1], but we avoid defining this type on the
   * API in order to prevent dependencies between Chrome and puppeteer. Extensions
   * are responsible for working out compatibility issues.
   *
   * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L243
   */
  stringifyStep(step) {
    return this.sendRequest("stringifyStep", { step });
  }
  /**
   * In practice, `recording` is a UserFlow[1], but we avoid defining this type on the
   * API in order to prevent dependencies between Chrome and puppeteer. Extensions
   * are responsible for working out potential compatibility issues.
   *
   * [1]: https://github.com/puppeteer/replay/blob/main/src/Schema.ts#L245
   */
  replay(recording) {
    return this.sendRequest("replay", { recording });
  }
};
export {
  ExtensionAPI_exports as ExtensionAPI,
  ExtensionEndpoint_exports as ExtensionEndpoint,
  HostUrlPattern_exports as HostUrlPattern,
  LanguageExtensionEndpoint_exports as LanguageExtensionEndpoint,
  RecorderExtensionEndpoint_exports as RecorderExtensionEndpoint,
  RecorderPluginManager_exports as RecorderPluginManager
};
//# sourceMappingURL=extensions.js.map
