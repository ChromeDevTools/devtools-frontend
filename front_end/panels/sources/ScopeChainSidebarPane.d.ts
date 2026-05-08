import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ScopeChainSidebarPane extends UI.Widget.VBox implements UI.ContextFlavorListener.ContextFlavorListener {
    #private;
    private readonly treeOutline;
    private readonly expandController;
    private readonly linkifier;
    private infoElement;
    private constructor();
    static instance(): ScopeChainSidebarPane;
    treeOutlineForTest(): ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline;
    flavorChanged(callFrame: StackTrace.StackTrace.DebuggableFrameFlavor | null): void;
    focus(): void;
    private buildScopeTreeOutline;
    private createScopeSectionTreeElement;
    sidebarPaneUpdatedForTest(): void;
}
