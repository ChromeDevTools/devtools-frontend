// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Formatters.js';

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';

import * as Formatters from './CustomFormatters.js';
import {
  DEFAULT_MODULE_CONFIGURATIONS,
  findModuleConfiguration,
  type ModuleConfigurations,
  resolveSourcePathToURL,
} from './ModuleConfiguration.js';
import type * as SymbolsBackend from './SymbolsBackend.js';
import createSymbolsBackend from './SymbolsBackend.js';
import {type HostInterface} from './WorkerRPC.js';

function mapVector<T, ApiT>(vector: SymbolsBackend.Vector<ApiT>, callback: (apiElement: ApiT) => T): T[] {
  const elements: T[] = [];
  for (let i = 0; i < vector.size(); ++i) {
    const element = vector.get(i);
    elements.push(callback(element));
  }
  return elements;
}

type ScopeInfo = {
  type: 'GLOBAL'|'LOCAL'|'PARAMETER',
  typeName: string,
  icon?: string,
};

type LazyFSNode = FS.FSNode&{contents: {cacheLength: Function, length: number}};

function mapEnumerator(apiEnumerator: SymbolsBackend.Enumerator): Formatters.Enumerator {
  return {typeId: apiEnumerator.typeId, value: apiEnumerator.value, name: apiEnumerator.name};
}

function mapFieldInfo(apiFieldInfo: SymbolsBackend.FieldInfo): Formatters.FieldInfo {
  return {typeId: apiFieldInfo.typeId, offset: apiFieldInfo.offset, name: apiFieldInfo.name};
}

class ModuleInfo {
  readonly fileNameToUrl: Map<string, string>;
  readonly urlToFileName: Map<string, string>;
  readonly dwarfSymbolsPlugin: SymbolsBackend.DWARFSymbolsPlugin;

  constructor(
      readonly symbolsUrl: string, readonly symbolsFileName: string, readonly symbolsDwpFileName: string|undefined,
      readonly backend: SymbolsBackend.Module) {
    this.fileNameToUrl = new Map<string, string>();
    this.urlToFileName = new Map<string, string>();
    this.dwarfSymbolsPlugin = new backend.DWARFSymbolsPlugin();
  }

  stringifyScope(scope: SymbolsBackend.VariableScope): 'GLOBAL'|'LOCAL'|'PARAMETER' {
    switch (scope) {
      case this.backend.VariableScope.GLOBAL:
        return 'GLOBAL';
      case this.backend.VariableScope.LOCAL:
        return 'LOCAL';
      case this.backend.VariableScope.PARAMETER:
        return 'PARAMETER';
    }
    throw new Error(`InternalError: Invalid scope ${scope}`);
  }

  stringifyErrorCode(errorCode: SymbolsBackend.ErrorCode): string {
    switch (errorCode) {
      case this.backend.ErrorCode.PROTOCOL_ERROR:
        return 'ProtocolError:';
      case this.backend.ErrorCode.MODULE_NOT_FOUND_ERROR:
        return 'ModuleNotFoundError:';
      case this.backend.ErrorCode.INTERNAL_ERROR:
        return 'InternalError';
      case this.backend.ErrorCode.EVAL_ERROR:
        return 'EvalError';
    }
    throw new Error(`InternalError: Invalid error code ${errorCode}`);
  }
}

export function createEmbindPool(): {
  flush(): void,
  manage<T extends SymbolsBackend.EmbindObject|undefined>(object: T): T,
  unmanage<T extends SymbolsBackend.EmbindObject>(object: T): boolean,
} {
  class EmbindObjectPool {
    private objectPool: SymbolsBackend.EmbindObject[] = [];

    flush(): void {
      for (const object of this.objectPool.reverse()) {
        object.delete();
      }
      this.objectPool = [];
    }

    manage<T extends SymbolsBackend.EmbindObject|undefined>(object: T): T {
      if (typeof object !== 'undefined') {
        this.objectPool.push(object as SymbolsBackend.EmbindObject);
      }
      return object;
    }

    unmanage<T extends SymbolsBackend.EmbindObject>(object: T): boolean {
      const index = this.objectPool.indexOf(object);
      if (index > -1) {
        this.objectPool.splice(index, 1);
        object.delete();
        return true;
      }
      return false;
    }
  }

  const pool = new EmbindObjectPool();
  const manage = pool.manage.bind(pool);
  const unmanage = pool.unmanage.bind(pool);
  const flush = pool.flush.bind(pool);
  return {manage, unmanage, flush};
}

