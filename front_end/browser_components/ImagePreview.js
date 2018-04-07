// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

BrowserComponents.ImagePreview = class {
  /**
   * @param {!SDK.Target} target
   * @param {string} originalImageURL
   * @param {boolean} showDimensions
   * @param {!Object=} precomputedFeatures
   * @return {!Promise<?Element>}
   */
  static build(target, originalImageURL, showDimensions, precomputedFeatures) {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel);
    if (!resourceTreeModel)
      return Promise.resolve(/** @type {?Element} */ (null));
    let resource = resourceTreeModel.resourceForURL(originalImageURL);
    let imageURL = originalImageURL;
    if (!isImageResource(resource) && precomputedFeatures && precomputedFeatures.currentSrc) {
      imageURL = precomputedFeatures.currentSrc;
      resource = resourceTreeModel.resourceForURL(imageURL);
    }
    if (!isImageResource(resource))
      return Promise.resolve(/** @type {?Element} */ (null));

    let fulfill;
    const promise = new Promise(x => fulfill = x);
    const imageElement = createElement('img');
    imageElement.addEventListener('load', buildContent, false);
    imageElement.addEventListener('error', () => fulfill(null), false);
    resource.populateImageSource(imageElement);
    return promise;

    /**
     * @param {?SDK.Resource} resource
     * @return {boolean}
     */
    function isImageResource(resource) {
      return !!resource && resource.resourceType() === Common.resourceTypes.Image;
    }

    function buildContent() {
      const container = createElement('table');
      UI.appendStyle(container, 'browser_components/imagePreview.css');
      container.className = 'image-preview-container';
      const naturalWidth = precomputedFeatures ? precomputedFeatures.naturalWidth : imageElement.naturalWidth;
      const naturalHeight = precomputedFeatures ? precomputedFeatures.naturalHeight : imageElement.naturalHeight;
      const offsetWidth = precomputedFeatures ? precomputedFeatures.offsetWidth : naturalWidth;
      const offsetHeight = precomputedFeatures ? precomputedFeatures.offsetHeight : naturalHeight;
      let description;
      if (showDimensions) {
        if (offsetHeight === naturalHeight && offsetWidth === naturalWidth) {
          description = Common.UIString('%d \xd7 %d pixels', offsetWidth, offsetHeight);
        } else {
          description = Common.UIString(
              '%d \xd7 %d pixels (Natural: %d \xd7 %d pixels)', offsetWidth, offsetHeight, naturalWidth, naturalHeight);
        }
      }

      container.createChild('tr').createChild('td', 'image-container').appendChild(imageElement);
      if (description)
        container.createChild('tr').createChild('td').createChild('span', 'description').textContent = description;
      if (imageURL !== originalImageURL) {
        container.createChild('tr').createChild('td').createChild('span', 'description').textContent =
            String.sprintf('currentSrc: %s', imageURL.trimMiddle(100));
      }
      fulfill(container);
    }
  }
};
