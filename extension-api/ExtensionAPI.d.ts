// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export namespace Chrome {
  export namespace DevTools {
    export interface EventSink<ListenerT extends(...args: any[]) => void> {
      addListener(listener: ListenerT): void;
      removeListener(listener: ListenerT): void;
    }

    export interface Resource {
      readonly url: string;
      readonly type: string;

      /**
       * For WASM resources the content of the `build_id` custom section. For JavaScript resources the
       * `debugId` magic comment.
       */
      readonly buildId?: string;

      /**
       * Returns the `content` and `encoding` of the resource. If a `callback`
       * is provided, it is invoked with the `content` and `encoding` and the
       * method returns `void`. If no `callback` is provided, the method returns
       * a `Promise`.
       *
       * @param callback Optional callback to be invoked with the content and
       * encoding.
       * @returns A Promise that resolves to an object containing the content
       * and encoding if no callback is provided, otherwise void. Rejects with
       * an error object on failure.
       */
      getContent(): Promise<{content: string, encoding: string}>;
      getContent(callback: (content: string, encoding: string) => unknown): void;

      /**
       * Sets the content of the resource. If a `callback` is provided, it is
       * invoked when the content is set and the method returns `void`. If no
       * `callback` is provided, the method returns a `Promise`.
       *
       * @param content The new content of the resource.
       * @param commit Whether to commit the changes.
       * @param callback Optional callback to be invoked when the content is
       * set.
       * @returns A Promise that resolves when the content is set if no callback
       * is provided, otherwise void. Rejects with an error object on failure.
       */
      setContent(content: string, commit: boolean): Promise<void>;
      setContent(content: string, commit: boolean, callback: (error?: object) => unknown): void;
      /**
       * Augments this resource's scopes information based on the list of {@link NamedFunctionRange}s
       * for improved debuggability and function naming.
       *
       * @throws
       * If this resource was not produced by a sourcemap or if {@link ranges} are not nested properly.
       * Concretely: For each range, start position must be less than end position, and
       * there must be no "straddling" (i.e. partially overlapping ranges).
       */
      setFunctionRangesForScript(ranges: NamedFunctionRange[]): Promise<void>;
      attachSourceMapURL(sourceMapURL: string): Promise<void>;
    }

    export interface InspectedWindow {
      tabId: number;

      onResourceAdded: EventSink<(resource: Resource) => unknown>;
      onResourceContentCommitted: EventSink<(resource: Resource, content: string) => unknown>;

      /**
       * Evaluates a JavaScript expression in the context of the inspected page.
       *
       * If a `callback` is provided, it is invoked with the result and
       * exception information and the method returns `void`. If no `callback`
       * is provided, the method returns a `Promise`.
       *
       * @template E The type of the value that the Promise resolves to.
       * @param expression The JavaScript expression to evaluate.
       * @param optionsOrCallback Optional options for evaluation, or a callback
       * function.
       * @param callback Optional callback to be invoked with the evaluation
       * result and exception information.
       * @returns A Promise that resolves to the result if no callback is
       * provided, otherwise void. Rejects with an error object on failure.
       */
      eval<E = unknown>(expression: string, options?: {
        scriptExecutionContext?: string,
        frameURL?: string,
        useContentScriptContext?: boolean,
      }): Promise<E>;
      eval(expression: string,
           optionsOrCallback: {scriptExecutionContext?: string, frameURL?: string, useContentScriptContext?: boolean}|
           undefined|((result: unknown, exceptioninfo: {
                        code: string,
                        description: string,
                        details: unknown[],
                        isError: boolean,
                        isException: boolean,
                        value: string,
                      }) => unknown),
           callback?: (result: unknown, exceptioninfo: {
             code: string,
             description: string,
             details: unknown[],
             isError: boolean,
             isException: boolean,
             value: string,
           }) => unknown): void;

      /**
       * Retrieves all resources within the inspected window.
       *
       * If a `callback` is provided, it is invoked with the array of resources
       * and the method returns `void`. If no `callback` is provided, the method
       * returns a `Promise`.
       *
       * @param callback Optional callback to be invoked with the array of
       * resources.
       * @returns A Promise that resolves to an array of resources if no
       * callback is provided, otherwise void. Rejects with an error object on
       * failure.
       */
      getResources(): Promise<Resource[]>;
      getResources(callback: (resources: Resource[]) => unknown): void;

      reload(reloadOptions?: {ignoreCache?: boolean, injectedScript?: string, userAgent?: string}): void;
    }

    export interface Button {
      onClicked: EventSink<() => unknown>;
      update(iconPath?: string, tooltipText?: string, disabled?: boolean): void;
    }

    export interface ExtensionView {
      onHidden: EventSink<() => unknown>;
      onShown: EventSink<(window?: Window) => unknown>;
    }

    export interface ExtensionPanel extends ExtensionView {
      show(): void;
      onSearch: EventSink<(action: string, queryString?: string) => unknown>;
      createStatusBarButton(iconPath: string, tooltipText: string, disabled: boolean): Button;
    }

    export interface RecorderView extends ExtensionView {
      show(): void;
    }

    export interface ExtensionSidebarPane extends ExtensionView {
      setHeight(height: string): void;

      /**
       * Sets an object to be displayed in the sidebar pane.
       *
       * If a `callback` is provided, it is invoked when the object has been set
       * and the method returns `void`. If no `callback` is provided, the method
       * returns a `Promise`.
       *
       * @param jsonObject The JSON object to display in the pane (as a string).
       * @param rootTitle Optional title of the root node.
       * @param callback Optional callback to be invoked when the object has been set.
       * @returns A Promise that resolves when the object has been set if no callback is
       * provided, otherwise void. Rejects with an error object on failure.
       */
      setObject(jsonObject: string, rootTitle?: string): Promise<void>;
      setObject(jsonObject: string, rootTitle?: string, callback?: () => unknown): void;

      /**
       * Evaluates an expression in the context of the inspected page and displays the
       * result in the sidebar pane.
       *
       * If a `callback` is provided, it is invoked when the expression has been evaluated
       * and the method returns `void`. If no `callback` is provided, the method
       * returns a `Promise`.
       *
       * @param expression The expression to evaluate.
       * @param rootTitle Optional title of the root node.
       * @param evaluateOptions Options for evaluating the expression.
       * @param callback Optional callback to be invoked when the expression has been evaluated.
       * @returns A Promise that resolves when the expression has been evaluated if no callback is
       * provided, otherwise void. Rejects with an error object on failure.
       */
      setExpression(expression: string, rootTitle?: string, evaluateOptions?: {
        frameURL?: string,
        useContentScriptContext?: boolean,
        scriptExecutionContext?: string,
      }): Promise<void>;
      setExpression(expression: string, rootTitle?: string, evaluateOptions?: {
        frameURL?: string,
        useContentScriptContext?: boolean,
        scriptExecutionContext?: string,
      },
                    callback?: () => unknown): void;

      setPage(path: string): void;
    }

    export interface PanelWithSidebar {
      /**
       * Creates a sidebar pane in the Elements or Sources panel.
       *
       * If a `callback` is provided, it is invoked with the sidebar pane
       * and the method returns `void`. If no `callback` is provided, the method
       * returns a `Promise`.
       *
       * @param title The title of the sidebar pane.
       * @param callback Optional callback to be invoked when the sidebar pane has been created.
       * @returns A Promise that resolves to the created ExtensionSidebarPane if no callback is
       * provided, otherwise void. Rejects with an error object on failure.
       */
      createSidebarPane(title: string): Promise<ExtensionSidebarPane>;
      createSidebarPane(title: string, callback?: (result: ExtensionSidebarPane) => unknown): void;

      onSelectionChanged: EventSink<() => unknown>;
    }

    export interface Panels {
      elements: PanelWithSidebar;
      sources: PanelWithSidebar;
      network: NetworkPanel;
      themeName: string;

      /**
       * Creates an extension panel.
       *
       * If a `callback` is provided, it is invoked with the panel
       * and the method returns `void`. If no `callback` is provided, the method
       * returns a `Promise`.
       *
       * @param title The title of the panel.
       * @param iconPath The path to the icon for the panel.
       * @param pagePath The path to the page for the panel.
       * @param callback Optional callback to be invoked when the panel has been created.
       * @returns A Promise that resolves to the created ExtensionPanel if no callback is
       * provided, otherwise void. Rejects with an error object on failure.
       */
      create(title: string, iconPath: string, pagePath: string): Promise<ExtensionPanel>;
      create(title: string, iconPath: string, pagePath: string, callback?: (panel: ExtensionPanel) => unknown): void;

      /**
       * Opens a resource in the Sources panel.
       *
       * If a `callback` is provided, it is invoked when the resource has been opened
       * and the method returns `void`. If no `callback` is provided, the method
       * returns a `Promise`.
       *
       * @param url The URL of the resource.
       * @param lineNumber The line number to highlight.
       * @param columnNumber Optional column number to highlight.
       * @param callback Optional callback to be invoked when the resource has been opened.
       * @returns A Promise that resolves when the resource has been opened if no callback is
       * provided, otherwise void. Rejects with an error object on failure.
       */
      openResource(url: string, lineNumber: number, columnNumber?: number): Promise<void>;
      openResource(url: string, lineNumber: number, columnNumber?: number, callback?: () => unknown): void;

      setOpenResourceHandler(
          callback?: (resource: Resource, lineNumber: number, columnNumber: number) => void, scheme?: string): void;

      /**
       * Fired when the theme changes in DevTools.
       *
       * @param callback The handler callback to register and be invoked on theme changes.
       */
      setThemeChangeHandler(callback?: (themeName: string) => unknown): void;
    }

    export interface Request {
      /**
       * Retrieves the content of the request.
       *
       * If a `callback` is provided, it is invoked with the content and encoding
       * and the method returns `void`. If no `callback` is provided, the method
       * returns a `Promise`.
       *
       * @param callback Optional callback to be invoked with the content and
       * encoding.
       * @returns A Promise that resolves to an object containing the content and
       * encoding if no callback is provided, otherwise void. Rejects with an
       * error object on failure.
       */
      getContent(): Promise<{content: string, encoding: string}>;
      getContent(callback: (content: string, encoding: string) => unknown): void;
    }

    export interface Network {
      onNavigated: EventSink<(url: string) => unknown>;
      onRequestFinished: EventSink<(request: Request) => unknown>;

      /**
       * Retrieves the HAR log that contains all network requests.
       *
       * If a `callback` is provided, it is invoked with the HAR log object
       * and the method returns `void`. If no `callback` is provided, the method
       * returns a `Promise`.
       *
       * @param callback Optional callback to be invoked with the HAR log.
       * @returns A Promise that resolves to the HAR log if no callback is
       * provided, otherwise void. Rejects with an error object on failure.
       */
      getHAR(): Promise<object>;
      getHAR(callback: (harLog: object) => unknown): void;
    }

    export interface NetworkPanel {
      show(options?: {filter: string}): Promise<void>;
    }

    export interface DevToolsAPI {
      network: Network;
      panels: Panels;
      inspectedWindow: InspectedWindow;
      languageServices: LanguageExtensions;
      recorder: RecorderExtensions;
      performance: Performance;
    }

    export interface ExperimentalDevToolsAPI {
      inspectedWindow: InspectedWindow;
    }

    export interface RawModule {
      url: string;
      code?: ArrayBuffer;
    }

    export interface RawLocationRange {
      rawModuleId: string;
      startOffset: number;
      endOffset: number;
    }

    export interface RawLocation {
      rawModuleId: string;
      codeOffset: number;
      inlineFrameIndex: number;
    }

    export interface SourceLocation {
      rawModuleId: string;
      sourceFileURL: string;
      lineNumber: number;
      columnNumber: number;
    }

    export interface Variable {
      scope: string;
      name: string;
      type: string;
      nestedName?: string[];
    }

    export interface ScopeInfo {
      type: string;
      typeName: string;
      icon?: string;
    }

    export interface FunctionInfo {
      name: string;
    }

    export type RecorderExtensionPlugin = RecorderExtensionExportPlugin|RecorderExtensionReplayPlugin;

    export interface RecorderExtensionExportPlugin {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stringify(recording: Record<string, any>): Promise<string>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stringifyStep(step: Record<string, any>): Promise<string>;
    }
    export interface RecorderExtensionReplayPlugin {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      replay(recording: Record<string, any>): void;
    }

    export type RemoteObjectId = string;
    export type RemoteObjectType = 'object'|'undefined'|'string'|'number'|'boolean'|'bigint'|'array'|'null';

    export interface RemoteObject {
      type: RemoteObjectType;
      className?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value?: any;
      description?: string;
      objectId?: RemoteObjectId;
      linearMemoryAddress?: number;
      linearMemorySize?: number;
      hasChildren: boolean;
    }

    /**
     * This refers to a Javascript or a Wasm value of reference type
     * in the V8 engine. We call it foreign object here to emphasize
     * the difference with the remote objects managed by a language
     * extension plugin.
     */
    export interface ForeignObject {
      type: 'reftype';
      valueClass: 'local'|'global'|'operand';
      index: number;
    }

    export interface PropertyDescriptor {
      name: string;
      value: RemoteObject|ForeignObject;
    }

    export interface LanguageExtensionPlugin {
      /**
       * A new raw module has been loaded. If the raw wasm module references an external debug info module, its URL will be
       * passed as symbolsURL.
       */
      addRawModule(rawModuleId: string, symbolsURL: string|undefined, rawModule: RawModule):
          Promise<string[]|{missingSymbolFiles: string[]}>;

      /**
       * Find locations in raw modules from a location in a source file.
       */
      sourceLocationToRawLocation(sourceLocation: SourceLocation): Promise<RawLocationRange[]>;

      /**
       * Find locations in source files from a location in a raw module.
       */
      rawLocationToSourceLocation(rawLocation: RawLocation): Promise<SourceLocation[]>;

      /**
       * Return detailed information about a scope.
       */
      getScopeInfo(type: string): Promise<ScopeInfo>;

      /**
       * List all variables in lexical scope at a given location in a raw module.
       */
      listVariablesInScope(rawLocation: RawLocation): Promise<Variable[]>;

      /**
       * Notifies the plugin that a script is removed.
       */
      removeRawModule(rawModuleId: string): Promise<void>;

      /**
       * Retrieve function name(s) for the function(s) containing the rawLocation. This returns more than one entry if
       * the location is inside of an inlined function with the innermost function at index 0.
       */
      getFunctionInfo(rawLocation: RawLocation): Promise<{frames: FunctionInfo[], missingSymbolFiles: string[]}|
                                                         {missingSymbolFiles: string[]}|{frames: FunctionInfo[]}>;

      /**
       * Find locations in raw modules corresponding to the inline function
       * that rawLocation is in. Used for stepping out of an inline function.
       */
      getInlinedFunctionRanges(rawLocation: RawLocation): Promise<RawLocationRange[]>;

      /**
       * Find locations in raw modules corresponding to inline functions
       * called by the function or inline frame that rawLocation is in.
       * Used for stepping over inline functions.
       */
      getInlinedCalleesRanges(rawLocation: RawLocation): Promise<RawLocationRange[]>;

      /**
       * Retrieve a list of line numbers in a file for which line-to-raw-location mappings exist.
       */
      getMappedLines(rawModuleId: string, sourceFileURL: string): Promise<number[]|undefined>;

      /**
       * Evaluate a source language expression in the context of a given raw location and a given stopId. stopId is an
       * opaque key that should be passed to the APIs accessing wasm state, e.g., getWasmLinearMemory. A stopId is
       * invalidated once the debugger resumes.
       */
      evaluate(expression: string, context: RawLocation, stopId: unknown): Promise<RemoteObject|ForeignObject|null>;

      /**
       * Retrieve properties of the remote object identified by the object id.
       */
      getProperties(objectId: RemoteObjectId): Promise<PropertyDescriptor[]>;

      /**
       * Permanently release the remote object identified by the object id.
       */
      releaseObject(objectId: RemoteObjectId): Promise<void>;
    }

    export interface SupportedScriptTypes {
      language: string;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      symbol_types: string[];
    }

    export type WasmValue = {type: 'i32'|'f32'|'f64', value: number}|{type: 'i64', value: bigint}|
        {type: 'v128', value: string}|ForeignObject;

    export interface LanguageExtensions {
      registerLanguageExtensionPlugin(
          plugin: LanguageExtensionPlugin, pluginName: string,
          supportedScriptTypes: SupportedScriptTypes): Promise<void>;
      unregisterLanguageExtensionPlugin(plugin: LanguageExtensionPlugin): Promise<void>;

      getWasmLinearMemory(offset: number, length: number, stopId: unknown): Promise<ArrayBuffer>;
      getWasmLocal(local: number, stopId: unknown): Promise<WasmValue>;
      getWasmGlobal(global: number, stopId: unknown): Promise<WasmValue>;
      getWasmOp(op: number, stopId: unknown): Promise<WasmValue>;

      reportResourceLoad(resourceUrl: string, status: {success: boolean, errorMessage?: string, size?: number}):
          Promise<void>;
    }

    export interface Position {
      line: number;
      column: number;
    }

    export interface NamedFunctionRange {
      readonly name: string;
      readonly start: Position;
      readonly end: Position;
    }

    export interface RecorderExtensions {
      registerRecorderExtensionPlugin(plugin: RecorderExtensionPlugin, pluginName: string, mediaType?: string):
          Promise<void>;
      unregisterRecorderExtensionPlugin(plugin: RecorderExtensionPlugin): Promise<void>;
      createView(title: string, pagePath: string): Promise<RecorderView>;
    }

    export interface Performance {
      onProfilingStarted: EventSink<() => unknown>;
      onProfilingStopped: EventSink<() => unknown>;
    }

    export interface Chrome {
      devtools: DevToolsAPI;
      experimental: {devtools: ExperimentalDevToolsAPI};
    }
  }
}

declare global {
  interface Window {
    chrome: Chrome.DevTools.Chrome;
  }
}