// Cache the underlying WebAssembly module after the first instantiation
// so that subsequent calls to `createSymbolsBackend()` are faster, which
// greatly speeds up the test suite.
let symbolsBackendModulePromise: undefined|Promise<WebAssembly.Module>;
function instantiateWasm(
    imports: WebAssembly.Imports,
    callback: (module: WebAssembly.Module) => void,
    resourceLoader: ResourceLoader,
    ): Emscripten.WebAssemblyExports {
  if (!symbolsBackendModulePromise) {
    symbolsBackendModulePromise = resourceLoader.createSymbolsBackendModulePromise();
  }
  symbolsBackendModulePromise.then(module => WebAssembly.instantiate(module, imports))
      .then(callback)
      .catch(console.error);
  return [];
}

export type RawModule = Chrome.DevTools.RawModule&{dwp?: ArrayBuffer};

export interface ResourceLoader {
  loadSymbols(rawModuleId: string, rawModule: RawModule, url: URL, filesystem: typeof FS, hostInterface: HostInterface):
      Promise<{symbolsFileName: string, symbolsDwpFileName?: string}>;
  createSymbolsBackendModulePromise(): Promise<WebAssembly.Module>;
  possiblyMissingSymbols?: string[];
}

export class DWARFLanguageExtensionPlugin implements Chrome.DevTools.LanguageExtensionPlugin {
  private moduleInfos = new Map<string, Promise<ModuleInfo|undefined>>();
  private lazyObjects = new Formatters.LazyObjectStore();

  constructor(
      readonly moduleConfigurations: ModuleConfigurations, readonly resourceLoader: ResourceLoader,
      readonly hostInterface: HostInterface) {
    this.moduleConfigurations = moduleConfigurations;
  }

  private async newModuleInfo(rawModuleId: string, symbolsHint: string, rawModule: RawModule): Promise<ModuleInfo> {
    const {flush, manage} = createEmbindPool();
    try {
      const rawModuleURL = new URL(rawModule.url);
      const {pathSubstitutions} = findModuleConfiguration(this.moduleConfigurations, rawModuleURL);
      const symbolsURL = symbolsHint ? resolveSourcePathToURL([], symbolsHint, rawModuleURL) : rawModuleURL;

      const instantiateWasmWrapper =
          (imports: Emscripten.WebAssemblyImports,
           callback: (module: WebAssembly.Module) => void): Emscripten.WebAssemblyExports => {
            // Emscripten type definitions are incorrect, we're getting passed a WebAssembly.Imports object here.
            return instantiateWasm(imports as unknown as WebAssembly.Imports, callback, this.resourceLoader);
          };
      const backend = await createSymbolsBackend({instantiateWasm: instantiateWasmWrapper});
      const {symbolsFileName, symbolsDwpFileName} =
          await this.resourceLoader.loadSymbols(rawModuleId, rawModule, symbolsURL, backend.FS, this.hostInterface);
      const moduleInfo = new ModuleInfo(symbolsURL.href, symbolsFileName, symbolsDwpFileName, backend);

      const addRawModuleResponse = manage(moduleInfo.dwarfSymbolsPlugin.AddRawModule(rawModuleId, symbolsFileName));
      mapVector(manage(addRawModuleResponse.sources), fileName => {
        const fileURL = resolveSourcePathToURL(pathSubstitutions, fileName, symbolsURL);
        moduleInfo.fileNameToUrl.set(fileName, fileURL.href);
        moduleInfo.urlToFileName.set(fileURL.href, fileName);
      });

      // Set up lazy dwo files if we are running on a worker
      if (typeof global === 'undefined' && typeof importScripts === 'function' &&
          typeof XMLHttpRequest !== 'undefined') {
        mapVector(manage(addRawModuleResponse.dwos), dwoFile => {
          const absolutePath = dwoFile.startsWith('/') ? dwoFile : '/' + dwoFile;
          const pathSplit = absolutePath.split('/');
          const fileName = pathSplit.pop() as string;
          const parentDirectory = pathSplit.join('/');

          // Sometimes these stick around.
          try {
            backend.FS.unlink(absolutePath);
          } catch (_) {
          }
          // Ensure directory exists
          if (parentDirectory.length > 1) {
            // TypeScript doesn't know about createPath
            // @ts-ignore
            backend.FS.createPath('/', parentDirectory.substring(1), true, true);
          }

          const dwoURL = new URL(dwoFile, symbolsURL).href;
          const node = backend.FS.createLazyFile(parentDirectory, fileName, dwoURL, true, false) as LazyFSNode;
          const cacheLength = node.contents.cacheLength;
          const wrapper = (): void => {
            try {
              cacheLength.apply(node.contents);
              this.hostInterface.reportResourceLoad(dwoURL, {success: true, size: node.contents.length});
            } catch (e) {
              this.hostInterface.reportResourceLoad(dwoURL, {success: false, errorMessage: (e as Error).message});
              // Rethrow any error fetching the content as errno 44 (EEXIST)
              // TypeScript doesn't know about the ErrnoError constructor
              // @ts-ignore
              throw new backend.FS.ErrnoError(44);
            }
          };
          node.contents.cacheLength = wrapper;
        });
      }

      return moduleInfo;
    } finally {
      flush();
    }
  }

