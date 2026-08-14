import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as TextUtils from '../../core/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    binaryViewObjects: BinaryViewObject[];
    content: TextUtils.StreamingContentData.StreamingContentData;
    contentUrl: Platform.DevToolsPath.UrlString;
    resourceType: Common.ResourceType.ResourceType;
    activePositionPercentage: number;
    binaryViewTypeSetting: Common.Settings.Setting<string>;
    binaryViewTypeChanged: (event: Event) => void;
    copySelectedViewToClipboard: () => void;
    copiedText: UI.Toolbar.ToolbarText;
}
export type ViewOutput = undefined;
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare class BinaryResourceView extends UI.Widget.VBox {
    #private;
    private activePositionPercentage;
    private readonly binaryResourceViewFactory;
    private readonly streamingContent;
    private readonly contentUrl;
    private readonly resourceType;
    private readonly binaryViewObjects;
    private binaryViewTypeSetting;
    readonly copiedText: UI.Toolbar.ToolbarText;
    private addFadeoutSettimeoutId;
    private litContainer;
    constructor(content: TextUtils.StreamingContentData.StreamingContentData, contentUrl: Platform.DevToolsPath.UrlString, resourceType: Common.ResourceType.ResourceType, element?: HTMLElement);
    private getCurrentViewObject;
    copySelectedViewToClipboard(): void;
    performUpdate(): void;
    binaryViewTypeChanged(event: Event): void;
    addCopyToContextMenu(contextMenu: UI.ContextMenu.ContextMenu, submenuItemText: string): void;
}
export declare class BinaryViewObject {
    type: string;
    label: string;
    copiedMessage: string;
    content: () => string;
    constructor(type: string, label: string, copiedMessage: string, content: () => string);
}
