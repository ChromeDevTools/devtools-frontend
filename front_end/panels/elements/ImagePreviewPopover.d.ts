import type * as Platform from '../../core/platform/platform.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
/**
 * ImagePreviewPopover sets listeners on the container element to display
 * an image preview if needed. The image URL comes from the event (mouseover) target
 * in a property identified by HrefSymbol. To enable preview for any child element
 * set the property HrefSymbol.
 */
export declare class ImagePreviewPopover {
    #private;
    private readonly getLinkElement;
    private readonly popover;
    constructor(container: HTMLElement, getLinkElement: (arg0: Event) => Element | null, getNodeFeatures: (arg0: Element) => Promise<Components.ImagePreview.PrecomputedFeatures | undefined>);
    private handleRequest;
    hide(): void;
    static setImageUrl(element: Element, url: Platform.DevToolsPath.UrlString): Element;
    static getImageURL(element: Element): Platform.DevToolsPath.UrlString | undefined;
}
