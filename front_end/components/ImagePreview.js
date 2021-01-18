// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Description in Image Preview
  *@example {500} PH1
  *@example {300} PH2
  *@example {200} PH3
  *@example {100} PH4
  */
  sSPxIntrinsicSSPx: '{PH1} × {PH2} px (intrinsic: {PH3} × {PH4} px)',
  /**
  *@description Description in Image Preview
  *@example {500} PH1
  *@example {500} PH2
  */
  sSPx: '{PH1} × {PH2} px',
  /**
  *@description Alt text description of an image's source
  */
  unknownSource: 'unknown source',
  /**
  *@description Text to indicate the source of an image
  *@example {example.com} PH1
  */
  imageFromS: 'Image from {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('components/ImagePreview.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
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
  static async build(
      target, originalImageURL, showDimensions, options = {precomputedFeatures: undefined, imageAltText: undefined}) {
    const {precomputedFeatures, imageAltText} = options;
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return /** @type {?Element} */ (null);
    }
    let resource = resourceTreeModel.resourceForURL(originalImageURL);
    let imageURL = originalImageURL;
    if (!isImageResource(resource) && precomputedFeatures && precomputedFeatures.currentSrc) {
      imageURL = precomputedFeatures.currentSrc;
      resource = resourceTreeModel.resourceForURL(imageURL);
    }
    if (!resource || !isImageResource(resource)) {
      return /** @type {?Element} */ (null);
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
      return resource !== null && resource.resourceType() === Common.ResourceType.resourceTypes.Image;
    }

    function buildContent() {
      const container = document.createElement('table');
      UI.Utils.appendStyle(container, 'components/imagePreview.css', {enableLegacyPatching: false});
      container.className = 'image-preview-container';
      const intrinsicWidth = imageElement.naturalWidth;
      const intrinsicHeight = imageElement.naturalHeight;
      const renderedWidth = precomputedFeatures ? precomputedFeatures.renderedWidth : intrinsicWidth;
      const renderedHeight = precomputedFeatures ? precomputedFeatures.renderedHeight : intrinsicHeight;
      let description;
      if (showDimensions) {
        if (renderedHeight !== intrinsicHeight || renderedWidth !== intrinsicWidth) {
          description = i18nString(
              UIStrings.sSPxIntrinsicSSPx,
              {PH1: renderedWidth, PH2: renderedHeight, PH3: intrinsicWidth, PH4: intrinsicHeight});
        } else {
          description = i18nString(UIStrings.sSPx, {PH1: renderedWidth, PH2: renderedHeight});
        }
      }

      container.createChild('tr').createChild('td', 'image-container').appendChild(imageElement);
      if (description) {
        container.createChild('tr').createChild('td').createChild('span', 'description').textContent = description;
      }
      if (imageURL !== originalImageURL) {
        container.createChild('tr').createChild('td').createChild('span', 'description').textContent =
            Platform.StringUtilities.sprintf('currentSrc: %s', Platform.StringUtilities.trimMiddle(imageURL, 100));
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
    const imageSourceText = parsedImageURL.isValid ? parsedImageURL.displayName : i18nString(UIStrings.unknownSource);
    return i18nString(UIStrings.imageFromS, {PH1: imageSourceText});
  }
}
