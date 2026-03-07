// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
/**
 * ImagePreviewPopover sets listeners on the container element to display
 * an image preview if needed. The image URL comes from the event (mouseover) target
 * in a property identified by HrefSymbol. To enable preview for any child element
 * set the property HrefSymbol.
 */
export class ImagePreviewPopover {
    getLinkElement;
    popover;
    #getNodeFeatures;
    constructor(container, getLinkElement, getNodeFeatures) {
        this.getLinkElement = getLinkElement;
        this.#getNodeFeatures = getNodeFeatures;
        this.popover =
            new UI.PopoverHelper.PopoverHelper(container, this.handleRequest.bind(this), 'elements.image-preview');
        this.popover.setTimeout(0, 100);
    }
    handleRequest(event) {
        const link = this.getLinkElement(event);
        if (!link) {
            return null;
        }
        const href = elementToURLMap.get(link);
        if (!href) {
            return null;
        }
        return {
            box: link.boxInWindow(),
            show: async (popover) => {
                const precomputedFeatures = await this.#getNodeFeatures(link);
                const preview = await Components.ImagePreview.ImagePreview.build(href, true, {
                    precomputedFeatures,
                    align: "center" /* Components.ImagePreview.Align.CENTER */,
                });
                if (preview) {
                    popover.contentElement.appendChild(preview);
                }
                return Boolean(preview);
            },
        };
    }
    hide() {
        this.popover.hidePopover();
    }
    static setImageUrl(element, url) {
        elementToURLMap.set(element, url);
        return element;
    }
    static getImageURL(element) {
        return elementToURLMap.get(element);
    }
}
const elementToURLMap = new WeakMap();
//# sourceMappingURL=ImagePreviewPopover.js.map