  async addRawModule(rawModuleId: string, symbolsUrl: string, rawModule: RawModule): Promise<string[]> {
    // This complex logic makes sure that addRawModule / removeRawModule calls are
    // handled sequentially for the same rawModuleId, and thus this looks symmetrical
    // to the removeRawModule() method below. The idea is that we chain our operation
    // on any previous operation for the same rawModuleId, and thereby end up with a
    // single sequence of events.
    const originalPromise = Promise.resolve(this.moduleInfos.get(rawModuleId));
    const moduleInfoPromise = originalPromise.then(moduleInfo => {
      if (moduleInfo) {
        throw new Error(`InternalError: Duplicate module with ID '${rawModuleId}'`);
      }
      return this.newModuleInfo(rawModuleId, symbolsUrl, rawModule);
    });
    // This looks a bit odd, but it's important that the operation is chained via
    // the `_moduleInfos` map *and* at the same time resolves to it's original
    // value in case of an error (i.e. if someone tried to add the same rawModuleId
    // twice, this will retain the original value in that case instead of having all
    // users get the internal error).
    this.moduleInfos.set(rawModuleId, moduleInfoPromise.catch(() => originalPromise));
    const moduleInfo = await moduleInfoPromise;
    return [...moduleInfo.urlToFileName.keys()];
  }

  private async getModuleInfo(rawModuleId: string): Promise<ModuleInfo> {
    const moduleInfo = await this.moduleInfos.get(rawModuleId);
    if (!moduleInfo) {
      throw new Error(`InternalError: Unknown module with raw module ID ${rawModuleId}`);
    }
    return moduleInfo;
  }

  async removeRawModule(rawModuleId: string): Promise<void> {
    const originalPromise = Promise.resolve(this.moduleInfos.get(rawModuleId));
    const moduleInfoPromise = originalPromise.then(moduleInfo => {
      if (!moduleInfo) {
        throw new Error(`InternalError: No module with ID '${rawModuleId}'`);
      }
      return undefined;
    });
    this.moduleInfos.set(rawModuleId, moduleInfoPromise.catch(() => originalPromise));
    await moduleInfoPromise;
  }

  async sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
      Promise<Chrome.DevTools.RawLocationRange[]> {
    const {flush, manage} = createEmbindPool();
    const moduleInfo = await this.getModuleInfo(sourceLocation.rawModuleId);
    const sourceFile = moduleInfo.urlToFileName.get(sourceLocation.sourceFileURL);
    if (!sourceFile) {
      throw new Error(`InternalError: Unknown URL ${sourceLocation.sourceFileURL}`);
    }
    try {
      const rawLocations = manage(moduleInfo.dwarfSymbolsPlugin.SourceLocationToRawLocation(
          sourceLocation.rawModuleId, sourceFile, sourceLocation.lineNumber, sourceLocation.columnNumber));
      const error = manage(rawLocations.error);
      if (error) {
        throw new Error(`${moduleInfo.stringifyErrorCode(error.code)}: ${error.message}`);
      }
      const locations = mapVector(manage(rawLocations.rawLocationRanges), rawLocation => {
        const {rawModuleId, startOffset, endOffset} = manage(rawLocation);
        return {rawModuleId, startOffset, endOffset};
      });
      return locations;
    } finally {
      flush();
    }
  }

