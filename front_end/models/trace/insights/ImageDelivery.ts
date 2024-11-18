// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {InsightCategory, type InsightModel, type InsightSetContext, type RequiredData} from './types.js';

const UIStrings = {
  /**
   * @description Title of an insight that recommends ways to reduce the size of images downloaded and used on the page.
   */
  title: 'Improve image delivery',
  /**
   * @description Description of an insight that recommends ways to reduce the size of images downloaded and used on the page.
   */
  description:
      'Reducing the download time of images can improve the perceived load time of the page and LCP. [Learn more about optimizing image size](https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images/)',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/ImageDelivery.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * Even JPEGs with lots of detail can usually be compressed down to <1 byte per pixel
 * Using 4:2:2 subsampling already gets an uncompressed bitmap to 2 bytes per pixel.
 * The compression ratio for JPEG is usually somewhere around 10:1 depending on content, so
 * 8:1 is a reasonable expectation for web content which is 1.5MB for a 6MP image.
 *
 * WebP usually gives ~20% additional savings on top of that, so we will assume 10:1 for WebP.
 * This is quite pessimistic as their study shows a photographic compression ratio of ~29:1.
 * https://developers.google.com/speed/webp/docs/webp_lossless_alpha_study#results
 *
 * AVIF usually gives ~20% additional savings on top of WebP, so we will use 12:1 for AVIF.
 * This is quite pessimistic as Netflix study shows a photographic compression ratio of ~40:1
 * (0.4 *bits* per pixel at SSIM 0.97).
 * https://netflixtechblog.com/avif-for-next-generation-image-coding-b1d75675fe4
 */
const TARGET_BYTES_PER_PIXEL_AVIF = 2 * 1 / 12;

/**
 * If GIFs are above this size, we'll flag them
 * See https://github.com/GoogleChrome/lighthouse/pull/4885#discussion_r178406623 and https://github.com/GoogleChrome/lighthouse/issues/4696#issuecomment-370979920
 */
const GIF_SIZE_THRESHOLD = 100 * 1024;

const BYTE_SAVINGS_THRESHOLD = 4096;

export function deps(): ['NetworkRequests', 'Meta', 'ImagePainting'] {
  return ['NetworkRequests', 'Meta', 'ImagePainting'];
}

export interface ImageOptimization {
  type: 'modern-format-or-compression'|'compression'|'video-format'|'responsive-size';
  byteSavings: number;
}

export interface OptimizableImage {
  request: Types.Events.SyntheticNetworkRequest;
  optimizations: ImageOptimization[];
  /**
   * If the an image resource has multiple `PaintImage`s, we compare its intrinsic size to the largest of the displayed sizes.
   *
   * It is theoretically possible for `PaintImage` events with the same URL to have different intrinsic sizes.
   * However, this should be rare because it requires serving different images from the same URL.
   */
  largestImagePaint: Types.Events.PaintImage;
}

export type ImageDeliveryInsightModel = InsightModel<{
  optimizableImages: OptimizableImage[],
}>;

function finalize(partialModel: Omit<ImageDeliveryInsightModel, 'title'|'description'|'category'>):
    ImageDeliveryInsightModel {
  return {
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.LCP,
    ...partialModel,
    relatedEvents: partialModel.optimizableImages.map(image => image.request),
  };
}

/**
 * Calculate rough savings percentage based on 1000 real gifs transcoded to video
 * https://github.com/GoogleChrome/lighthouse/issues/4696#issuecomment-380296510
 */
function estimateGIFPercentSavings(request: Types.Events.SyntheticNetworkRequest): number {
  return Math.round((29.1 * Math.log10(request.args.data.decodedBodyLength) - 100.7)) / 100;
}

function getPixelCounts(paintImage: Types.Events.PaintImage): {displayedPixels: number, filePixels: number} {
  return {
    filePixels: paintImage.args.data.srcWidth * paintImage.args.data.srcHeight,
    displayedPixels: paintImage.args.data.width * paintImage.args.data.height,
  };
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): ImageDeliveryInsightModel {
  const isWithinContext = (event: Types.Events.Event): boolean => Helpers.Timing.eventIsInBounds(event, context.bounds);

  const contextRequests = parsedTrace.NetworkRequests.byTime.filter(isWithinContext);

  const optimizableImages: OptimizableImage[] = [];
  for (const request of contextRequests) {
    if (request.args.data.resourceType !== 'Image') {
      continue;
    }

    const imagePaints =
        parsedTrace.ImagePainting.paintImageEventForUrl.get(request.args.data.url)?.filter(isWithinContext);

    // This will filter out things like preloaded image requests where an image file is downloaded
    // but never rendered on the page.
    if (!imagePaints?.length) {
      continue;
    }

    const largestImagePaint = imagePaints.reduce((prev, curr) => {
      const prevPixels = getPixelCounts(prev).displayedPixels;
      const currPixels = getPixelCounts(curr).displayedPixels;
      return prevPixels > currPixels ? prev : curr;
    });

    const {
      filePixels: imageFilePixels,
      displayedPixels: largestImageDisplayPixels,
    } = getPixelCounts(largestImagePaint);

    // Decoded body length is almost always the right one to be using because of the below:
    //     `encodedDataLength = decodedBodyLength + headers`.
    // HOWEVER, there are some cases where an image is compressed again over the network and transfer size
    // is smaller (see https://github.com/GoogleChrome/lighthouse/pull/4968).
    // Use the min of the two numbers to be safe.
    const imageBytes = Math.min(request.args.data.decodedBodyLength, request.args.data.encodedDataLength);

    const bytesPerPixel = imageBytes / imageFilePixels;

    let optimizations: ImageOptimization[] = [];
    if (request.args.data.mimeType === 'image/gif') {
      if (imageBytes > GIF_SIZE_THRESHOLD) {
        const percentSavings = estimateGIFPercentSavings(request);
        const byteSavings = Math.round(imageBytes * percentSavings);
        optimizations.push({type: 'video-format', byteSavings});
      }
    } else if (bytesPerPixel > TARGET_BYTES_PER_PIXEL_AVIF) {
      const idealAvifImageSize = Math.round(TARGET_BYTES_PER_PIXEL_AVIF * imageFilePixels);
      const byteSavings = imageBytes - idealAvifImageSize;
      if (request.args.data.mimeType !== 'image/webp' && request.args.data.mimeType !== 'image/avif') {
        optimizations.push({type: 'modern-format-or-compression', byteSavings});
      } else {
        optimizations.push({type: 'compression', byteSavings});
      }
    }

    const wastedPixelRatio = 1 - (largestImageDisplayPixels / imageFilePixels);
    if (wastedPixelRatio > 0) {
      const byteSavings = Math.round(wastedPixelRatio * imageBytes);
      optimizations.push({type: 'responsive-size', byteSavings});
    }

    optimizations = optimizations.filter(optimization => optimization.byteSavings > BYTE_SAVINGS_THRESHOLD);

    if (optimizations.length > 0) {
      optimizableImages.push({
        request,
        largestImagePaint,
        optimizations,
      });
    }
  }

  return finalize({
    optimizableImages,
  });
}
