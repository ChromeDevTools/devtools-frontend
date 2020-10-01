// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Components from '../components/components.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

/**
 * ImagePreviewPopover sets listeners on the container element to display
 * an image preview if needed. The image URL comes from the event (mouseover) target
 * in a propery identified by HrefSymbol. To enable preview for any child element
 * set the property HrefSymbol.
 */
export class ImagePreviewPopover {
  /**
    * @param {!Element} container
    * @param {function(!Event):?Element} getLinkElement
    * @param {function(!Element):?SDK.DOMModel.DOMNode} getDOMNode
    */
  constructor(container, getLinkElement, getDOMNode) {
    this._getLinkElement = getLinkElement;
    this._getDOMNode = getDOMNode;
    this._popover = new UI.PopoverHelper.PopoverHelper(container, this._handleRequest.bind(this));
    this._popover.setHasPadding(true);
    this._popover.setTimeout(0, 100);
  }

  /**
    * @param {!Event} event
    * @return {?UI.PopoverHelper.PopoverRequest}
    */
  _handleRequest(event) {
    const link = this._getLinkElement(event);
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
      show: async popover => {
        const node = this._getDOMNode(/** @type {!Element} */ (link));
        if (!node) {
          return false;
        }
        const precomputedFeatures = await Components.ImagePreview.ImagePreview.loadDimensionsForNode(node);
        const preview = await Components.ImagePreview.ImagePreview.build(
            node.domModel().target(), href, true, {imageAltText: undefined, precomputedFeatures});
        if (preview) {
          popover.contentElement.appendChild(preview);
        }
        return !!preview;
      }
    };
  }

  hide() {
    this._popover.hidePopover();
  }

  /**
     * @param {!Element} element
     * @param {string} url
     */
  static setImageUrl(element, url) {
    elementToURLMap.set(element, url);
    return element;
  }

  /**
   * @param {!Element} element
   */
  static getImageURL(element) {
    return elementToURLMap.get(element);
  }
}

/** @type {!WeakMap<!Element, string>} */
const elementToURLMap = new WeakMap();