  async rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation):
      Promise<Chrome.DevTools.SourceLocation[]> {
    const {flush, manage} = createEmbindPool();
    const moduleInfo = await this.getModuleInfo(rawLocation.rawModuleId);
    try {
      const sourceLocations = moduleInfo.dwarfSymbolsPlugin.RawLocationToSourceLocation(
          rawLocation.rawModuleId, rawLocation.codeOffset, rawLocation.inlineFrameIndex || 0);
      const error = manage(sourceLocations.error);
      if (error) {
        throw new Error(`${moduleInfo.stringifyErrorCode(error.code)}: ${error.message}`);
      }
      const locations = mapVector(manage(sourceLocations.sourceLocation), sourceLocation => {
        const sourceFileURL = moduleInfo.fileNameToUrl.get(sourceLocation.sourceFile);
        if (!sourceFileURL) {
          throw new Error(`InternalError: Unknown source file ${sourceLocation.sourceFile}`);
        }
        const {rawModuleId, lineNumber, columnNumber} = manage(sourceLocation);
        return {
          rawModuleId,
          sourceFileURL,
          lineNumber,
          columnNumber,
        };
      });
      return locations;
    } finally {
      flush();
    }
  }

  async getScopeInfo(type: string): Promise<ScopeInfo> {
    switch (type) {
      case 'GLOBAL':
        return {
          type,
          typeName: 'Global',
          icon: 'data:null',
        };
      case 'LOCAL':
        return {
          type,
          typeName: 'Local',
          icon: 'data:null',
        };
      case 'PARAMETER':
        return {
          type,
          typeName: 'Parameter',
          icon: 'data:null',
        };
    }
    throw new Error(`InternalError: Invalid scope type '${type}`);
  }

  async listVariablesInScope(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.Variable[]> {
    const {flush, manage} = createEmbindPool();
    const moduleInfo = await this.getModuleInfo(rawLocation.rawModuleId);
    try {
      const variables = manage(moduleInfo.dwarfSymbolsPlugin.ListVariablesInScope(
          rawLocation.rawModuleId, rawLocation.codeOffset, rawLocation.inlineFrameIndex || 0));
      const error = manage(variables.error);
      if (error) {
        throw new Error(`${moduleInfo.stringifyErrorCode(error.code)}: ${error.message}`);
      }
      const apiVariables = mapVector(manage(variables.variable), variable => {
        const {scope, name, type} = manage(variable);
        return {scope: moduleInfo.stringifyScope(scope), name, type, nestedName: name.split('::')};
      });
      return apiVariables;
    } finally {
      flush();
    }
  }

  async getFunctionInfo(rawLocation: Chrome.DevTools.RawLocation):
      Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}> {
    const {flush, manage} = createEmbindPool();
    const moduleInfo = await this.getModuleInfo(rawLocation.rawModuleId);
    try {
      const functionInfo =
          manage(moduleInfo.dwarfSymbolsPlugin.GetFunctionInfo(rawLocation.rawModuleId, rawLocation.codeOffset));
      const error = manage(functionInfo.error);
      if (error) {
        throw new Error(`${moduleInfo.stringifyErrorCode(error.code)}: ${error.message}`);
      }
      const apiFunctionInfos = mapVector(manage(functionInfo.functionNames), functionName => {
        return {name: functionName};
      });
      let apiMissingSymbolFiles = mapVector(manage(functionInfo.missingSymbolFiles), x => x);
      if (apiMissingSymbolFiles.length && this.resourceLoader.possiblyMissingSymbols) {
        apiMissingSymbolFiles = apiMissingSymbolFiles.concat(this.resourceLoader.possiblyMissingSymbols);
      }

      return {
        frames: apiFunctionInfos,
        missingSymbolFiles: apiMissingSymbolFiles.map(x => new URL(x, moduleInfo.symbolsUrl).href)
      };
    } finally {
      flush();
    }
  }

  async getInlinedFunctionRanges(rawLocation: Chrome.DevTools.RawLocation):
      Promise<Chrome.DevTools.RawLocationRange[]> {
    const {flush, manage} = createEmbindPool();
    const moduleInfo = await this.getModuleInfo(rawLocation.rawModuleId);
    try {
      const rawLocations = manage(
          moduleInfo.dwarfSymbolsPlugin.GetInlinedFunctionRanges(rawLocation.rawModuleId, rawLocation.codeOffset));
      const error = manage(rawLocations.error);
      if (error) {
        throw new Error(`${moduleInfo.stringifyErrorCode(error.code)}: ${error.message}`);
      }
      const locations = mapVector(manage(rawLocations.rawLocationRanges), rawLocation => {
        const {rawModuleId, startOffset, endOffset} = manage(rawLocation);
        return {rawModuleId, startOffset, endOffset};
      });
      return locations;
    } finally {
      flush();
    }
  }

  async getInlinedCalleesRanges(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]> {
    const {flush, manage} = createEmbindPool();
    const moduleInfo = await this.getModuleInfo(rawLocation.rawModuleId);
    try {
      const rawLocations = manage(
          moduleInfo.dwarfSymbolsPlugin.GetInlinedCalleesRanges(rawLocation.rawModuleId, rawLocation.codeOffset));
      const error = manage(rawLocations.error);
      if (error) {
        throw new Error(`${moduleInfo.stringifyErrorCode(error.code)}: ${error.message}`);
      }
      const locations = mapVector(manage(rawLocations.rawLocationRanges), rawLocation => {
        const {rawModuleId, startOffset, endOffset} = manage(rawLocation);
        return {rawModuleId, startOffset, endOffset};
      });
      return locations;
    } finally {
      flush();
    }
  }

  async getValueInfo(expression: string, context: Chrome.DevTools.RawLocation, stopId: unknown): Promise<{
    typeInfos: Formatters.TypeInfo[],
    root: Formatters.TypeInfo,
    location?: number,
    data?: number[],
    displayValue?: string,
    memoryAddress?: number,
  }|null> {
    const {manage, unmanage, flush} = createEmbindPool();
    const moduleInfo = await this.getModuleInfo(context.rawModuleId);
    try {
      const apiRawLocation = manage(new moduleInfo.backend.RawLocation());
      apiRawLocation.rawModuleId = context.rawModuleId;
      apiRawLocation.codeOffset = context.codeOffset;
      apiRawLocation.inlineFrameIndex = context.inlineFrameIndex || 0;

      const wasm = new Formatters.HostWasmInterface(this.hostInterface, stopId);
      const proxy = new Formatters.DebuggerProxy(wasm, moduleInfo.backend);
      const typeInfoResult =
          manage(moduleInfo.dwarfSymbolsPlugin.EvaluateExpression(apiRawLocation, expression, proxy));
      const error = manage(typeInfoResult.error);
      if (error) {
        if (error.code === moduleInfo.backend.ErrorCode.MODULE_NOT_FOUND_ERROR) {
          // Let's not throw when the module gets unloaded - that is quite common path that
          // we hit when the source-scope pane still keeps asynchronously updating while we
          // unload the wasm module.
          return null;
        }
        // TODO(crbug.com/1271147) Instead of throwing, we whould create an AST error node with the message
        // so that it is properly surfaced to the user. This should then make the special handling of
        // MODULE_NOT_FOUND_ERROR unnecessary.
        throw new Error(`${moduleInfo.stringifyErrorCode(error.code)}: ${error.message}`);
      }

      const typeInfos = mapVector(manage(typeInfoResult.typeInfos), typeInfo => fromApiTypeInfo(manage(typeInfo)));
      const root = fromApiTypeInfo(manage(typeInfoResult.root));
      const {location, displayValue, memoryAddress} = typeInfoResult;
      const data = typeInfoResult.data ? mapVector(manage(typeInfoResult.data), n => n) : undefined;
      return {typeInfos, root, location, data, displayValue, memoryAddress};

      function fromApiTypeInfo(apiTypeInfo: SymbolsBackend.TypeInfo): Formatters.TypeInfo {
        const apiMembers = manage(apiTypeInfo.members);
        const members = mapVector(apiMembers, fieldInfo => mapFieldInfo(manage(fieldInfo)));
        const apiEnumerators = manage(apiTypeInfo.enumerators);
        const enumerators = mapVector(apiEnumerators, enumerator => mapEnumerator(manage(enumerator)));
        unmanage(apiEnumerators);
        const typeNames = mapVector(manage(apiTypeInfo.typeNames), e => e);
        unmanage(apiMembers);
        const {typeId, size, arraySize, alignment, canExpand, isPointer, hasValue} = apiTypeInfo;
        const formatter = Formatters.CustomFormatters.get({
          typeNames,
          typeId,
          size,
          alignment,
          isPointer,
          canExpand,
          arraySize: arraySize ?? 0,
          hasValue,
          members,
          enumerators,
        });
        return {
          typeNames,
          isPointer,
          typeId,
          size,
          alignment,
          canExpand: canExpand && !formatter,
          arraySize: arraySize ?? 0,
          hasValue: hasValue || Boolean(formatter),
          members,
          enumerators,
        };
      }
    } finally {
      flush();
    }
  }

  async getMappedLines(rawModuleId: string, sourceFileURL: string): Promise<number[]> {
    const {flush, manage} = createEmbindPool();
    const moduleInfo = await this.getModuleInfo(rawModuleId);
    const sourceFile = moduleInfo.urlToFileName.get(sourceFileURL);
    if (!sourceFile) {
      throw new Error(`InternalError: Unknown URL ${sourceFileURL}`);
    }

    try {
      const mappedLines = manage(moduleInfo.dwarfSymbolsPlugin.GetMappedLines(rawModuleId, sourceFile));
      const error = manage(mappedLines.error);
      if (error) {
        throw new Error(`${moduleInfo.stringifyErrorCode(error.code)}: ${error.message}`);
      }
      const lines = mapVector(manage(mappedLines.MappedLines), l => l);
      return lines;
    } finally {
      flush();
    }
  }

  async evaluate(expression: string, context: SymbolsBackend.RawLocation, stopId: unknown):
      Promise<Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject|null> {
    const valueInfo = await this.getValueInfo(expression, context, stopId);
    if (!valueInfo) {
      return null;
    }

    const wasm = new Formatters.HostWasmInterface(this.hostInterface, stopId);
    const cxxObject = await Formatters.CXXValue.create(this.lazyObjects, wasm, wasm.view, valueInfo);
    if (!cxxObject) {
      return {
        type: 'undefined' as Chrome.DevTools.RemoteObjectType,
        hasChildren: false,
        description: '<optimized out>',
      };
    }
    return cxxObject.asRemoteObject();
  }

  async getProperties(objectId: Chrome.DevTools.RemoteObjectId): Promise<Chrome.DevTools.PropertyDescriptor[]> {
    const remoteObject = this.lazyObjects.get(objectId);
    if (!remoteObject) {
      return [];
    }

    const properties = await remoteObject.getProperties();
    const descriptors = [];
    for (const {name, property} of properties) {
      descriptors.push({name, value: await property.asRemoteObject()});
    }
    return descriptors;
  }

  async releaseObject(objectId: Chrome.DevTools.RemoteObjectId): Promise<void> {
    this.lazyObjects.release(objectId);
  }
}

