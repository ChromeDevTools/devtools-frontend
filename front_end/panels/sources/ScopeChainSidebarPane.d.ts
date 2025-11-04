import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ScopeChainSidebarPane extends UI.Widget.VBox implements UI.ContextFlavorListener.ContextFlavorListener {
    #private;
    private readonly treeOutline;
    private readonly expandController;
    private readonly linkifier;
    private infoElement;
    private constructor();
    static instance(): ScopeChainSidebarPane;
    flavorChanged(callFrame: SDK.DebuggerModel.CallFrame | null): void;
    focus(): void;
    private buildScopeTreeOutline;
    private createScopeSectionTreeElement;
    private sidebarPaneUpdatedForTest;
}
