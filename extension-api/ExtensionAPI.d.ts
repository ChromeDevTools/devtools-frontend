// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export namespace Chrome {
  export namespace DevTools {
    export interface EventSink<ListenerT extends(...args: any) => void> {
      addListener(listener: ListenerT): void;
    }

    export interface Resource {
      readonly url: string;

      getContent(callback: (content: string, encoding: string) => unknown): void;
      setContent(content: string, commit: boolean, callback?: (error?: Object) => unknown): void;
    }

    export interface InspectedWindow {
      tabId: number;

      onResourceAdded: EventSink<(resource: Resource) => unknown>;
      onResourceContentCommitted: EventSink<(resource: Resource, content: string) => unknown>;

      eval(
          expression: string,
          options?: {scriptExecutionContext?: string, frameURL?: string, useContentScriptContext?: boolean},
          callback?: (result: unknown, exceptioninfo: {
            code: string,
            description: string,
            details: unknown[],
            isError: boolean,
            isException: boolean,
            value: string
          }) => unknown): void;
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
      setObject(jsonObject: string, rootTitle?: string, callback?: () => unknown): void;
      setPage(path: string): void;
    }

    export interface PanelWithSidebar {
      createSidebarPane(title: string, callback?: (result: ExtensionSidebarPane) => unknown): void;
      onSelectionChanged: EventSink<() => unknown>;
    }

    export interface Panels {
      elements: PanelWithSidebar;
      sources: PanelWithSidebar;
      themeName: string;

      create(title: string, iconPath: string, pagePath: string, callback?: (panel: ExtensionPanel) => unknown): void;
      openResource(url: string, lineNumber: number, columnNumber?: number, callback?: () => unknown): void;

      /**
       * Fired when the theme changes in DevTools.
       *
       * @param callback The handler callback to register and be invoked on theme changes.
       */
      setThemeChangeHandler(callback?: (themeName: string) => unknown): void;
    }

    export interface Request {
      getContent(callback: (content: string, encoding: string) => unknown): void;
    }

    export interface Network {
      onNavigated: EventSink<(url: string) => unknown>;
      onRequestFinished: EventSink<(request: Request) => unknown>;

      getHAR(callback: (harLog: object) => unknown): void;
    }

    export interface DevToolsAPI {
      network: Network;
      panels: Panels;
      inspectedWindow: InspectedWindow;
      languageServices: LanguageExtensions;
      recorder: RecorderExtensions;
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
      stringify(recording: Record<string, any>): Promise<string>;
      stringifyStep(step: Record<string, any>): Promise<string>;
    }
    export interface RecorderExtensionReplayPlugin {
      replay(recording: Record<string, any>): void;
    }

    export type RemoteObjectId = string;
    export type RemoteObjectType = 'object'|'undefined'|'string'|'number'|'boolean'|'bigint'|'array'|'null';

    export interface RemoteObject {
      type: RemoteObjectType;
      className?: string;
      value?: any;
      description?: string;
      objectId?: RemoteObjectId;
      linearMemoryAddress?: number;
      linearMemorySize?: number;
      hasChildren: boolean;
    }

    export interface PropertyDescriptor {
      name: string;
      value: RemoteObject;
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
      getFunctionInfo(rawLocation: RawLocation):
          Promise<{frames: Array<FunctionInfo>}|{missingSymbolFiles: Array<string>}>;

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
      evaluate(expression: string, context: RawLocation, stopId: unknown): Promise<RemoteObject|null>;

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
      symbol_types: string[];
    }

    export type WasmValue = {type: 'i32'|'f32'|'f64', value: number}|{type: 'i64', value: bigint}|
        {type: 'v128', value: string};

    export interface LanguageExtensions {
      registerLanguageExtensionPlugin(
          plugin: LanguageExtensionPlugin, pluginName: string,
          supportedScriptTypes: SupportedScriptTypes): Promise<void>;
      unregisterLanguageExtensionPlugin(plugin: LanguageExtensionPlugin): Promise<void>;

      getWasmLinearMemory(offset: number, length: number, stopId: unknown): Promise<ArrayBuffer>;
      getWasmLocal(local: number, stopId: unknown): Promise<WasmValue>;
      getWasmGlobal(global: number, stopId: unknown): Promise<WasmValue>;
      getWasmOp(op: number, stopId: unknown): Promise<WasmValue>;
    }


    export interface RecorderExtensions {
      registerRecorderExtensionPlugin(plugin: RecorderExtensionPlugin, pluginName: string, mediaType?: string):
          Promise<void>;
      unregisterRecorderExtensionPlugin(plugin: RecorderExtensionPlugin): Promise<void>;
      createView(title: string, pagePath: string): Promise<RecorderView>;
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
