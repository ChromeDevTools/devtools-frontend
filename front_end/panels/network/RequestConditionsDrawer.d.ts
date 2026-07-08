import '../../ui/components/lists/lists.js';
import '../../ui/components/tooltips/tooltips.js';
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    conditions: SDK.NetworkManager.RequestCondition[];
    editingCondition?: SDK.NetworkManager.RequestCondition;
    enabled: boolean;
    toggleEnabled: () => void;
    addPattern: () => void;
    onToggle: (condition: SDK.NetworkManager.RequestCondition) => void;
    onConditionsChanged: (condition: SDK.NetworkManager.RequestCondition, conditions: SDK.NetworkManager.ThrottlingConditions) => void;
    onIncreasePriority: (condition: SDK.NetworkManager.RequestCondition) => void;
    onDecreasePriority: (condition: SDK.NetworkManager.RequestCondition) => void;
    onCommit: (condition: SDK.NetworkManager.RequestCondition, value: string) => void;
    onCancel: (condition: SDK.NetworkManager.RequestCondition) => void;
    onBeginEdit: (condition: SDK.NetworkManager.RequestCondition) => void;
    onRemove: (condition: SDK.NetworkManager.RequestCondition) => void;
    validator: (condition: SDK.NetworkManager.RequestCondition, value: string) => Common.UIString.LocalizedString | null;
    lookUpRequestCount: (condition: SDK.NetworkManager.RequestCondition) => number;
}
interface ViewOutput {
    itemRefs: Map<SDK.NetworkManager.RequestCondition, HTMLElement | undefined>;
}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
interface AffectedCountViewInput {
    count: number;
}
type AffectedCountView = (input: AffectedCountViewInput, output: object, target: HTMLElement) => void;
export declare const AFFECTED_COUNT_DEFAULT_VIEW: AffectedCountView;
export declare class AffectedCountWidget extends UI.Widget.Widget {
    #private;
    constructor(target?: HTMLElement, view?: AffectedCountView);
    get lookUpRequestCount(): ((condition: SDK.NetworkManager.RequestCondition) => number) | undefined;
    set lookUpRequestCount(val: (condition: SDK.NetworkManager.RequestCondition) => number);
    get condition(): SDK.NetworkManager.RequestCondition | undefined;
    set condition(conditions: SDK.NetworkManager.RequestCondition);
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
}
export declare class RequestConditionsDrawer extends UI.Widget.VBox {
    #private;
    private manager;
    private blockedCountForUrl;
    constructor(target?: HTMLElement, view?: View);
    performUpdate(): void;
    addPattern(): void;
    removeAllPatterns(): void;
    private toggleEnabled;
    private onNetworkLogReset;
    private onRequestFinished;
    wasShown(): void;
    willHide(): void;
    static reveal(appliedConditions: SDK.NetworkManager.AppliedNetworkConditions): Promise<void>;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export declare class AppliedConditionsRevealer implements Common.Revealer.Revealer<SDK.NetworkManager.AppliedNetworkConditions> {
    reveal(request: SDK.NetworkManager.AppliedNetworkConditions): Promise<void>;
}
export {};
