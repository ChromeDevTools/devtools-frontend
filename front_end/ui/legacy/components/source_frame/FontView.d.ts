import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as UI from '../../legacy.js';
export interface ViewInput {
    url: Platform.DevToolsPath.UrlString;
    fontFaceRule: string;
    fontFamily: string;
    previewFontSize: string;
    previewVisible: boolean;
}
export interface ViewOutput {
    measureDimensions?: () => {
        width: number;
        height: number;
    };
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class FontView extends UI.View.SimpleView {
    #private;
    private readonly url;
    private readonly contentProvider;
    private readonly mimeTypeLabel;
    constructor(mimeType: string, contentProvider: TextUtils.ContentProvider.ContentProvider, view?: View);
    toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]>;
    wasShown(): void;
    onResize(): void;
    performUpdate(): void;
}
