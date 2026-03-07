import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
export interface PrecomputedFeatures {
    renderedWidth: number;
    renderedHeight: number;
    currentSrc?: Platform.DevToolsPath.UrlString;
}
export declare const enum Align {
    START = "start",
    CENTER = "center"
}
export declare class ImagePreview {
    static build(originalImageURL: Platform.DevToolsPath.UrlString, showDimensions: boolean, options?: {
        align: Align;
        precomputedFeatures?: PrecomputedFeatures;
        imageAltText?: string;
        hideFileData?: boolean;
    }): Promise<HTMLDivElement | null>;
    static defaultAltTextForImageURL(url: Platform.DevToolsPath.UrlString): string;
}
export declare function loadPrecomputedFeatures(node?: SDK.DOMModel.DOMNode | null): Promise<PrecomputedFeatures | undefined>;
