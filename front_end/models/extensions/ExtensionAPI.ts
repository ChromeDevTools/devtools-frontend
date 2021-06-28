/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

import type * as PublicAPI from '../../../extension-api/ExtensionAPI'; // eslint-disable-line rulesdir/es_modules_import

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/naming-convention,@typescript-eslint/no-non-null-assertion */
export namespace PrivateAPI {
  export namespace Panels {
    export const enum SearchAction {
      CancelSearch = 'cancelSearch',
      PerformSearch = 'performSearch',
      NextSearchResult = 'nextSearchResult',
      PreviousSearchResult = 'previousSearchResult',
    }
  }

  export const enum Events {
    ButtonClicked = 'button-clicked-',
    PanelObjectSelected = 'panel-objectSelected-',
    InspectedURLChanged = 'inspected-url-changed',
    NetworkRequestFinished = 'network-request-finished',
    OpenResource = 'open-resource',
    PanelSearch = 'panel-search-',
    RecordingStarted = 'trace-recording-started-',
    RecordingStopped = 'trace-recording-stopped-',
    ResourceAdded = 'resource-added',
    ResourceContentCommitted = 'resource-content-committed',
    ViewShown = 'view-shown-',
    ViewHidden = 'view-hidden,',
  }

  export const enum Commands {
    AddRequestHeaders = 'addRequestHeaders',
    AddTraceProvider = 'addTraceProvider',
    ApplyStyleSheet = 'applyStyleSheet',
    CompleteTraceSession = 'completeTra.eSession',
    CreatePanel = 'createPanel',
    CreateSidebarPane = 'createSidebarPane',
    CreateToolbarButton = 'createToolbarButton',
    EvaluateOnInspectedPage = 'evaluateOnInspectedPage',
    ForwardKeyboardEvent = '_forwardKeyboardEvent',
    GetHAR = 'getHAR',
    GetPageResources = 'getPageResources',
    GetRequestContent = 'getRequestContent',
    GetResourceContent = 'getResourceContent',
    OpenResource = 'openResource',
    Reload = 'Reload',
    Subscribe = 'subscribe',
    SetOpenResourceHandler = 'setOpenResourceHandler',
    SetResourceContent = 'setResourceContent',
    SetSidebarContent = 'setSidebarContent',
    SetSidebarHeight = 'setSidebarHeight',
    SetSidebarPage = 'setSidebarPage',
    ShowPanel = 'showPanel',
    Unsubscribe = 'unsubscribe',
    UpdateButton = 'updateButton',
    RegisterLanguageExtensionPlugin = 'registerLanguageExtensionPlugin',
  }

  export const enum LanguageExtensionPluginCommands {
    AddRawModule = 'addRawModule',
    RemoveRawModule = 'removeRawModule',
    SourceLocationToRawLocation = 'sourceLocationToRawLocation',
    RawLocationToSourceLocation = 'rawLocationToSourceLocation',
    GetScopeInfo = 'getScopeInfo',
    ListVariablesInScope = 'listVariablesInScope',
    GetTypeInfo = 'getTypeInfo',
    GetFormatter = 'getFormatter',
    GetInspectableAddress = 'getInspectableAddress',
    GetFunctionInfo = 'getFunctionInfo',
    GetInlinedFunctionRanges = 'getInlinedFunctionRanges',
    GetInlinedCalleesRanges = 'getInlinedCalleesRanges',
    GetMappedLines = 'getMappedLines',
  }

  export const enum LanguageExtensionPluginEvents {
    UnregisteredLanguageExtensionPlugin = 'unregisteredLanguageExtensionPlugin',
  }

  export interface EvaluateOptions {
    frameURL?: string;
    useContentScriptContext?: boolean;
    scriptExecutionContext?: string;
  }

