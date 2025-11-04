import * as Common from '../../core/common/common.js';
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
    onSelect: (conditions: SDK.NetworkManager.ThrottlingConditions) => void;
    onAddCustomConditions: () => void;
}
export type ViewFunction = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: ViewFunction;
export declare const enum Events {
    CONDITIONS_CHANGED = "conditionsChanged"
}
export interface EventTypes {
    [Events.CONDITIONS_CHANGED]: SDK.NetworkManager.ThrottlingConditions;
}
export declare class NetworkThrottlingSelect extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    static createForGlobalConditions(element: HTMLElement, title: string): NetworkThrottlingSelect;
    constructor(element: HTMLElement, options?: {
        title?: string;
        jslogContext?: string;
        currentConditions?: SDK.NetworkManager.Conditions;
        includeBlocking?: true;
    }, view?: ViewFunction);
    get recommendedConditions(): SDK.NetworkManager.Conditions | null;
    set recommendedConditions(recommendedConditions: SDK.NetworkManager.Conditions | null);
    get currentConditions(): SDK.NetworkManager.ThrottlingConditions | undefined;
    set currentConditions(currentConditions: SDK.NetworkManager.ThrottlingConditions | undefined);
    get jslogContext(): string | undefined;
    set jslogContext(jslogContext: string | undefined);
    get variant(): NetworkThrottlingSelect.Variant;
    set variant(variant: NetworkThrottlingSelect.Variant);
}
export declare namespace NetworkThrottlingSelect {
    const enum Variant {
        GLOBAL_CONDITIONS = "global-conditions",
        INDIVIDUAL_REQUEST_CONDITIONS = "individual-request-conditions"
    }
}
export declare class NetworkThrottlingSelectorWidget extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: ViewFunction);
    set variant(variant: NetworkThrottlingSelect.Variant);
    set jslogContext(context: string);
    set currentConditions(currentConditions: SDK.NetworkManager.ThrottlingConditions | undefined);
    set onConditionsChanged(handler: (conditions: SDK.NetworkManager.ThrottlingConditions) => void);
}
export {};
