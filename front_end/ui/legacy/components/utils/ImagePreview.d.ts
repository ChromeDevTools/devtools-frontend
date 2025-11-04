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
        precomputedFeatures: (PrecomputedFeatures | undefined);
        imageAltText: (string | undefined);
        align: Align;
        hideFileData?: boolean;
    } | undefined): Promise<HTMLDivElement | null>;
    static loadDimensionsForNode(node: SDK.DOMModel.DOMNode): Promise<PrecomputedFeatures | undefined>;
    static defaultAltTextForImageURL(url: Platform.DevToolsPath.UrlString): string;
}
