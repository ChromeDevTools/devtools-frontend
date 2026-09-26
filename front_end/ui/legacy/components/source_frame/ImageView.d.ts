import '../../../kit/kit.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import * as UI from '../../legacy.js';
export interface ViewInput {
    url: Platform.DevToolsPath.UrlString;
    imageSrc: string | null;
    isUnavailable: boolean;
    onImageLoad: (event: Event) => void;
    onContextMenu: (event: Event) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ImageView extends UI.View.SimpleView {
    #private;
    private url;
    private parsedURL;
    private readonly contentProvider;
    private uiSourceCode;
    private readonly sizeLabel;
    private readonly dimensionsLabel;
    private readonly aspectRatioLabel;
    private readonly mimeTypeLabel;
    private cachedContent?;
    constructor(mimeType: string, contentProvider: TextUtils.ContentProvider.ContentProvider, view?: View);
    performUpdate(): void;
    toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]>;
    wasShown(): void;
    disposeView(): void;
    private workingCopyCommitted;
    private updateContentIfNeeded;
    private contextMenu;
    private copyImageAsDataURL;
    private copyImageURL;
    private saveImage;
    private openInNewTab;
    private handleDrop;
}
