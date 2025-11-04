import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LinearMemoryInspectorComponents from './components/components.js';
export interface LazyUint8Array {
    getRange(start: number, end: number): Promise<Uint8Array<ArrayBuffer>>;
    length(): number;
}
export declare class RemoteArrayBufferWrapper implements LazyUint8Array {
    #private;
    constructor(arrayBuffer: SDK.RemoteObject.RemoteArrayBuffer);
    length(): number;
    getRange(start: number, end: number): Promise<Uint8Array<ArrayBuffer>>;
}
export declare class LinearMemoryInspectorController extends SDK.TargetManager.SDKModelObserver<SDK.RuntimeModel.RuntimeModel> implements Common.Revealer.Revealer<SDK.RemoteObject.LinearMemoryInspectable>, UI.ContextMenu.Provider<ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement> {
    #private;
    private constructor();
    static instance(): LinearMemoryInspectorController;
    static getMemoryForAddress(memoryWrapper: LazyUint8Array, address: number): Promise<{
        memory: Uint8Array<ArrayBuffer>;
        offset: number;
    }>;
    static getMemoryRange(memoryWrapper: LazyUint8Array, start: number, end: number): Promise<Uint8Array<ArrayBuffer>>;
    evaluateExpression(callFrame: SDK.DebuggerModel.CallFrame, expressionName: string): Promise<SDK.RemoteObject.RemoteObject | undefined>;
    saveSettings(data: LinearMemoryInspectorComponents.LinearMemoryInspector.Settings): void;
    loadSettings(): LinearMemoryInspectorComponents.LinearMemoryInspector.Settings;
    getHighlightInfo(bufferId: string): LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo | undefined;
    removeHighlight(bufferId: string, highlightInfo: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo): void;
    setHighlightInfo(bufferId: string, highlightInfo: LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo): void;
    static retrieveDWARFMemoryObjectAndAddress(obj: SDK.RemoteObject.RemoteObject): Promise<{
        obj: SDK.RemoteObject.RemoteObject;
        address: number;
    } | undefined>;
    static extractObjectSize(obj: Bindings.DebuggerLanguagePlugins.ExtensionRemoteObject): number;
    static extractObjectTypeDescription(obj: SDK.RemoteObject.RemoteObject): string;
    static extractObjectName(obj: SDK.RemoteObject.RemoteObject, expression: string): string;
    reveal({ object, expression }: SDK.RemoteObject.LinearMemoryInspectable, omitFocus?: boolean | undefined): Promise<void>;
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement): void;
    static extractHighlightInfo(obj: SDK.RemoteObject.RemoteObject, expression?: string): LinearMemoryInspectorComponents.LinearMemoryViewerUtils.HighlightInfo | undefined;
    modelRemoved(model: SDK.RuntimeModel.RuntimeModel): void;
    updateHighlightedMemory(bufferId: string, callFrame: SDK.DebuggerModel.CallFrame): Promise<void>;
}
