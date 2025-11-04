import * as Persistence from '../../../models/persistence/persistence.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare class HeadersView extends UI.View.SimpleView {
    #private;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode);
    getComponent(): HeadersViewComponent;
    dispose(): void;
}
export interface HeadersViewComponentData {
    headerOverrides: Persistence.NetworkPersistenceManager.HeaderOverride[];
    uiSourceCode: Workspace.UISourceCode.UISourceCode;
    parsingError: boolean;
}
export declare class HeadersViewComponent extends HTMLElement {
    #private;
    constructor();
    set data(data: HeadersViewComponentData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-sources-headers-view': HeadersViewComponent;
    }
}