  type RegisterLanguageExtensionPluginRequest = {
    command: Commands.RegisterLanguageExtensionPlugin,
    pluginName: string,
    port: MessagePort,
    supportedScriptTypes: PublicAPI.Chrome.DevTools.SupportedScriptTypes,
  };
  type SubscribeRequest = {command: Commands.Subscribe, type: string};
  type UnsubscribeRequest = {command: Commands.Unsubscribe, type: string};
  type AddRequestHeadersRequest = {
    command: Commands.AddRequestHeaders,
    extensionId: string,
    headers: {[key: string]: string},
  };
  type ApplyStyleSheetRequest = {command: Commands.ApplyStyleSheet, styleSheet: string};
  type CreatePanelRequest = {command: Commands.CreatePanel, id: string, title: string, page: string};
  type ShowPanelRequest = {command: Commands.ShowPanel, id: string};
  type CreateToolbarButtonRequest = {
    command: Commands.CreateToolbarButton,
    id: string,
    icon: string,
    panel: string,
    tooltip?: string,
    disabled?: boolean,
  };
  type UpdateButtonRequest =
      {command: Commands.UpdateButton, id: string, icon?: string, tooltip?: string, disabled?: boolean};
  type CompleteTraceSessionRequest =
      {command: Commands.CompleteTraceSession, id: string, url: string, timeOffset: number};
  type CreateSidebarPaneRequest = {command: Commands.CreateSidebarPane, id: string, panel: string, title: string};
  type SetSidebarHeightRequest = {command: Commands.SetSidebarHeight, id: string, height: string};
  type SetSidebarContentRequest = {
    command: Commands.SetSidebarContent,
    id: string,
    evaluateOnPage?: boolean, expression: string,
    rootTitle?: string,
    evaluateOptions?: EvaluateOptions,
  };
  type SetSidebarPageRequest = {command: Commands.SetSidebarPage, id: string, page: string};
  type OpenResourceRequest = {command: Commands.OpenResource, url: string, lineNumber: number};
  type SetOpenResourceHandlerRequest = {command: Commands.SetOpenResourceHandler, handlerPresent: boolean};
  type ReloadRequest = {
    command: Commands.Reload,
    options: null|{
      userAgent?: string,
      injectedScript?: string,
      ignoreCache?: boolean,
    },
  };
  type EvaluateOnInspectedPageRequest = {
    command: Commands.EvaluateOnInspectedPage,
    expression: string,
    evaluateOptions?: EvaluateOptions,
  };
  type GetRequestContentRequest = {command: Commands.GetRequestContent, id: number};
  type GetResourceContentRequest = {command: Commands.GetResourceContent, url: string};
  type SetResourceContentRequest =
      {command: Commands.SetResourceContent, url: string, content: string, commit: boolean};
  type AddTraceProviderRequest =
      {command: Commands.AddTraceProvider, id: string, categoryName: string, categoryTooltip: string};
  type ForwardKeyboardEventRequest = {
    command: Commands.ForwardKeyboardEvent,
    entries: Array<KeyboardEventInit&{eventType: string}>,
  };
  type GetHARRequest = {command: Commands.GetHAR};
  type GetPageResourcesRequest = {command: Commands.GetPageResources};

  export type ServerRequests = RegisterLanguageExtensionPluginRequest|SubscribeRequest|UnsubscribeRequest|
      AddRequestHeadersRequest|ApplyStyleSheetRequest|CreatePanelRequest|ShowPanelRequest|CreateToolbarButtonRequest|
      UpdateButtonRequest|CompleteTraceSessionRequest|CreateSidebarPaneRequest|SetSidebarHeightRequest|
      SetSidebarContentRequest|SetSidebarPageRequest|OpenResourceRequest|SetOpenResourceHandlerRequest|ReloadRequest|
      EvaluateOnInspectedPageRequest|GetRequestContentRequest|GetResourceContentRequest|SetResourceContentRequest|
      AddTraceProviderRequest|ForwardKeyboardEventRequest|GetHARRequest|GetPageResourcesRequest;
  export type ExtensionServerRequestMessage = PrivateAPI.ServerRequests&{requestId?: number};
}

declare global {
  interface Window {
    injectedExtensionAPI:
        (extensionInfo: ExtensionDescriptor, inspectedTabId: string, themeName: string, keysToForward: number[],
         testHook:
             (extensionServer: APIImpl.ExtensionServerClient, extensionAPI: APIImpl.InspectorExtensionAPI) => unknown,
         injectedScriptId: number) => void;
    buildExtensionAPIInjectedScript(
        extensionInfo: ExtensionDescriptor, inspectedTabId: string, themeName: string, keysToForward: number[],
        testHook: undefined|((extensionServer: unknown, extensionAPI: unknown) => unknown)): string;
    chrome: PublicAPI.Chrome.DevTools.Chrome;
    webInspector?: APIImpl.InspectorExtensionAPI;
  }
}

export type ExtensionDescriptor = {
  startPage: string,
  name: string,
  exposeExperimentalAPIs: boolean,
  exposeWebInspectorNamespace?: boolean,
};

namespace APIImpl {
  export interface InspectorExtensionAPI {
    languageServices: PublicAPI.Chrome.DevTools.LanguageExtensions;
    network: PublicAPI.Chrome.DevTools.Network;
    panels: PublicAPI.Chrome.DevTools.Panels;
    inspectedWindow: PublicAPI.Chrome.DevTools.InspectedWindow;
  }

  export interface ExtensionServerClient {
    _callbacks: {[key: string]: (response: unknown) => unknown};
    _handlers: {[key: string]: (request: {arguments: unknown[]}) => unknown};
    _lastRequestId: number;
    _lastObjectId: number;
    _port: MessagePort;

    _onCallback(request: unknown): void;
    _onMessage(event: MessageEvent<{command: string, requestId: number, arguments: unknown[]}>): void;
    _registerCallback(callback: (response: unknown) => unknown): number;
    registerHandler(command: string, handler: (request: {arguments: unknown[]}) => unknown): void;
    unregisterHandler(command: string): void;
    hasHandler(command: string): boolean;
    sendRequest(request: PrivateAPI.ServerRequests, callback?: ((response: unknown) => unknown), transfers?: unknown[]):
        void;
    nextObjectId(): string;
  }

  // We cannot use the stronger `unknown` type in place of `any` in the following type definition. The type is used as
  // the right-hand side of `extends` in a few places, which doesn't narrow `unknown`. Without narrowing, overload
  // resolution and meaningful type inference of arguments break, for example.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Callable = (...args: any) => any;

