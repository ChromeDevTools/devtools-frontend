import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ContextMenuProvider implements UI.ContextMenu
    .Provider<Workspace.UISourceCode.UISourceCode | SDK.Resource.Resource | SDK.NetworkRequest.NetworkRequest> {
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, contentProvider: TextUtils.ContentProvider.ContentProvider): void;
    private handleOverrideContent;
    private redirectOverrideToDeployedUiSourceCode;
    private getDeployedUiSourceCode;
}
