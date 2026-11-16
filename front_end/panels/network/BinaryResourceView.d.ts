import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    binaryViewObjects: BinaryViewObject[];
    content: TextUtils.StreamingContentData.StreamingContentData;
    contentUrl: Platform.DevToolsPath.UrlString;
    resourceType: Common.ResourceType.ResourceType;
    memory: Uint8Array<ArrayBuffer>;
    address: number;
    activePositionPercentage: number;
    binaryViewType: string;
    copiedText: string;
    copiedTextFadeout: boolean;
    onAddressChanged: (address: number) => void;
    binaryViewTypeChanged: (event: Event) => void;
    copySelectedViewToClipboard: () => void;
}
export interface ViewOutput {
    activeView?: SourceFrame.ResourceSourceFrame.ResourceSourceFrame;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class BinaryResourceView extends UI.Widget.VBox {
    #private;
    private activePositionPercentage;
    private readonly binaryResourceViewFactory;
    private readonly streamingContent;
    private readonly contentUrl;
    private readonly resourceType;
    private readonly binaryViewObjects;
    private binaryViewTypeSetting;
    constructor(content: TextUtils.StreamingContentData.StreamingContentData, contentUrl: Platform.DevToolsPath.UrlString, resourceType: Common.ResourceType.ResourceType, element?: HTMLElement, view?: View);
    wasShown(): void;
    willHide(): void;
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
