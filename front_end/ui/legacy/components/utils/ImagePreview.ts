// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';

import imagePreviewStyles from './imagePreview.css.js';

const UIStrings = {
  /**
   * @description Fallback text used in image preview alt text when the image source is unknown.
   */
  unknownSource: 'Unknown source',
  /**
   * @description Alt text for an image preview displaying its source.
   * @example {example.com} PH1
   */
  imageFromS: 'Image from {PH1}',
  /**
   * @description Label for the file size row in an image preview.
   */
  fileSize: 'File size',
  /**
   * @description Label for the intrinsic dimensions row in an image preview.
   */
  intrinsicSize: 'Intrinsic size',
  /**
   * @description Label for the rendered dimensions row in an image preview.
   */
  renderedSize: 'Rendered size',
  /**
   * @description Label for the source URL row in an image preview.
   */
  currentSource: 'Current source',
  /**
   * @description Label for the rendered aspect ratio row in an image preview.
   */
  renderedAspectRatio: 'Rendered aspect ratio',
  /**
   * @description Label for the intrinsic aspect ratio row in an image preview.
   */
  intrinsicAspectRatio: 'Intrinsic aspect ratio',
} as const;
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
      originalImageURL: Platform.DevToolsPath.UrlString,
      showDimensions: boolean,
      options: {
        align: Align,
        precomputedFeatures?: PrecomputedFeatures,
        imageAltText?: string,
        hideFileData?: boolean,
      } = {align: Align.CENTER},
      ): Promise<HTMLDivElement|null> {
    const {precomputedFeatures, imageAltText, align} = options;

    let resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(SDK.TargetManager.TargetManager.instance(),
                                                                          originalImageURL);
    let imageURL = originalImageURL;
    if (!isImageResource(resource) && precomputedFeatures?.currentSrc) {
      imageURL = precomputedFeatures.currentSrc;
      resource =
          SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(SDK.TargetManager.TargetManager.instance(), imageURL);
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

    return await new Promise(resolve => {
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
        shadowRoot.createChild('style').textContent = imagePreviewStyles;
        const container = shadowRoot.createChild('table');
        container.className = 'image-preview-container';

        const imageRow = container.createChild('tr').createChild('td', 'image-container');
        imageRow.colSpan = 2;

        const link = imageRow.createChild('div', ` ${align}`);
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

        if (!options.hideFileData) {
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
        }
        resolve(shadowBoundary);
      }
    });
  }

  static defaultAltTextForImageURL(url: Platform.DevToolsPath.UrlString): string {
    const parsedImageURL = new Common.ParsedURL.ParsedURL(url);
    const imageSourceText = parsedImageURL.isValid ? parsedImageURL.displayName : i18nString(UIStrings.unknownSource);
    return i18nString(UIStrings.imageFromS, {PH1: imageSourceText});
  }
}

export async function loadPrecomputedFeatures(node?: SDK.DOMModel.DOMNode|null):
    Promise<PrecomputedFeatures|undefined> {
  if (!node) {
    return undefined;
  }
  if (!node.nodeName() || node.nodeName().toLowerCase() !== 'img') {
    return undefined;
  }

  const object = await node.resolveToObject('');

  if (!object) {
    return undefined;
  }

  const featuresObject = await object.callFunctionJSON(features, undefined);
  object.release();
  return featuresObject ?? undefined;

  function features(this: HTMLImageElement): PrecomputedFeatures {
    return {
      renderedWidth: this.width,
      renderedHeight: this.height,
      currentSrc: this.currentSrc as Platform.DevToolsPath.UrlString,
    };
  }
}
