import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { NetworkThrottlingConditionsGroup } from './ThrottlingPresets.js';
interface ViewInput {
    recommendedConditions: SDK.NetworkManager.ThrottlingConditions | null;
    selectedConditions: SDK.NetworkManager.ThrottlingConditions | undefined;
    throttlingGroups: NetworkThrottlingConditionsGroup[];
    customConditionsGroup: NetworkThrottlingConditionsGroup;
    jslogContext: string | undefined;
    title: string | undefined;
    disabled: boolean;
    onSelect: (conditions: SDK.NetworkManager.ThrottlingConditions) => void;
    onAddCustomConditions: () => void;
}
export type ViewFunction = (input: ViewInput, output: object, target: HTMLSelectElement) => void;
export declare const DEFAULT_VIEW: ViewFunction;
export declare const enum Events {
    CONDITIONS_CHANGED = "ConditionsChanged"
}
export interface EventTypes {
    [Events.CONDITIONS_CHANGED]: SDK.NetworkManager.ThrottlingConditions;
}
declare const NetworkThrottlingSelect_base: (new (...args: any[]) => {
    __events: Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.CONDITIONS_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.CONDITIONS_CHANGED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.CONDITIONS_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.CONDITIONS_CHANGED): boolean;
    dispatchEventToListeners<T extends Events.CONDITIONS_CHANGED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
    dispatchDOMEvent?(event: Event): void;
}) & typeof UI.Widget.Widget;
export declare class NetworkThrottlingSelect extends NetworkThrottlingSelect_base {
    #private;
    static createForGlobalConditions(element: HTMLElement, title: string): NetworkThrottlingSelect;
    constructor(element?: HTMLElement, options?: {
        title?: string;
        jslogContext?: string;
        currentConditions?: SDK.NetworkManager.Conditions;
        includeBlocking?: true;
    }, view?: ViewFunction);
    get disabled(): boolean;
    set disabled(disabled: boolean);
    get recommendedConditions(): SDK.NetworkManager.Conditions | null;
    set recommendedConditions(recommendedConditions: SDK.NetworkManager.Conditions | null);
    get currentConditions(): SDK.NetworkManager.ThrottlingConditions | undefined;
    set currentConditions(currentConditions: SDK.NetworkManager.ThrottlingConditions | undefined);
    get jslogContext(): string | undefined;
    set jslogContext(jslogContext: string | undefined);
    set bindToGlobalConditions(bind: boolean);
    get variant(): NetworkThrottlingSelect.Variant;
    set variant(variant: NetworkThrottlingSelect.Variant);
    get title(): string | undefined;
    set title(title: string | undefined);
    performUpdate(): void;
}
export declare namespace NetworkThrottlingSelect {
    const enum Variant {
        GLOBAL_CONDITIONS = "global-conditions",
        INDIVIDUAL_REQUEST_CONDITIONS = "individual-request-conditions"
    }
}
export {};
