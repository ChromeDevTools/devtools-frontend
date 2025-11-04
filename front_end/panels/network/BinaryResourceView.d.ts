import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class BinaryResourceView extends UI.Widget.VBox {
    private readonly binaryResourceViewFactory;
    private readonly toolbar;
    private readonly binaryViewObjects;
    private binaryViewTypeSetting;
    private binaryViewTypeCombobox;
    private readonly copiedText;
    private addFadeoutSettimeoutId;
    private lastView;
    constructor(content: TextUtils.StreamingContentData.StreamingContentData, contentUrl: Platform.DevToolsPath.UrlString, resourceType: Common.ResourceType.ResourceType, element?: HTMLElement);
    private getCurrentViewObject;
    private copySelectedViewToClipboard;
    private updateView;
    private binaryViewTypeChanged;
    addCopyToContextMenu(contextMenu: UI.ContextMenu.ContextMenu, submenuItemText: string): void;
}
export declare class BinaryViewObject {
    type: string;
    label: string;
    copiedMessage: string;
    content: () => string;
    private createViewFn;
    private view;
    constructor(type: string, label: string, copiedMessage: string, createViewFn: () => UI.Widget.Widget, content: () => string);
    getView(): UI.Widget.Widget;
}
