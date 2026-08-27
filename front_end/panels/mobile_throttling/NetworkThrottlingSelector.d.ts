import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
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
/**
 * Computes the recommended network throttling preset based on CrUX RTT field
 * metric data. Returns null if no RTT data is available or no preset matches.
 */
export declare function getRecommendedNetworkConditions(roundTripTimeMetricData?: CrUXManager.MetricResponse): SDK.NetworkManager.Conditions | null;
declare const NetworkThrottlingSelect_base: Platform.Constructor.Constructor<Common.EventTarget.EventTarget<EventTypes>, any[]> & typeof UI.Widget.Widget;
export declare class NetworkThrottlingSelect extends NetworkThrottlingSelect_base {
    #private;
    static createForGlobalConditions(element: HTMLElement, title: string): NetworkThrottlingSelect;
    constructor(element?: HTMLElement, options?: {
        title?: string;
        jslogContext?: string;
        currentConditions?: SDK.NetworkManager.Conditions;
        includeBlocking?: true;
    }, settings?: Common.Settings.Settings, view?: ViewFunction);
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
