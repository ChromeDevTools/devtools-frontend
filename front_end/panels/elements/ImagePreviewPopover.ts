// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

/**
 * ImagePreviewPopover sets listeners on the container element to display
 * an image preview if needed. The image URL comes from the event (mouseover) target
 * in a property identified by HrefSymbol. To enable preview for any child element
 * set the property HrefSymbol.
 */
export class ImagePreviewPopover {
  private readonly getLinkElement: (arg0: Event) => Element | null;
  private readonly popover: UI.PopoverHelper.PopoverHelper;

  #getNodeFeatures: (link: Element) => Promise<Components.ImagePreview.PrecomputedFeatures|undefined>;

  constructor(
      container: HTMLElement, getLinkElement: (arg0: Event) => Element | null,
      getNodeFeatures: (arg0: Element) => Promise<Components.ImagePreview.PrecomputedFeatures|undefined>) {
    this.getLinkElement = getLinkElement;
    this.#getNodeFeatures = getNodeFeatures;
    this.popover =
        new UI.PopoverHelper.PopoverHelper(container, this.handleRequest.bind(this), 'elements.image-preview');
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
      show: async (popover: UI.GlassPane.GlassPane) => {
        const precomputedFeatures = await this.#getNodeFeatures(link);
        const preview = await Components.ImagePreview.ImagePreview.build(href, true, {
          precomputedFeatures,
          align: Components.ImagePreview.Align.CENTER,
        });
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
