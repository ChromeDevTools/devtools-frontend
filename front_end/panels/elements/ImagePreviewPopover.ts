// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

/**
 * ImagePreviewPopover sets listeners on the container element to display
 * an image preview if needed. The image URL comes from the event (mouseover) target
 * in a propery identified by HrefSymbol. To enable preview for any child element
 * set the property HrefSymbol.
 */
export class ImagePreviewPopover {
  private readonly getLinkElement: (arg0: Event) => Element | null;
  private readonly getDOMNode: (arg0: Element) => SDK.DOMModel.DOMNode | null;
  private readonly popover: UI.PopoverHelper.PopoverHelper;
  constructor(
      container: Element, getLinkElement: (arg0: Event) => Element | null,
      getDOMNode: (arg0: Element) => SDK.DOMModel.DOMNode | null) {
    this.getLinkElement = getLinkElement;
    this.getDOMNode = getDOMNode;
    this.popover = new UI.PopoverHelper.PopoverHelper(container, this.handleRequest.bind(this));
    this.popover.setHasPadding(true);
    this.popover.setTimeout(0, 100);
  }

  private handleRequest(event: Event): UI.PopoverHelper.PopoverRequest|null {
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
      hide: undefined,
      show: async(popover: UI.GlassPane.GlassPane): Promise<boolean> => {
        const node = this.getDOMNode((link as Element));
        if (!node) {
          return false;
        }
        const precomputedFeatures = await Components.ImagePreview.ImagePreview.loadDimensionsForNode(node);
        const preview = await Components.ImagePreview.ImagePreview.build(
            node.domModel().target(), href as Platform.DevToolsPath.UrlString, true,
            {imageAltText: undefined, precomputedFeatures});
        if (preview) {
          popover.contentElement.appendChild(preview);
        }
        return Boolean(preview);
      },
    };
  }

  hide(): void {
    this.popover.hidePopover();
  }

  static setImageUrl(element: Element, url: Platform.DevToolsPath.UrlString): Element {
    elementToURLMap.set(element, url);
    return element;
  }

  static getImageURL(element: Element): Platform.DevToolsPath.UrlString|undefined {
    return elementToURLMap.get(element);
  }
}

const elementToURLMap = new WeakMap<Element, Platform.DevToolsPath.UrlString>();
