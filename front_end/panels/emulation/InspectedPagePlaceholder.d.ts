import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
declare const InspectedPagePlaceholder_base: (new (...args: any[]) => {
    addEventListener<T extends Events.UPDATE>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.UPDATE>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.UPDATE>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.UPDATE): boolean;
    dispatchEventToListeners<T extends Events.UPDATE>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.Widget;
export declare class InspectedPagePlaceholder extends InspectedPagePlaceholder_base {
    private updateId?;
    constructor();
    static instance(opts?: {
        forceNew: null;
    }): InspectedPagePlaceholder;
    onResize(): void;
    restoreMinimumSize(): void;
    clearMinimumSize(): void;
    private dipPageRect;
    update(force?: boolean): void;
}
export declare const enum Events {
    UPDATE = "Update"
}
export interface Bounds {
    x: number;
    y: number;
    height: number;
    width: number;
}
export interface EventTypes {
    [Events.UPDATE]: Bounds;
}
export {};
