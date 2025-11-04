import type { Chrome } from '../../extension-api/ExtensionAPI.js';
import type * as SDK from '../core/sdk/sdk.js';
import type * as Bindings from '../models/bindings/bindings.js';
export declare class TestPlugin implements Bindings.DebuggerLanguagePlugins.DebuggerLanguagePlugin {
    constructor(name: string);
    name: string;
    handleScript(_script: SDK.Script.Script): boolean;
    createPageResourceLoadInitiator(): SDK.PageResourceLoader.PageResourceLoadInitiator;
    evaluate(_expression: string, _context: Chrome.DevTools.RawLocation, _stopId: Bindings.DebuggerLanguagePlugins.StopId): Promise<Chrome.DevTools.RemoteObject | null>;
    getProperties(_objectId: string): Promise<Chrome.DevTools.PropertyDescriptor[]>;
    releaseObject(_objectId: string): Promise<void>;
    addRawModule(_rawModuleId: string, _symbolsURL: string, _rawModule: Chrome.DevTools.RawModule): Promise<string[]>;
    sourceLocationToRawLocation(_sourceLocation: Chrome.DevTools.SourceLocation): Promise<Chrome.DevTools.RawLocationRange[]>;
    rawLocationToSourceLocation(_rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.SourceLocation[]>;
    getScopeInfo(type: string): Promise<Chrome.DevTools.ScopeInfo>;
    listVariablesInScope(_rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.Variable[]>;
    removeRawModule(_rawModuleId: string): Promise<void>;
    getFunctionInfo(_rawLocation: Chrome.DevTools.RawLocation): Promise<{
        frames: Chrome.DevTools.FunctionInfo[];
        missingSymbolFiles: string[];
    } | {
        frames: Chrome.DevTools.FunctionInfo[];
    } | {
        missingSymbolFiles: string[];
    }>;
    getInlinedFunctionRanges(_rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]>;
    getInlinedCalleesRanges(_rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]>;
    getMappedLines(_rawModuleId: string, _sourceFileURL: string): Promise<number[] | undefined>;
}
