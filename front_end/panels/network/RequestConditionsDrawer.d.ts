import '../../ui/legacy/legacy.js';
import '../../ui/components/tooltips/tooltips.js';
import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    list: UI.ListWidget.ListWidget<SDK.NetworkManager.RequestCondition>;
    enabled: boolean;
    toggleEnabled: () => void;
    addPattern: () => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
interface AffectedCountViewInput {
    count: number;
}
type AffectedCountView = (input: AffectedCountViewInput, output: object, target: HTMLElement) => void;
export declare const AFFECTED_COUNT_DEFAULT_VIEW: AffectedCountView;
export declare class AffectedCountWidget extends UI.Widget.Widget {
    #private;
    constructor(target?: HTMLElement, view?: AffectedCountView);
    get condition(): SDK.NetworkManager.RequestCondition | undefined;
    set condition(conditions: SDK.NetworkManager.RequestCondition);
    get drawer(): RequestConditionsDrawer | undefined;
    set drawer(drawer: RequestConditionsDrawer);
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
}
export declare class RequestConditionsDrawer extends UI.Widget.VBox implements UI.ListWidget.Delegate<SDK.NetworkManager.RequestCondition> {
    #private;
    private manager;
    private readonly list;
    private editor;
    private blockedCountForUrl;
    constructor(target?: HTMLElement, view?: View);
    performUpdate(): void;
    addPattern(): void;
    removeAllPatterns(): void;
    renderItem(condition: SDK.NetworkManager.RequestCondition, editable: boolean, index: number): Element;
    updateItem(element: HTMLElement, condition: SDK.NetworkManager.RequestCondition, editable: boolean, index: number): void;
    private toggleEnabled;
    removeItemRequested(condition: SDK.NetworkManager.RequestCondition): void;
    beginEdit(pattern: SDK.NetworkManager.RequestCondition): UI.ListWidget.Editor<SDK.NetworkManager.RequestCondition>;
    commitEdit(item: SDK.NetworkManager.RequestCondition, editor: UI.ListWidget.Editor<SDK.NetworkManager.RequestCondition>, isNew: boolean): void;
    private createEditor;
    update(): void;
    blockedRequestsCount(condition: SDK.NetworkManager.RequestCondition): number;
    throttledRequestsCount(condition: SDK.NetworkManager.RequestCondition): number;
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
