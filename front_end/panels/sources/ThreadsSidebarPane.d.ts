import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
interface Thread {
    name: string;
    paused: boolean;
    selected: boolean;
    onSelect: () => void;
}
interface ViewInput {
    threads: Thread[];
}
declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class ThreadsSidebarPane extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
    #private;
    constructor(element?: HTMLElement, view?: View);
    static shouldBeShown(): boolean;
    wasShown(): void;
    performUpdate(): void;
    modelAdded(debuggerModel: SDK.DebuggerModel.DebuggerModel): void;
    modelRemoved(debuggerModel: SDK.DebuggerModel.DebuggerModel): void;
    private targetFlavorChanged;
}
export {};
