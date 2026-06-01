import type * as SDK from '../../core/sdk/sdk.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    linkifier: Components.Linkifier.Linkifier;
    isPaused: boolean;
    scopeChain: Array<{
        scope: SDK.DebuggerModel.ScopeChainEntry;
        objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree;
    }> | null;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ScopeChainSidebarPane extends UI.Widget.VBox implements UI.ContextFlavorListener.ContextFlavorListener {
    #private;
    constructor(target?: HTMLElement, view?: View);
    static instance(): ScopeChainSidebarPane;
    /**
     * @deprecated Required for legacy web tests via DebuggerTestRunner.js
     */
    get treeOutline(): ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline | null;
    flavorChanged(callFrame: StackTrace.StackTrace.DebuggableFrameFlavor | null): void;
    performUpdate(): void;
    /**
     * @deprecated Hook for legacy web tests
     */
    sidebarPaneUpdatedForTest(): void;
}
export {};
