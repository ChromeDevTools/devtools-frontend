import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import type { ContextFlavorListener } from './ContextFlavorListener.js';
export declare class Context {
    #private;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): Context;
    static removeInstance(): void;
    setFlavor<T extends Object>(flavorType: Platform.Constructor.Constructor<T>, flavorValue: T | null): void;
    addFlavorChangeListener<T>(flavorType: Platform.Constructor.Constructor<T>, listener: (arg0: Common.EventTarget.EventTargetEvent<T>) => void, thisObject?: Object): void;
    removeFlavorChangeListener<T>(flavorType: Platform.Constructor.Constructor<T>, listener: (arg0: Common.EventTarget.EventTargetEvent<T>) => void, thisObject?: Object): void;
    flavor<T>(flavorType: Platform.Constructor.Constructor<T>): T | null;
    flavors(): Set<Platform.Constructor.Constructor<unknown>>;
}
declare const enum Events {
    FLAVOR_CHANGED = "FlavorChanged"
}
export type EventListenerDirect = Common.EventTarget.EventListener<EventTypes, Events.FLAVOR_CHANGED>;
export interface EventTypes {
    [Events.FLAVOR_CHANGED]: InstanceType<Platform.Constructor.Constructor<unknown>>;
}
export declare function registerListener(registration: ContextFlavorListenerRegistration): void;
export interface ContextFlavorListenerRegistration {
    contextTypes: () => Array<Platform.Constructor.Constructor<unknown>>;
    loadListener: () => Promise<ContextFlavorListener>;
}
export {};
