import '../../../kit/kit.js';
import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import { type TemplateResult } from '../../../lit/lit.js';
import * as UI from '../../legacy.js';
export interface ViewInput {
    url: Platform.DevToolsPath.UrlString;
    imageSrc: string | null;
    isUnavailable: boolean;
    onImageLoad: (event: Event) => void;
    onImageError: (event: Event) => void;
    onContextMenu: (event: Event) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare const enum Events {
    TOOLBAR_ITEMS_CHANGED = "ToolbarItemsChanged"
}
export interface EventTypes {
    [Events.TOOLBAR_ITEMS_CHANGED]: void;
}
declare const ImageViewBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.View.SimpleView>;
export declare class ImageView extends ImageViewBase {
    #private;
    constructor(mimeType: string, contentProvider: TextUtils.ContentProvider.ContentProvider, view?: View);
    performUpdate(): void;
    toolbarItems(): Promise<TemplateResult>;
    wasShown(): void;
    disposeView(): void;
}
export {};
