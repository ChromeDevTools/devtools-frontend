import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LinearMemoryInspectorComponents from './components/components.js';
import { type LazyUint8Array } from './LinearMemoryInspectorController.js';
declare const LinearMemoryInspectorPane_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.VIEW_CLOSED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.VIEW_CLOSED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.VIEW_CLOSED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.VIEW_CLOSED): boolean;
    dispatchEventToListeners<T extends Events.VIEW_CLOSED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class LinearMemoryInspectorPane extends LinearMemoryInspectorPane_base {
    #private;
    constructor();
    createPlaceholder(): HTMLElement;
    static instance(): LinearMemoryInspectorPane;
    create(tabId: string, title: string, arrayWrapper: LazyUint8Array, address?: number): void;
    close(tabId: string): void;
    reveal(tabId: string, address?: number): void;
    refreshView(tabId: string): void;
}
export declare const enum Events {
    VIEW_CLOSED = "ViewClosed"
}
export interface EventTypes {
    [Events.VIEW_CLOSED]: string;
}
export declare class LinearMemoryInspectorView extends UI.Widget.VBox {
    #private;
    firstTimeOpen: boolean;
    constructor(memoryWrapper: LazyUint8Array, address: number | undefined, tabId: string, hideValueInspector?: boolean);
    render(): void;
    wasShown(): void;
    saveSettings(settings: LinearMemoryInspectorComponents.LinearMemoryInspector.Settings): void;
    updateAddress(address: number): void;
    refreshData(): void;
}
export {};
