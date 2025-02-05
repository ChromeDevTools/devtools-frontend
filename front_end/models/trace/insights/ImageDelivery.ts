// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {metricSavingsForWastedBytes} from './Common.js';
import {
  InsightCategory,
  type InsightModel,
  type InsightSetContext,
  type PartialInsightModel,
  type RequiredData,
} from './types.js';

export const UIStrings = {
  /**
   * @description Title of an insight that recommends ways to reduce the size of images downloaded and used on the page.
   */
  title: 'Improve image delivery',
  /**
   * @description Description of an insight that recommends ways to reduce the size of images downloaded and used on the page.
   */
  description:
      'Reducing the download time of images can improve the perceived load time of the page and LCP. [Learn more about optimizing image size](https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images/)',
  /**
   * @description Message displayed in a chip explaining that an image file size is large for the # of pixels it has and recommends possible adjustments to improve the image size.
   * @example {50 MB} PH1
   */
  useCompression: 'Increasing the image compression factor could improve this image\'s download size. (Est {PH1})',
  /**
   * @description Message displayed in a chip explaining that an image file size is large for the # of pixels it has and recommends possible adjustments to improve the image size.
   * @example {50 MB} PH1
   */
  useModernFormat:
      'Using a modern image format (WebP, AVIF) or increasing the image compression could improve this image\'s download size. (Est {PH1})',
  /**
   * @description Message displayed in a chip advising the user to use video formats instead of GIFs because videos generally have smaller file sizes.
   * @example {50 MB} PH1
   */
  useVideoFormat: 'Using video formats instead of GIFs can improve the download size of animated content. (Est {PH1})',
  /**
   * @description Message displayed in a chip explaining that an image was displayed on the page with dimensions much smaller than the image file dimensions.
   * @example {50 MB} PH1
   * @example {1000x500} PH2
   * @example {100x50} PH3
   */
  useResponsiveSize:
      'This image file is larger than it needs to be ({PH2}) for its displayed dimensions ({PH3}). Use responsive images to reduce the image download size. (Est {PH1})',
  /**
   * @description Column header for a table column containing network requests for images which can improve their file size (e.g. use a different format, increase compression, etc).
   */
  optimizeFile: 'Optimize file size',
  /**
   * @description Table row value representing the remaining items not shown in the table due to size constraints. This row will always represent at least 2 items.
   * @example {5} PH1
   */
  others: '{PH1} others',
  /**
   * @description Text status indicating that no potential optimizations were found for any image file
   */
  noOptimizableImages: 'No optimizable images',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/ImageDelivery.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

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

export enum ImageOptimizationType {
  ADJUST_COMPRESSION = 'ADJUST_COMPRESSION',
  MODERN_FORMAT_OR_COMPRESSION = 'MODERN_FORMAT_OR_COMPRESSION',
  VIDEO_FORMAT = 'VIDEO_FORMAT',
  RESPONSIVE_SIZE = 'RESPONSIVE_SIZE',
}

export type ImageOptimization = {
  type: Exclude<ImageOptimizationType, ImageOptimizationType.RESPONSIVE_SIZE>,
  byteSavings: number,
}|{
  type: ImageOptimizationType.RESPONSIVE_SIZE,
  byteSavings: number,
  fileDimensions: {width: number, height: number},
  displayDimensions: {width: number, height: number},
};

export interface OptimizableImage {
  request: Types.Events.SyntheticNetworkRequest;
  optimizations: ImageOptimization[];
  byteSavings: number;
  /**
   * If the an image resource has multiple `PaintImage`s, we compare its intrinsic size to the largest of the displayed sizes.
   *
   * It is theoretically possible for `PaintImage` events with the same URL to have different intrinsic sizes.
   * However, this should be rare because it requires serving different images from the same URL.
   */
  largestImagePaint: Types.Events.PaintImage;
}

export type ImageDeliveryInsightModel = InsightModel<typeof UIStrings, {
  /** Sorted by potential byte savings, then by size of image. */
  optimizableImages: OptimizableImage[],
  totalByteSavings: number,
}>;

function getOptimizationMessage(optimization: ImageOptimization): string {
  const byteSavingsText = i18n.ByteUtilities.bytesToString(optimization.byteSavings);
  switch (optimization.type) {
    case ImageOptimizationType.ADJUST_COMPRESSION:
      return i18nString(UIStrings.useCompression, {PH1: byteSavingsText});
    case ImageOptimizationType.MODERN_FORMAT_OR_COMPRESSION:
      return i18nString(UIStrings.useModernFormat, {PH1: byteSavingsText});
    case ImageOptimizationType.VIDEO_FORMAT:
      return i18nString(UIStrings.useVideoFormat, {PH1: byteSavingsText});
    case ImageOptimizationType.RESPONSIVE_SIZE:
      return i18nString(UIStrings.useResponsiveSize, {
        PH1: byteSavingsText,
        PH2: `${optimization.fileDimensions.width}x${optimization.fileDimensions.height}`,
        PH3: `${optimization.displayDimensions.width}x${optimization.displayDimensions.height}`,
      });
  }
}

function finalize(partialModel: PartialInsightModel<ImageDeliveryInsightModel>): ImageDeliveryInsightModel {
  return {
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.LCP,
    shouldShow: partialModel.optimizableImages.length > 0,
    ...partialModel,
    relatedEvents: new Map(
        partialModel.optimizableImages.map(image => [image.request, image.optimizations.map(getOptimizationMessage)])),
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

    if (request.args.data.mimeType === 'image/svg+xml') {
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
        optimizations.push({type: ImageOptimizationType.VIDEO_FORMAT, byteSavings});
      }
    } else if (bytesPerPixel > TARGET_BYTES_PER_PIXEL_AVIF) {
      const idealAvifImageSize = Math.round(TARGET_BYTES_PER_PIXEL_AVIF * imageFilePixels);
      const byteSavings = imageBytes - idealAvifImageSize;
      if (request.args.data.mimeType !== 'image/webp' && request.args.data.mimeType !== 'image/avif') {
        optimizations.push({type: ImageOptimizationType.MODERN_FORMAT_OR_COMPRESSION, byteSavings});
      } else {
        optimizations.push({type: ImageOptimizationType.ADJUST_COMPRESSION, byteSavings});
      }
    }

    // At this point (before looking at image size), the # of optimizations should only ever be 1 or 0
    // Math.max handles both cases correctly, and is defensive against future patches that would add
    // more than 1 format-specific optimization by this point.
    const imageByteSavingsFromFormat = Math.max(0, ...optimizations.map(o => o.byteSavings));
    let imageByteSavings = imageByteSavingsFromFormat;

    const wastedPixelRatio = 1 - (largestImageDisplayPixels / imageFilePixels);
    if (wastedPixelRatio > 0) {
      const byteSavings = Math.round(wastedPixelRatio * imageBytes);

      // This will compound the byte savings from any potential format changes with the image size
      // optimization added here.
      imageByteSavings += Math.round(wastedPixelRatio * (imageBytes - imageByteSavingsFromFormat));

      optimizations.push({
        type: ImageOptimizationType.RESPONSIVE_SIZE,
        byteSavings,
        fileDimensions: {
          width: Math.round(largestImagePaint.args.data.srcWidth),
          height: Math.round(largestImagePaint.args.data.srcHeight),
        },
        displayDimensions: {
          width: Math.round(largestImagePaint.args.data.width),
          height: Math.round(largestImagePaint.args.data.height),
        },
      });
    }

    optimizations = optimizations.filter(optimization => optimization.byteSavings > BYTE_SAVINGS_THRESHOLD);

    if (optimizations.length > 0) {
      optimizableImages.push({
        request,
        largestImagePaint,
        optimizations,
        byteSavings: imageByteSavings,
      });
    }
  }

  const wastedBytesByRequestId = new Map<string, number>();
  for (const image of optimizableImages) {
    wastedBytesByRequestId.set(image.request.args.data.requestId, image.byteSavings);
  }

  // Sort by savings, then by size of image.
  optimizableImages.sort((a, b) => {
    if (b.byteSavings !== a.byteSavings) {
      return b.byteSavings - a.byteSavings;
    }

    return b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength;
  });

  return finalize({
    optimizableImages,
    totalByteSavings: optimizableImages.reduce((total, img) => total + img.byteSavings, 0),
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
  });
}
