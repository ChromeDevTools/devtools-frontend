import './LinearMemoryValueInterpreter.js';
import './LinearMemoryViewer.js';
import * as Common from '../../../core/common/common.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type AddressInputChangedEvent, type HistoryNavigationEvent, Mode, type PageNavigationEvent } from './LinearMemoryNavigator.js';
import type { EndiannessChangedEvent, ValueTypeToggledEvent } from './LinearMemoryValueInterpreter.js';
import type { ByteSelectedEvent, ResizeEvent } from './LinearMemoryViewer.js';
import type { HighlightInfo } from './LinearMemoryViewerUtils.js';
import type { JumpToPointerAddressEvent, ValueTypeModeChangedEvent } from './ValueInterpreterDisplay.js';
import { Endianness, type ValueType, type ValueTypeMode } from './ValueInterpreterDisplayUtils.js';
/**
 * If the LinearMemoryInspector only receives a portion
 * of the original Uint8Array to show, it requires information
 * on the 1. memoryOffset (at which index this portion starts),
 * and on the 2. outerMemoryLength (length of the original Uint8Array).
 **/
export interface LinearMemoryInspectorData {
    memory: Uint8Array<ArrayBuffer>;
    address: number;
    memoryOffset: number;
    outerMemoryLength: number;
    valueTypes?: Set<ValueType>;
    valueTypeModes?: Map<ValueType, ValueTypeMode>;
    endianness?: Endianness;
    highlightInfo?: HighlightInfo;
    hideValueInspector?: boolean;
}
export interface Settings {
    valueTypes: Set<ValueType>;
    modes: Map<ValueType, ValueTypeMode>;
    endianness: Endianness;
}
export declare const enum Events {
    MEMORY_REQUEST = "MemoryRequest",
    ADDRESS_CHANGED = "AddressChanged",
    SETTINGS_CHANGED = "SettingsChanged",
    DELETE_MEMORY_HIGHLIGHT = "DeleteMemoryHighlight"
}
export interface EventTypes {
    [Events.MEMORY_REQUEST]: {
        start: number;
        end: number;
        address: number;
    };
    [Events.ADDRESS_CHANGED]: number;
    [Events.SETTINGS_CHANGED]: Settings;
    [Events.DELETE_MEMORY_HIGHLIGHT]: HighlightInfo;
}
export interface ViewInput {
    memory: Uint8Array;
    address: number;
    memoryOffset: number;
    outerMemoryLength: number;
    valueTypes: Set<ValueType>;
    valueTypeModes: Map<ValueType, ValueTypeMode>;
    endianness: Endianness;
    highlightInfo?: HighlightInfo;
    hideValueInspector: boolean;
    currentNavigatorMode: Mode;
    currentNavigatorAddressLine: string;
    canGoBackInHistory: boolean;
    canGoForwardInHistory: boolean;
    onRefreshRequest: () => void;
    onAddressChange: (e: AddressInputChangedEvent) => void;
    onNavigatePage: (e: PageNavigationEvent) => void;
    onNavigateHistory: (e: HistoryNavigationEvent) => boolean;
    onJumpToAddress: (e: JumpToPointerAddressEvent | {
        data: number;
    }) => void;
    onDeleteMemoryHighlight: (info: HighlightInfo) => void;
    onByteSelected: (e: ByteSelectedEvent) => void;
    onResize: (e: ResizeEvent) => void;
    onValueTypeToggled: (e: ValueTypeToggledEvent) => void;
    onValueTypeModeChanged: (e: ValueTypeModeChangedEvent) => void;
    onEndiannessChanged: (e: EndiannessChangedEvent) => void;
    memorySlice: Uint8Array<ArrayBuffer>;
    viewerStart: number;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: Record<string, unknown>, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
declare const LinearMemoryInspector_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends keyof EventTypes>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof EventTypes): boolean;
    dispatchEventToListeners<T extends keyof EventTypes>(eventType: import("../../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.Widget;
export declare class LinearMemoryInspector extends LinearMemoryInspector_base {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set memory(value: Uint8Array<ArrayBuffer>);
    set memoryOffset(value: number);
    set outerMemoryLength(value: number);
    set highlightInfo(value: HighlightInfo | undefined);
    set valueTypeModes(value: Map<ValueType, ValueTypeMode>);
    set valueTypes(value: Set<ValueType>);
    set endianness(value: Endianness);
    set hideValueInspector(value: boolean);
    get hideValueInspector(): boolean;
    performUpdate(): void;
    set address(address: number);
}
export {};
