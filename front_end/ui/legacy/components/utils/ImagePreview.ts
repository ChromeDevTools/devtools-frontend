// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';

import imagePreviewStyles from './imagePreview.css.js';

const UIStrings = {
  /**
   *@description Alt text description of an image's source
   */
  unknownSource: 'unknown source',
  /**
   *@description Text to indicate the source of an image
   *@example {example.com} PH1
   */
  imageFromS: 'Image from {PH1}',
  /**
   * @description Title of the row that shows the file size of an image.
   */
  fileSize: 'File size:',
  /**
   * @description Title of the row that shows the intrinsic size of an image in pixels.
   */
  intrinsicSize: 'Intrinsic size:',
  /**
   * @description Title of the row that shows the rendered size of an image in pixels.
   */
  renderedSize: 'Rendered size:',
  /**
   * @description Title of the row that shows the current URL of an image.
   * https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-currentsrc.
   */
  currentSource: 'Current source:',
  /**
   * @description The rendered aspect ratio of an image.
   */
  renderedAspectRatio: 'Rendered aspect ratio:',
  /**
   * @description The intrinsic aspect ratio of an image.
   */
  intrinsicAspectRatio: 'Intrinsic aspect ratio:',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/utils/ImagePreview.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface PrecomputedFeatures {
  renderedWidth: number;
  renderedHeight: number;
  currentSrc?: Platform.DevToolsPath.UrlString;
}

export const enum Align {
  // 'start' means the table content will be start-aligned. For example:
  // title1       Description1
  // title22222   Description2222222222222
  START = 'start',
  // 'center' means the table content will be center-aligned. For example:
  //       title1 Description1
  //   title22222 Description2222222222222
  CENTER = 'center',
}

function isImageResource(resource: SDK.Resource.Resource|null): boolean {
  return resource !== null && resource.resourceType() === Common.ResourceType.resourceTypes.Image;
}

export class ImagePreview {
  static async build(
      target: SDK.Target.Target, originalImageURL: Platform.DevToolsPath.UrlString, showDimensions: boolean, options: {
        precomputedFeatures: (PrecomputedFeatures|undefined),
        imageAltText: (string|undefined),
        align: Align,
      }|undefined = {precomputedFeatures: undefined, imageAltText: undefined, align: Align.CENTER}):
      Promise<Element|null> {
    const {precomputedFeatures, imageAltText, align} = options;
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return null;
    }
    let resource = resourceTreeModel.resourceForURL(originalImageURL);
    let imageURL = originalImageURL;
    if (!isImageResource(resource) && precomputedFeatures && precomputedFeatures.currentSrc) {
      imageURL = precomputedFeatures.currentSrc;
      resource = resourceTreeModel.resourceForURL(imageURL);
    }
    if (!resource || !isImageResource(resource)) {
      return null;
    }
    const imageResource = resource;

    const displayName = resource.displayName;

    // When opening DevTools for the first time, base64 resource has no content.
    const content = resource.content ? resource.content : resource.url.split('base64,')[1];
    const contentSize = resource.contentSize();
    const resourceSize = contentSize ? contentSize : Platform.StringUtilities.base64ToSize(content);
    const resourceSizeText = resourceSize > 0 ? i18n.ByteUtilities.bytesToString(resourceSize) : '';

    return new Promise(resolve => {
      const imageElement = document.createElement('img');
      imageElement.addEventListener('load', buildContent, false);
      imageElement.addEventListener('error', () => resolve(null), false);
      if (imageAltText) {
        imageElement.alt = imageAltText;
      }
      void imageResource.populateImageSource(imageElement);

      function buildContent(): void {
        const shadowBoundary = document.createElement('div');
        const shadowRoot = shadowBoundary.attachShadow({mode: 'open'});
        shadowRoot.adoptedStyleSheets = [imagePreviewStyles];
        const container = shadowRoot.createChild('table');
        container.className = 'image-preview-container';

        const imageRow = (container.createChild('tr').createChild('td', 'image-container') as HTMLTableDataCellElement);
        imageRow.colSpan = 2;

        const link = (imageRow.createChild('div', ` ${align}`) as HTMLLinkElement);
        link.title = displayName;
        link.appendChild(imageElement);

        // Open image in new tab.
        link.addEventListener('click', () => {
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(imageURL);
        });

        const intrinsicWidth = imageElement.naturalWidth;
        const intrinsicHeight = imageElement.naturalHeight;
        const renderedWidth = precomputedFeatures ? precomputedFeatures.renderedWidth : intrinsicWidth;
        const renderedHeight = precomputedFeatures ? precomputedFeatures.renderedHeight : intrinsicHeight;
        if (showDimensions) {
          const renderedRow = container.createChild('tr', 'row');

          renderedRow.createChild('td', `title ${align}`).textContent = i18nString(UIStrings.renderedSize);
          renderedRow.createChild('td', 'description').textContent = `${renderedWidth} × ${renderedHeight} px`;

          const aspectRatioRow = container.createChild('tr', 'row');
          aspectRatioRow.createChild('td', `title ${align}`).textContent = i18nString(UIStrings.renderedAspectRatio);
          aspectRatioRow.createChild('td', 'description').textContent =
              Platform.NumberUtilities.aspectRatio(renderedWidth, renderedHeight);

          if (renderedHeight !== intrinsicHeight || renderedWidth !== intrinsicWidth) {
            const intrinsicRow = container.createChild('tr', 'row');
            intrinsicRow.createChild('td', `title ${align}`).textContent = i18nString(UIStrings.intrinsicSize);
            intrinsicRow.createChild('td', 'description').textContent = `${intrinsicWidth} × ${intrinsicHeight} px`;

            const intrinsicAspectRatioRow = container.createChild('tr', 'row');
            intrinsicAspectRatioRow.createChild('td', `title ${align}`).textContent =
                i18nString(UIStrings.intrinsicAspectRatio);
            intrinsicAspectRatioRow.createChild('td', 'description').textContent =
                Platform.NumberUtilities.aspectRatio(intrinsicWidth, intrinsicHeight);
          }
        }

        // File size
        const fileRow = container.createChild('tr', 'row');
        fileRow.createChild('td', `title ${align}`).textContent = i18nString(UIStrings.fileSize);
        fileRow.createChild('td', 'description').textContent = resourceSizeText;

        // Current source
        const originalRow = container.createChild('tr', 'row');
        originalRow.createChild('td', `title ${align}`).textContent = i18nString(UIStrings.currentSource);

        const sourceText = Platform.StringUtilities.trimMiddle(imageURL, 100);
        const sourceLink =
            (originalRow.createChild('td', 'description description-link').createChild('span', 'source-link') as
             HTMLLinkElement);
        sourceLink.textContent = sourceText;
        sourceLink.addEventListener('click', () => {
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(imageURL);
        });
        resolve(shadowBoundary);
      }
    });
  }

  static async loadDimensionsForNode(node: SDK.DOMModel.DOMNode): Promise<PrecomputedFeatures|undefined> {
    if (!node.nodeName() || node.nodeName().toLowerCase() !== 'img') {
      return;
    }

    const object = await node.resolveToObject('');

    if (!object) {
      return;
    }

    const featuresObject = await object.callFunctionJSON(features, undefined);
    object.release();
    return featuresObject;

    function features(this: HTMLImageElement): PrecomputedFeatures {
      return {
        renderedWidth: this.width,
        renderedHeight: this.height,
        currentSrc: this.currentSrc as Platform.DevToolsPath.UrlString,
      };
    }
  }

  static defaultAltTextForImageURL(url: Platform.DevToolsPath.UrlString): string {
    const parsedImageURL = new Common.ParsedURL.ParsedURL(url);
    const imageSourceText = parsedImageURL.isValid ? parsedImageURL.displayName : i18nString(UIStrings.unknownSource);
    return i18nString(UIStrings.imageFromS, {PH1: imageSourceText});
  }
}