  export interface EventSink<ListenerT extends Callable> extends PublicAPI.Chrome.DevTools.EventSink<ListenerT> {
    _type: string;
    _listeners: ListenerT[];
    _customDispatch: undefined|((this: EventSink<ListenerT>, request: {arguments: unknown[]}) => unknown);

    _fire(..._vararg: Parameters<ListenerT>): void;
    _dispatch(request: {arguments: unknown[]}): void;
  }
}

self.injectedExtensionAPI = function(
    extensionInfo: ExtensionDescriptor, inspectedTabId: string, themeName: string, keysToForward: number[],
    testHook: (extensionServer: APIImpl.ExtensionServerClient, extensionAPI: APIImpl.InspectorExtensionAPI) => unknown,
    injectedScriptId: number): void {
  const keysToForwardSet = new Set<number>(keysToForward);
  const chrome = window.chrome || {};

  const devtools_descriptor = Object.getOwnPropertyDescriptor(chrome, 'devtools');
  if (devtools_descriptor) {
    return;
  }
  let userAction = false;

  // Here and below, all constructors are private to API implementation.
  // For a public type Foo, if internal fields are present, these are on
  // a private FooImpl type, an instance of FooImpl is used in a closure
  // by Foo consutrctor to re-bind publicly exported members to an instance
  // of Foo.

  function EventSinkImpl<ListenerT extends APIImpl.Callable>(
      this: APIImpl.EventSink<ListenerT>, type: string,
      customDispatch?: (this: APIImpl.EventSink<ListenerT>, request: {arguments: unknown[]}) => unknown): void {
    this._type = type;
    this._listeners = [];
    this._customDispatch = customDispatch;
  }

  EventSinkImpl.prototype = {
    addListener: function<ListenerT extends APIImpl.Callable>(this: APIImpl.EventSink<ListenerT>, callback: ListenerT):
        void {
          if (typeof callback !== 'function') {
            throw 'addListener: callback is not a function';
          }
          if (this._listeners.length === 0) {
            extensionServer.sendRequest({command: PrivateAPI.Commands.Subscribe, type: this._type});
          }
          this._listeners.push(callback);
          extensionServer.registerHandler('notify-' + this._type, this._dispatch.bind(this));
        },


    removeListener: function<ListenerT extends APIImpl.Callable>(
        this: APIImpl.EventSink<ListenerT>, callback: ListenerT): void {
      const listeners = this._listeners;

      for (let i = 0; i < listeners.length; ++i) {
        if (listeners[i] === callback) {
          listeners.splice(i, 1);
          break;
        }
      }
      if (this._listeners.length === 0) {
        extensionServer.sendRequest({command: PrivateAPI.Commands.Unsubscribe, type: this._type});
      }
    },


    _fire: function<ListenerT extends APIImpl.Callable>(
        this: APIImpl.EventSink<ListenerT>, ..._vararg: Parameters<ListenerT>): void {
      const listeners = this._listeners.slice();
      for (let i = 0; i < listeners.length; ++i) {
        listeners[i].apply(null, Array.from(arguments));
      }
    },


    _dispatch: function<ListenerT extends APIImpl.Callable>(
        this: APIImpl.EventSink<ListenerT>, request: {arguments: unknown[]}): void {
      if (this._customDispatch) {
        this._customDispatch.call(this, request);
      } else {
        this._fire.apply(this, request.arguments as Parameters<ListenerT>);
      }
    },
  };

  function Constructor<NewT extends APIImpl.Callable>(ctor: NewT): new (...args: Parameters<NewT>) =>
      ThisParameterType<NewT> {
    return ctor as unknown as new (...args: Parameters<NewT>) => ThisParameterType<NewT>;
  }

  /**
   * @constructor
   */

  function InspectorExtensionAPI(this: APIImpl.InspectorExtensionAPI): void {
    // @ts-ignore
    this.inspectedWindow = new InspectedWindow();
    // @ts-ignore
    this.panels = new Panels();
    // @ts-ignore
    this.network = new Network();
    // @ts-ignore
    this.timeline = new Timeline();
    // @ts-ignore
    this.languageServices = new LanguageServicesAPI();
    defineDeprecatedProperty(this, 'webInspector', 'resources', 'network');
  }

  /**
   * @constructor
   */

  function Network(this: any): void {
    function dispatchRequestEvent(this: any, message: any): void {
      const request = message.arguments[1];
      // @ts-ignore
      request.__proto__ = new Request(message.arguments[0]);
      this._fire(request);
    }
    // @ts-ignore
    this.onRequestFinished = new EventSink(PrivateAPI.Events.NetworkRequestFinished, dispatchRequestEvent);
    defineDeprecatedProperty(this, 'network', 'onFinished', 'onRequestFinished');
    // @ts-ignore
    this.onNavigated = new EventSink(PrivateAPI.Events.InspectedURLChanged);
  }

  Network.prototype = {
    getHAR: function(callback: any): void {
      function callbackWrapper(result: any): void {
        const entries = (result && result.entries) || [];
        for (let i = 0; i < entries.length; ++i) {
          // @ts-ignore
          entries[i].__proto__ = new Request(entries[i]._requestId);
          delete entries[i]._requestId;
        }
        callback(result);
      }
      extensionServer.sendRequest({command: PrivateAPI.Commands.GetHAR}, callback && callbackWrapper);
    },

    addRequestHeaders: function(headers: any): void {
      extensionServer.sendRequest(
          {command: PrivateAPI.Commands.AddRequestHeaders, headers: headers, extensionId: window.location.hostname});
    },
  };

  function RequestImpl(this: any, id: any): void {
    this._id = id;
  }

  RequestImpl.prototype = {
    getContent: function(callback: any): void {
      function callbackWrapper(response: any): void {
        callback(response.content, response.encoding);
      }
      extensionServer.sendRequest(
          {command: PrivateAPI.Commands.GetRequestContent, id: this._id}, callback && callbackWrapper);
    },
  };

  /**
   * @constructor
   */
  function Panels(this: any): void {
    const panels: {[key: string]: any} = {
      elements: new ElementsPanel(),
      sources: new SourcesPanel(),
    };

    function panelGetter(name: any): any {
      return panels[name];
    }
    for (const panel in panels) {
      Object.defineProperty(this, panel, {get: panelGetter.bind(null, panel), enumerable: true});
    }
    this.applyStyleSheet = function(styleSheet: any): void {
      extensionServer.sendRequest({command: PrivateAPI.Commands.ApplyStyleSheet, styleSheet: styleSheet});
    };
  }

  Panels.prototype = {
    create: function(title: any, icon: any, page: any, callback: any): void {
      const id = 'extension-panel-' + extensionServer.nextObjectId();
      const request = {command: PrivateAPI.Commands.CreatePanel, id: id, title: title, icon: icon, page: page};
      // @ts-ignore
      extensionServer.sendRequest(request, callback && callback.bind(this, new ExtensionPanel(id)));
    },

    setOpenResourceHandler: function(callback: any): void {
      const hadHandler = extensionServer.hasHandler(PrivateAPI.Events.OpenResource);

      function callbackWrapper(message: any): void {
        // Allow the panel to show itself when handling the event.
        userAction = true;
        try {
          // @ts-ignore
          callback.call(null, new Resource(message.resource), message.lineNumber);
        } finally {
          userAction = false;
        }
      }

      if (!callback) {
        extensionServer.unregisterHandler(PrivateAPI.Events.OpenResource);
      } else {
        extensionServer.registerHandler(PrivateAPI.Events.OpenResource, callbackWrapper);
      }

      // Only send command if we either removed an existing handler or added handler and had none before.
      if (hadHandler === !callback) {
        extensionServer.sendRequest(
            {command: PrivateAPI.Commands.SetOpenResourceHandler, 'handlerPresent': Boolean(callback)});
      }
    },

    openResource: function(url: any, lineNumber: any, callback: any): void {
      extensionServer.sendRequest(
          {command: PrivateAPI.Commands.OpenResource, 'url': url, 'lineNumber': lineNumber}, callback);
    },

    get SearchAction(): any {
      return {
        CancelSearch: PrivateAPI.Panels.SearchAction.CancelSearch,
        PerformSearch: PrivateAPI.Panels.SearchAction.PerformSearch,
        NextSearchResult: PrivateAPI.Panels.SearchAction.NextSearchResult,
        PreviousSearchResult: PrivateAPI.Panels.SearchAction.PreviousSearchResult,
      };
    },
  };

  /**
   * @constructor
   */
  function ExtensionViewImpl(this: any, id: any): void {
    this._id = id;

    function dispatchShowEvent(this: any, message: any): void {
      const frameIndex = message.arguments[0];
      if (typeof frameIndex === 'number') {
        this._fire(window.parent.frames[frameIndex]);
      } else {
        this._fire();
      }
    }

    if (id) {
      // @ts-ignore
      this.onShown = new EventSink(PrivateAPI.Events.ViewShown + id, dispatchShowEvent);
      // @ts-ignore
      this.onHidden = new EventSink(PrivateAPI.Events.ViewHidden + id);
    }
  }

  /**
   * @constructor
   * @extends {ExtensionViewImpl}
   */
  function PanelWithSidebarImpl(this: any, hostPanelName: string): void {
    ExtensionViewImpl.call(this, null);
    this._hostPanelName = hostPanelName;
    // @ts-ignore
    this.onSelectionChanged = new EventSink(PrivateAPI.Events.PanelObjectSelected + hostPanelName);
  }

  PanelWithSidebarImpl.prototype = {
    createSidebarPane: function(title: any, callback: any): void {
      const id = 'extension-sidebar-' + extensionServer.nextObjectId();
      function callbackWrapper(): void {
        // @ts-ignore
        callback(new ExtensionSidebarPane(id));
      }
      extensionServer.sendRequest(
          {command: PrivateAPI.Commands.CreateSidebarPane, panel: this._hostPanelName, id: id, title: title},
          callback && callbackWrapper);
    },

    __proto__: ExtensionViewImpl.prototype,
  };

  /**
   * @constructor
   */
  function LanguageServicesAPIImpl(this: any): void {
    /** @type {!Map<*, !MessagePort>} */
    this._plugins = new Map();
  }

  LanguageServicesAPIImpl.prototype = {
    registerLanguageExtensionPlugin: async function(
        plugin: any, pluginName: string, supportedScriptTypes: PublicAPI.Chrome.DevTools.SupportedScriptTypes):
        Promise<void> {
          if (this._plugins.has(plugin)) {
            throw new Error(`Tried to register plugin '${pluginName}' twice`);
          }
          const channel = new MessageChannel();
          const port = channel.port1;
          this._plugins.set(plugin, port);
          port.onmessage = ({data: {requestId, method, parameters}}: MessageEvent<any>): void => {
            console.time(`${requestId}: ${method}`);
            dispatchMethodCall(method, parameters)
                .then(result => port.postMessage({requestId, result}))
                .catch(error => port.postMessage({requestId, error: {message: error.message}}))
                .finally(() => console.timeEnd(`${requestId}: ${method}`));
          };

          function dispatchMethodCall(method: string, parameters: any): Promise<any> {
            switch (method) {
              case PrivateAPI.LanguageExtensionPluginCommands.AddRawModule:
                return plugin.addRawModule(parameters.rawModuleId, parameters.symbolsURL, parameters.rawModule);
              case PrivateAPI.LanguageExtensionPluginCommands.RemoveRawModule:
                return plugin.removeRawModule(parameters.rawModuleId);
              case PrivateAPI.LanguageExtensionPluginCommands.SourceLocationToRawLocation:
                return plugin.sourceLocationToRawLocation(parameters.sourceLocation);
              case PrivateAPI.LanguageExtensionPluginCommands.RawLocationToSourceLocation:
                return plugin.rawLocationToSourceLocation(parameters.rawLocation);
              case PrivateAPI.LanguageExtensionPluginCommands.GetScopeInfo:
                return plugin.getScopeInfo(parameters.type);
              case PrivateAPI.LanguageExtensionPluginCommands.ListVariablesInScope:
                return plugin.listVariablesInScope(parameters.rawLocation);
              case PrivateAPI.LanguageExtensionPluginCommands.GetTypeInfo:
                return plugin.getTypeInfo(parameters.expression, parameters.context);
              case PrivateAPI.LanguageExtensionPluginCommands.GetFormatter:
                return plugin.getFormatter(parameters.expressionOrField, parameters.context);
              case PrivateAPI.LanguageExtensionPluginCommands.GetInspectableAddress:
                if ('getInspectableAddress' in plugin) {
                  return plugin.getInspectableAddress(parameters.field);
                }
                return Promise.resolve({js: ''});
              case PrivateAPI.LanguageExtensionPluginCommands.GetFunctionInfo:
                return plugin.getFunctionInfo(parameters.rawLocation);
              case PrivateAPI.LanguageExtensionPluginCommands.GetInlinedFunctionRanges:
                return plugin.getInlinedFunctionRanges(parameters.rawLocation);
              case PrivateAPI.LanguageExtensionPluginCommands.GetInlinedCalleesRanges:
                return plugin.getInlinedCalleesRanges(parameters.rawLocation);
              case PrivateAPI.LanguageExtensionPluginCommands.GetMappedLines:
                if ('getMappedLines' in plugin) {
                  return plugin.getMappedLines(parameters.rawModuleId, parameters.sourceFileURL);
                }
                return Promise.resolve(undefined);
            }
            throw new Error(`Unknown language plugin method ${method}`);
          }

          await new Promise<void>(resolve => {
            extensionServer.sendRequest(
                {
                  command: PrivateAPI.Commands.RegisterLanguageExtensionPlugin,
                  pluginName,
                  port: channel.port2,
                  supportedScriptTypes,
                },
                () => resolve(), [channel.port2]);
          });
        },

    unregisterLanguageExtensionPlugin: async function(plugin: any): Promise<void> {
      const port = this._plugins.get(plugin);
      if (!port) {
        throw new Error('Tried to unregister a plugin that was not previously registered');
      }
      this._plugins.delete(plugin);
      port.postMessage({event: PrivateAPI.LanguageExtensionPluginEvents.UnregisteredLanguageExtensionPlugin});
      port.close();
    },
  };

  function declareInterfaceClass<ImplT extends APIImpl.Callable>(implConstructor: ImplT): (
      this: ThisParameterType<ImplT>, ...args: Parameters<ImplT>) => void {
    return function(this: ThisParameterType<ImplT>, ...args: Parameters<ImplT>): void {
      const impl = {__proto__: implConstructor.prototype};
      implConstructor.apply(impl, args);
      populateInterfaceClass(this as {[key: string]: unknown}, impl);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function defineDeprecatedProperty(object: any, className: string, oldName: string, newName: string): void {
    let warningGiven = false;
    function getter(): unknown {
      if (!warningGiven) {
        console.warn(className + '.' + oldName + ' is deprecated. Use ' + className + '.' + newName + ' instead');
        warningGiven = true;
      }
      return object[newName];
    }
    object.__defineGetter__(oldName, getter);
  }

  function extractCallbackArgument(args: IArguments): ((...args: unknown[]) => unknown)|undefined {
    const lastArgument = args[args.length - 1];
    return typeof lastArgument === 'function' ? lastArgument as (...args: unknown[]) => unknown : undefined;
  }

  const LanguageServicesAPI = declareInterfaceClass(LanguageServicesAPIImpl);
  const Button = declareInterfaceClass(ButtonImpl);
  const EventSink = declareInterfaceClass(EventSinkImpl);
  const ExtensionPanel = declareInterfaceClass(ExtensionPanelImpl);
  const ExtensionSidebarPane = declareInterfaceClass(ExtensionSidebarPaneImpl);
  /**
   * @constructor
   * @param {string} hostPanelName
   */
  const PanelWithSidebarClass = declareInterfaceClass(PanelWithSidebarImpl);
  const Request = declareInterfaceClass(RequestImpl);
  const Resource = declareInterfaceClass(ResourceImpl);
  const TraceSession = declareInterfaceClass(TraceSessionImpl);

  // @ts-ignore
  class ElementsPanel extends PanelWithSidebarClass {
    constructor() {
      super('elements');
    }
  }

  // @ts-ignore
  class SourcesPanel extends PanelWithSidebarClass {
    constructor() {
      super('sources');
    }
  }

  /**
   * @constructor
   * @extends {ExtensionViewImpl}
   */
  function ExtensionPanelImpl(this: any, id: any): void {
    ExtensionViewImpl.call(this, id);
    // @ts-ignore
    this.onSearch = new EventSink(PrivateAPI.Events.PanelSearch + id);
  }

  ExtensionPanelImpl.prototype = {
    createStatusBarButton: function(iconPath: any, tooltipText: any, disabled: any): Object {
      const id = 'button-' + extensionServer.nextObjectId();
      extensionServer.sendRequest({
        command: PrivateAPI.Commands.CreateToolbarButton,
        panel: this._id,
        id: id,
        icon: iconPath,
        tooltip: tooltipText,
        disabled: Boolean(disabled),
      });
      // @ts-ignore
      return new Button(id);
    },

    show: function(): void {
      if (!userAction) {
        return;
      }

      extensionServer.sendRequest({command: PrivateAPI.Commands.ShowPanel, id: this._id});
    },

    __proto__: ExtensionViewImpl.prototype,
  };

  /**
   * @constructor
   * @extends {ExtensionViewImpl}
   */
  function ExtensionSidebarPaneImpl(this: any, id: any): void {
    ExtensionViewImpl.call(this, id);
  }

  ExtensionSidebarPaneImpl.prototype = {
    setHeight: function(height: any): void {
      extensionServer.sendRequest({command: PrivateAPI.Commands.SetSidebarHeight, id: this._id, height: height});
    },

    setExpression: function(expression: any, rootTitle: any, evaluateOptions: any): void {
      extensionServer.sendRequest(
          {
            command: PrivateAPI.Commands.SetSidebarContent,
            id: this._id,
            expression: expression,
            rootTitle: rootTitle,
            evaluateOnPage: true,
            evaluateOptions: (typeof evaluateOptions === 'object' ? evaluateOptions : undefined),
          },
          extractCallbackArgument(arguments));
    },

    setObject: function(jsonObject: any, rootTitle: any, callback: any): void {
      extensionServer.sendRequest(
          {command: PrivateAPI.Commands.SetSidebarContent, id: this._id, expression: jsonObject, rootTitle: rootTitle},
          callback);
    },

    setPage: function(page: any): void {
      extensionServer.sendRequest({command: PrivateAPI.Commands.SetSidebarPage, id: this._id, page: page});
    },

    __proto__: ExtensionViewImpl.prototype,
  };

  /**
   * @constructor
   */
  function ButtonImpl(this: any, id: any): void {
    this._id = id;
    // @ts-ignore
    this.onClicked = new EventSink(PrivateAPI.Events.ButtonClicked + id);
  }

  ButtonImpl.prototype = {
    update: function(iconPath: any, tooltipText: any, disabled: any): void {
      extensionServer.sendRequest({
        command: PrivateAPI.Commands.UpdateButton,
        id: this._id,
        icon: iconPath,
        tooltip: tooltipText,
        disabled: Boolean(disabled),
      });
    },
  };

  /**
   * @constructor
   */
  function Timeline(): void {
  }

  Timeline.prototype = {
    // @ts-ignore
    addTraceProvider: function(categoryName: string, categoryTooltip: string): TraceProvider {
      const id = 'extension-trace-provider-' + extensionServer.nextObjectId();
      extensionServer.sendRequest({
        command: PrivateAPI.Commands.AddTraceProvider,
        id: id,
        categoryName: categoryName,
        categoryTooltip: categoryTooltip,
      });
      // @ts-ignore
      return new TraceProvider(id);
    },
  };

  /**
   * @constructor
   */
  function TraceSessionImpl(this: any, id: string): void {
    this._id = id;
  }

  TraceSessionImpl.prototype = {
    complete: function(url?: string, timeOffset?: number): void {
      extensionServer.sendRequest({
        command: PrivateAPI.Commands.CompleteTraceSession,
        id: this._id,
        url: url || '',
        timeOffset: timeOffset || 0,
      });
    },
  };

  /**
   * @constructor
   */
  function TraceProvider(id: string): void {
    function dispatchRecordingStarted(this: any, message: any): void {
      const sessionId = message.arguments[0];
      // @ts-ignore
      this._fire(new TraceSession(sessionId));
    }

    // @ts-ignore
    this.onRecordingStarted = new EventSink(PrivateAPI.Events.RecordingStarted + id, dispatchRecordingStarted);
    // @ts-ignore
    this.onRecordingStopped = new EventSink(PrivateAPI.Events.RecordingStopped + id);
  }

  /**
   * @constructor
   */
  function InspectedWindow(this: any): void {
    function dispatchResourceEvent(this: any, message: any): void {
      // @ts-ignore
      this._fire(new Resource(message.arguments[0]));
    }

    function dispatchResourceContentEvent(this: any, message: any): void {
      // @ts-ignore
      this._fire(new Resource(message.arguments[0]), message.arguments[1]);
    }

    // @ts-ignore
    this.onResourceAdded = new EventSink(PrivateAPI.Events.ResourceAdded, dispatchResourceEvent);
    this.onResourceContentCommitted =
        // @ts-ignore
        new EventSink(PrivateAPI.Events.ResourceContentCommitted, dispatchResourceContentEvent);
  }

  InspectedWindow.prototype = {
    reload: function(optionsOrUserAgent: any): void {
      let options: {
        userAgent: string,
      }|null = null;
      if (typeof optionsOrUserAgent === 'object') {
        options = optionsOrUserAgent;
      } else if (typeof optionsOrUserAgent === 'string') {
        options = {userAgent: optionsOrUserAgent};
        console.warn(
            'Passing userAgent as string parameter to inspectedWindow.reload() is deprecated. ' +
            'Use inspectedWindow.reload({ userAgent: value}) instead.');
      }
      extensionServer.sendRequest({command: PrivateAPI.Commands.Reload, options: options});
    },

    eval: function(expression: any, evaluateOptions: any): Object |
        null {
          const callback = extractCallbackArgument(arguments);
          function callbackWrapper(result: any): void {
            if (result.isError || result.isException) {
              callback && callback(undefined, result);
            } else {
              callback && callback(result.value);
            }
          }
          extensionServer.sendRequest(
              {
                command: PrivateAPI.Commands.EvaluateOnInspectedPage,
                expression: expression,
                evaluateOptions: (typeof evaluateOptions === 'object' ? evaluateOptions : undefined),
              },
              callback && callbackWrapper);
          return null;
        },

    getResources: function(callback: any): void {
      function wrapResource(resourceData: any): any {
        // @ts-ignore
        return new Resource(resourceData);
      }
      function callbackWrapper(resources: any): void {
        callback(resources.map(wrapResource));
      }
      extensionServer.sendRequest({command: PrivateAPI.Commands.GetPageResources}, callback && callbackWrapper);
    },
  };

  /**
   * @constructor
   */
  function ResourceImpl(this: any, resourceData: any): void {
    this._url = resourceData.url;
    this._type = resourceData.type;
  }

  ResourceImpl.prototype = {
    get url(): string {
      return this._url;
    },

    get type(): string {
      return this._type;
    },

    getContent: function(callback: any): void {
      function callbackWrapper(response: any): void {
        callback(response.content, response.encoding);
      }

      extensionServer.sendRequest(
          {command: PrivateAPI.Commands.GetResourceContent, url: this._url}, callback && callbackWrapper);
    },

    setContent: function(content: any, commit: any, callback: any): void {
      extensionServer.sendRequest(
          {command: PrivateAPI.Commands.SetResourceContent, url: this._url, content: content, commit: commit},
          callback);
    },
  };

  function getTabId(): string {
    return inspectedTabId;
  }

  let keyboardEventRequestQueue: KeyboardEventInit&{eventType: string}[] = [];
  let forwardTimer: number|null = null;
  function forwardKeyboardEvent(event: KeyboardEvent): void {
    // Check if the event should be forwarded.
    // This is a workaround for crbug.com/923338.
    const focused = document.activeElement;
    if (focused) {
      const isInput = focused.nodeName === 'INPUT' || focused.nodeName === 'TEXTAREA';
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
      forwardTimer = setTimeout(forwardEventQueue, 0);
    }
  }

  function forwardEventQueue(): void {
    forwardTimer = null;
    extensionServer.sendRequest(
        {command: PrivateAPI.Commands.ForwardKeyboardEvent, entries: keyboardEventRequestQueue});
    keyboardEventRequestQueue = [];
  }

  document.addEventListener('keydown', forwardKeyboardEvent, false);

  /**
   * @constructor
   */
  function ExtensionServerClient(this: APIImpl.ExtensionServerClient): void {
    this._callbacks = {};
    this._handlers = {};
    this._lastRequestId = 0;
    this._lastObjectId = 0;

    this.registerHandler('callback', this._onCallback.bind(this));

    const channel = new MessageChannel();
    this._port = channel.port1;
    this._port.addEventListener('message', this._onMessage.bind(this), false);
    this._port.start();

    window.parent.postMessage('registerExtension', '*', [channel.port2]);
  }

  (ExtensionServerClient.prototype as Pick<
       APIImpl.ExtensionServerClient,
       'sendRequest'|'hasHandler'|'registerHandler'|'unregisterHandler'|'nextObjectId'|'_registerCallback'|
       '_onCallback'|'_onMessage'>) = {
    sendRequest: function(
        this: APIImpl.ExtensionServerClient, message: PrivateAPI.ServerRequests,
        callback?: (response: unknown) => unknown, transfers?: Transferable[]): void {
      if (typeof callback === 'function') {
        (message as PrivateAPI.ExtensionServerRequestMessage).requestId = this._registerCallback(callback);
      }
      // @ts-expect-error
      this._port.postMessage(message, transfers);
    },

    hasHandler: function(this: APIImpl.ExtensionServerClient, command: string): boolean {
      return Boolean(this._handlers[command]);
    },

    registerHandler: function(
        this: APIImpl.ExtensionServerClient, command: string, handler: (request: {arguments: unknown[]}) => unknown):
        void {
          this._handlers[command] = handler;
        },

    unregisterHandler: function(this: APIImpl.ExtensionServerClient, command: string): void {
      delete this._handlers[command];
    },

    nextObjectId: function(this: APIImpl.ExtensionServerClient): string {
      return injectedScriptId.toString() + '_' + ++this._lastObjectId;
    },

    _registerCallback: function(this: APIImpl.ExtensionServerClient, callback: (response: unknown) => unknown): number {
      const id = ++this._lastRequestId;
      this._callbacks[id] = callback;
      return id;
    },

    _onCallback: function(this: APIImpl.ExtensionServerClient, request: {requestId: number, result: unknown}): void {
      if (request.requestId in this._callbacks) {
        const callback = this._callbacks[request.requestId];
        delete this._callbacks[request.requestId];
        callback(request.result);
      }
    },

    _onMessage: function(
        this: APIImpl.ExtensionServerClient,
        event: MessageEvent<{command: string, requestId: number, arguments: unknown[]}>): void {
      const request = event.data;
      const handler = this._handlers[request.command];
      if (handler) {
        handler.call(this, request);
      }
    },
  };

  function populateInterfaceClass(interfaze: {[key: string]: unknown}, implementation: {[key: string]: unknown}): void {
    for (const member in implementation) {
      if (member.charAt(0) === '_') {
        continue;
      }
      let descriptor: (PropertyDescriptor|undefined)|null = null;
      // Traverse prototype chain until we find the owner.
      for (let owner = implementation; owner && !descriptor; owner = owner.__proto__ as {[key: string]: unknown}) {
        descriptor = Object.getOwnPropertyDescriptor(owner, member);
      }
      if (!descriptor) {
        continue;
      }
      if (typeof descriptor.value === 'function') {
        interfaze[member] = descriptor.value.bind(implementation);
      } else if (typeof descriptor.get === 'function') {
        // @ts-expect-error
        interfaze.__defineGetter__(member, descriptor.get.bind(implementation));
      } else {
        Object.defineProperty(interfaze, member, descriptor);
      }
    }
  }


  const extensionServer = new (Constructor(ExtensionServerClient))();

  const coreAPI = new (Constructor(InspectorExtensionAPI))();

  Object.defineProperty(chrome, 'devtools', {value: {}, enumerable: true});

  // Only expose tabId on chrome.devtools.inspectedWindow, not webInspector.inspectedWindow.
  // @ts-expect-error
  chrome.devtools!.inspectedWindow = {};
  Object.defineProperty(chrome.devtools!.inspectedWindow, 'tabId', {get: getTabId});
  // @ts-expect-error
  chrome.devtools!.inspectedWindow.__proto__ = coreAPI.inspectedWindow;
  chrome.devtools!.network = coreAPI.network;
  chrome.devtools!.panels = coreAPI.panels;
  chrome.devtools!.panels.themeName = themeName;
  chrome.devtools!.languageServices = coreAPI.languageServices;

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

self.buildExtensionAPIInjectedScript = function(
    extensionInfo: {
      startPage: string,
      name: string,
      exposeExperimentalAPIs: boolean,
    },
    inspectedTabId: string, themeName: string, keysToForward: number[],
    testHook:
        ((extensionServer: APIImpl.ExtensionServerClient, extensionAPI: APIImpl.InspectorExtensionAPI) => unknown)|
    undefined): string {
  const argumentsJSON =
      [extensionInfo, inspectedTabId || null, themeName, keysToForward].map(_ => JSON.stringify(_)).join(',');
  if (!testHook) {
    testHook = (): void => {};
  }
  return '(function(injectedScriptId){ ' +
      '(' + self.injectedExtensionAPI.toString() + ')(' + argumentsJSON + ',' + testHook + ', injectedScriptId);' +
      '})';
};
