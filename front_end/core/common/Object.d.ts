import type * as Platform from '../platform/platform.js';
import type { EventDescriptor, EventListener, EventPayloadToRestParameters, EventTarget, EventTargetEvent } from './EventTarget.js';
export interface ListenerCallbackTuple<Events, T extends keyof Events> {
    thisObject?: Object;
    listener: EventListener<Events, T>;
    disposed?: boolean;
}
export declare class ObjectWrapper<Events> implements EventTarget<Events> {
    listeners?: Map<keyof Events, Set<ListenerCallbackTuple<Events, any>>>;
    addEventListener<T extends keyof Events>(eventType: T, listener: EventListener<Events, T>, thisObject?: Object): EventDescriptor<Events, T>;
    once<T extends keyof Events>(eventType: T): Promise<Events[T]>;
    removeEventListener<T extends keyof Events>(eventType: T, listener: EventListener<Events, T>, thisObject?: Object): void;
    hasEventListeners(eventType: keyof Events): boolean;
    dispatchEventToListeners<T extends keyof Events>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...[eventData]: EventPayloadToRestParameters<Events, T>): void;
}
export declare function eventMixin<Events, Base extends Platform.Constructor.Constructor<object>>(base: Base): {
    new (...args: any[]): {
        "__#private@#events": ObjectWrapper<Events>;
        addEventListener<T extends keyof Events>(eventType: T, listener: (arg0: EventTargetEvent<Events[T]>) => void, thisObject?: Object): EventDescriptor<Events, T>;
        once<T extends keyof Events>(eventType: T): Promise<Events[T]>;
        removeEventListener<T extends keyof Events>(eventType: T, listener: (arg0: EventTargetEvent<Events[T]>) => void, thisObject?: Object): void;
        hasEventListeners(eventType: keyof Events): boolean;
        dispatchEventToListeners<T extends keyof Events>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: EventPayloadToRestParameters<Events, T>): void;
    };
} & Base;
