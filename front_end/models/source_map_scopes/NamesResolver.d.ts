import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Formatter from '../formatter/formatter.js';
import * as TextUtils from '../text_utils/text_utils.js';
export declare function getTextFor(contentProvider: TextUtils.ContentProvider.ContentProvider): Promise<TextUtils.Text.Text | null>;
export declare class IdentifierPositions {
    name: string;
    positions: Array<{
        lineNumber: number;
        columnNumber: number;
    }>;
    constructor(name: string, positions?: Array<{
        lineNumber: number;
        columnNumber: number;
    }>);
    addPosition(lineNumber: number, columnNumber: number): void;
}
export declare function findScopeChainForDebuggerScope(scope: SDK.DebuggerModel.ScopeChainEntry): Promise<Formatter.FormatterWorkerPool.ScopeTreeNode[]>;
export declare const scopeIdentifiers: (script: SDK.Script.Script, scope: Formatter.FormatterWorkerPool.ScopeTreeNode, ancestorScopes: Formatter.FormatterWorkerPool.ScopeTreeNode[]) => Promise<{
    freeVariables: IdentifierPositions[];
    boundVariables: IdentifierPositions[];
} | null>;
export declare const resolveScopeChain: (callFrame: SDK.DebuggerModel.CallFrame) => Promise<SDK.DebuggerModel.ScopeChainEntry[]>;
/**
 * @returns A mapping from original name -> compiled name. If the orignal name is unavailable (e.g. because the compiled name was
 * shadowed) we set it to `null`.
 */
export declare const allVariablesInCallFrame: (callFrame: SDK.DebuggerModel.CallFrame) => Promise<Map<string, string | null>>;
/**
 * @returns A mapping from original name -> compiled name. If the orignal name is unavailable (e.g. because the compiled name was
 * shadowed) we set it to `null`.
 */
export declare const allVariablesAtPosition: (location: SDK.DebuggerModel.Location) => Promise<Map<string, string | null>>;
export declare const resolveThisObject: (callFrame: SDK.DebuggerModel.CallFrame) => Promise<SDK.RemoteObject.RemoteObject | null>;
export declare const resolveScopeInObject: (scope: SDK.DebuggerModel.ScopeChainEntry) => SDK.RemoteObject.RemoteObject;
export declare class RemoteObject extends SDK.RemoteObject.RemoteObject {
    private readonly scope;
    private readonly object;
    constructor(scope: SDK.DebuggerModel.ScopeChainEntry);
    customPreview(): Protocol.Runtime.CustomPreview | null;
    get objectId(): Protocol.Runtime.RemoteObjectId | undefined;
    get type(): string;
    get subtype(): string | undefined;
    get value(): typeof this.object.value;
    get description(): string | undefined;
    get hasChildren(): boolean;
    get preview(): Protocol.Runtime.ObjectPreview | undefined;
    arrayLength(): number;
    getOwnProperties(generatePreview: boolean): Promise<SDK.RemoteObject.GetPropertiesResult>;
    getAllProperties(accessorPropertiesOnly: boolean, generatePreview: boolean): Promise<SDK.RemoteObject.GetPropertiesResult>;
    setPropertyValue(argumentName: string | Protocol.Runtime.CallArgument, value: string): Promise<string | undefined>;
    deleteProperty(name: Protocol.Runtime.CallArgument): Promise<string | undefined>;
    callFunction<T, U>(functionDeclaration: (this: U, ...args: any[]) => T, args?: Protocol.Runtime.CallArgument[]): Promise<SDK.RemoteObject.CallFunctionResult>;
    callFunctionJSON<T, U>(functionDeclaration: (this: U, ...args: any[]) => T, args?: Protocol.Runtime.CallArgument[]): Promise<T | null>;
    release(): void;
    debuggerModel(): SDK.DebuggerModel.DebuggerModel;
    runtimeModel(): SDK.RuntimeModel.RuntimeModel;
    isNode(): boolean;
}
export declare function resolveDebuggerFrameFunctionName(frame: SDK.DebuggerModel.CallFrame): Promise<string | null>;
export declare function resolveProfileFrameFunctionName({ scriptId, lineNumber, columnNumber }: Partial<Protocol.Runtime.CallFrame>, target: SDK.Target.Target | null): Promise<string | null>;
export declare const getScopeResolvedForTest: () => (...arg0: unknown[]) => void;
export declare const setScopeResolvedForTest: (scope: (...arg0: unknown[]) => void) => void;
