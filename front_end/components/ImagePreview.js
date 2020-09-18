// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/** @typedef {{
 * renderedWidth: number,
 * renderedHeight: number,
 * currentSrc: (string|undefined)
 * }}
 */
// @ts-ignore typedef
export let PrecomputedFeatures;

export class ImagePreview {
  /**
   * @param {!SDK.SDKModel.Target} target
   * @param {string} originalImageURL
   * @param {boolean} showDimensions
   * @param {!{precomputedFeatures: (!PrecomputedFeatures|undefined), imageAltText: (string|undefined)}=} options
   * @return {!Promise<?Element>}
   */
  static build(
      target, originalImageURL, showDimensions, options = {precomputedFeatures: undefined, imageAltText: undefined}) {
    const {precomputedFeatures, imageAltText} = options;
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return Promise.resolve(/** @type {?Element} */ (null));
    }
    let resource = resourceTreeModel.resourceForURL(originalImageURL);
    let imageURL = originalImageURL;
    if (!isImageResource(resource) && precomputedFeatures && precomputedFeatures.currentSrc) {
      imageURL = precomputedFeatures.currentSrc;
      resource = resourceTreeModel.resourceForURL(imageURL);
    }
    if (!isImageResource(resource)) {
      return Promise.resolve(/** @type {?Element} */ (null));
    }

    /** @type {function(*):void} */
    let fulfill;
    const promise = new Promise(x => {
      fulfill = x;
    });
    const imageElement = /** @type{!HTMLImageElement} */ (document.createElement('img'));
    imageElement.addEventListener('load', buildContent, false);
    imageElement.addEventListener('error', () => fulfill(null), false);
    if (imageAltText) {
      imageElement.alt = imageAltText;
    }
    resource.populateImageSource(imageElement);
    return promise;

    /**
     * @param {?SDK.Resource.Resource} resource
     * @return {boolean}
     */
    function isImageResource(resource) {
      return !!resource && resource.resourceType() === Common.ResourceType.resourceTypes.Image;
    }

    function buildContent() {
      const container = document.createElement('table');
      UI.Utils.appendStyle(container, 'components/imagePreview.css');
      container.className = 'image-preview-container';
      const intrinsicWidth = imageElement.naturalWidth;
      const intrinsicHeight = imageElement.naturalHeight;
      const renderedWidth = precomputedFeatures ? precomputedFeatures.renderedWidth : intrinsicWidth;
      const renderedHeight = precomputedFeatures ? precomputedFeatures.renderedHeight : intrinsicHeight;
      let description;
      if (showDimensions) {
        if (renderedHeight !== intrinsicHeight || renderedWidth !== intrinsicWidth) {
          description = ls`${renderedWidth} × ${renderedHeight} pixels (intrinsic: ${intrinsicWidth} × ${
              intrinsicHeight} pixels)`;
        } else {
          description = ls`${renderedWidth} × ${renderedHeight} pixels`;
        }
      }

      container.createChild('tr').createChild('td', 'image-container').appendChild(imageElement);
      if (description) {
        container.createChild('tr').createChild('td').createChild('span', 'description').textContent = description;
      }
      if (imageURL !== originalImageURL) {
        container.createChild('tr').createChild('td').createChild('span', 'description').textContent =
            Platform.StringUtilities.sprintf('currentSrc: %s', imageURL.trimMiddle(100));
      }
      fulfill(container);
    }
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {!Promise<!PrecomputedFeatures|undefined>}
   */
  static async loadDimensionsForNode(node) {
    if (!node.nodeName() || node.nodeName().toLowerCase() !== 'img') {
      return;
    }

    const object = await node.resolveToObject('');

    if (!object) {
      return;
    }

    const featuresObject = object.callFunctionJSON(features, undefined);
    object.release();
    return featuresObject;

    /**
     * @return {!PrecomputedFeatures}
     * @suppressReceiverCheck
     * @this {!HTMLImageElement}
     */
    function features() {
      return {renderedWidth: this.width, renderedHeight: this.height, currentSrc: this.currentSrc};
    }
  }

  /**
   * @param {string} url
   * @return {string}
   */
  static defaultAltTextForImageURL(url) {
    const parsedImageURL = new Common.ParsedURL.ParsedURL(url);
    const imageSourceText = parsedImageURL.isValid ? parsedImageURL.displayName : ls`unknown source`;
    return ls`Image from ${imageSourceText}`;
  }
}