export async function createPlugin(
    hostInterface: HostInterface, resourceLoader: ResourceLoader,
    moduleConfigurations: ModuleConfigurations = DEFAULT_MODULE_CONFIGURATIONS,
    logPluginApiCalls: boolean = false): Promise<DWARFLanguageExtensionPlugin> {
  const plugin = new DWARFLanguageExtensionPlugin(moduleConfigurations, resourceLoader, hostInterface);
  if (logPluginApiCalls) {
    const pluginLoggingProxy = {
      get: function<Key extends keyof DWARFLanguageExtensionPlugin>(target: DWARFLanguageExtensionPlugin, key: Key):
          DWARFLanguageExtensionPlugin[Key] {
            if (typeof target[key] === 'function') {
              return function(): unknown {
                const args = [...arguments];
                const jsonArgs = args.map(x => {
                                       try {
                                         return JSON.stringify(x);
                                       } catch {
                                         return x.toString();
                                       }
                                     })
                                     .join(', ');
                // eslint-disable-next-line no-console
                console.info(`${key}(${jsonArgs})`);
                return (target[key] as Function).apply(target, arguments);
              } as unknown as DWARFLanguageExtensionPlugin[Key];
            }
            return Reflect.get(target, key);
          },
    };

    return new Proxy(plugin, pluginLoggingProxy);
  }
  return plugin;
}
