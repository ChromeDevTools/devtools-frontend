import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class InspectorMainImpl implements Common.Runnable.Runnable {
    run(): Promise<void>;
}
export declare class ReloadActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
export declare class FocusDebuggeeActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, _actionId: string): boolean;
}
interface ViewInput {
    nodeProcessRunning: Boolean;
}
type View = (input: ViewInput, _output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class NodeIndicator extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
}
export declare class NodeIndicatorProvider implements UI.Toolbar.Provider {
    #private;
    private constructor();
    item(): UI.Toolbar.ToolbarItem | null;
    static instance(opts?: {
        forceNew: boolean | null;
    }): NodeIndicatorProvider;
}
export declare class SourcesPanelIndicator {
    constructor();
}
export declare class BackendSettingsSync implements SDK.TargetManager.Observer {
    #private;
    constructor();
    targetAdded(target: SDK.Target.Target): void;
    targetRemoved(_target: SDK.Target.Target): void;
}
export {};
