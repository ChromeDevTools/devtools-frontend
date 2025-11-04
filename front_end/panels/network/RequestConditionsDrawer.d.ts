import '../../ui/legacy/legacy.js';
import '../../ui/components/tooltips/tooltips.js';
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
    private toggleEnabled;
    removeItemRequested(condition: SDK.NetworkManager.RequestCondition): void;
    beginEdit(pattern: SDK.NetworkManager.RequestCondition): UI.ListWidget.Editor<SDK.NetworkManager.RequestCondition>;
    commitEdit(item: SDK.NetworkManager.RequestCondition, editor: UI.ListWidget.Editor<SDK.NetworkManager.RequestCondition>, isNew: boolean): void;
    private createEditor;
    update(): void;
    private blockedRequestsCount;
    private matches;
    private onNetworkLogReset;
    private onRequestFinished;
    wasShown(): void;
    willHide(): void;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export {};
