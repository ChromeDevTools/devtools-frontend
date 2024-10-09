// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {type InsightResult, type InsightSetContext, type RequiredData} from './types.js';

// Due to the way that DevTools throttling works we cannot see if server response took less than ~570ms.
// We set our failure threshold to 600ms to avoid those false positives but we want devs to shoot for 100ms.
const TOO_SLOW_THRESHOLD_MS = 600;
const TARGET_MS = 100;

// Threshold for compression savings.
const IGNORE_THRESHOLD_IN_BYTES = 1400;

export type DocumentLatencyInsightResult = InsightResult<{
  data?: {
    serverResponseTime: Types.Timing.MilliSeconds,
    serverResponseTooSlow: boolean,
    redirectDuration: Types.Timing.MilliSeconds,
    uncompressedResponseBytes: number,
    documentRequest?: Types.Events.SyntheticNetworkRequest,
  },
}>;

export function deps(): ['Meta', 'NetworkRequests'] {
  return ['Meta', 'NetworkRequests'];
}

function getServerResponseTime(request: Types.Events.SyntheticNetworkRequest): Types.Timing.MilliSeconds|null {
  const timing = request.args.data.timing;
  if (!timing) {
    return null;
  }

  const ms = Helpers.Timing.microSecondsToMilliseconds(request.args.data.syntheticData.waiting);
  return Math.round(ms) as Types.Timing.MilliSeconds;
}

function getCompressionSavings(request: Types.Events.SyntheticNetworkRequest): number {
  // Check from headers if compression was already applied.
  // Older devtools logs are lower case, while modern logs are Cased-Like-This.
  const patterns = [
    /^content-encoding$/i,
    /^x-content-encoding-over-network$/i,
  ];
  const compressionTypes = ['gzip', 'br', 'deflate', 'zstd'];
  const isCompressed = request.args.data.responseHeaders.some(
      header => patterns.some(p => header.name.match(p)) && compressionTypes.includes(header.value));
  if (isCompressed) {
    return 0;
  }

  // We don't know how many bytes this asset used on the network, but we can guess it was
  // roughly the size of the content gzipped.
  // See https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/optimize-encoding-and-transfer for specific CSS/Script examples
  // See https://discuss.httparchive.org/t/file-size-and-compression-savings/145 for fallback multipliers
  // See https://letstalkaboutwebperf.com/en/gzip-brotli-server-config/ for MIME types to compress
  const originalSize = request.args.data.decodedBodyLength;
  let estimatedSavings = 0;
  switch (request.args.data.mimeType) {
    case 'text/css':
      // Stylesheets tend to compress extremely well.
      estimatedSavings = Math.round(originalSize * 0.8);
      break;
    case 'text/html':
    case 'text/javascript':
      // Scripts and HTML compress fairly well too.
      estimatedSavings = Math.round(originalSize * 0.67);
      break;
    case 'text/plain':
    case 'text/xml':
    case 'text/x-component':
    case 'application/javascript':
    case 'application/json':
    case 'application/manifest+json':
    case 'application/vnd.api+json':
    case 'application/xml':
    case 'application/xhtml+xml':
    case 'application/rss+xml':
    case 'application/atom+xml':
    case 'application/vnd.ms-fontobject':
    case 'application/x-font-ttf':
    case 'application/x-font-opentype':
    case 'application/x-font-truetype':
    case 'image/svg+xml':
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon':
    case 'font/ttf':
    case 'font/eot':
    case 'font/otf':
    case 'font/opentype':
      // Use the average savings in HTTPArchive.
      estimatedSavings = Math.round(originalSize * 0.5);
      break;
    default:  // Any other MIME types are likely already compressed.
  }
  // Check if the estimated savings are greater than the byte ignore threshold.
  // Note that the estimated gzip savings are always more than 10%, so there is
  // no percent threshold.
  return estimatedSavings < IGNORE_THRESHOLD_IN_BYTES ? 0 : estimatedSavings;
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): DocumentLatencyInsightResult {
  if (!context.navigation) {
    return {};
  }

  const documentRequest =
      parsedTrace.NetworkRequests.byTime.find(req => req.args.data.requestId === context.navigationId);
  if (!documentRequest) {
    throw new Error('missing document request');
  }

  const serverResponseTime = getServerResponseTime(documentRequest);
  if (serverResponseTime === null) {
    throw new Error('missing document request timing');
  }

  const serverResponseTooSlow = serverResponseTime > TOO_SLOW_THRESHOLD_MS;

  let overallSavingsMs = 0;
  if (serverResponseTime > TOO_SLOW_THRESHOLD_MS) {
    overallSavingsMs = Math.max(serverResponseTime - TARGET_MS, 0);
  }

  const redirectDuration = Math.round(documentRequest.args.data.syntheticData.redirectionDuration / 1000);
  overallSavingsMs += redirectDuration;

  const metricSavings = {
    FCP: overallSavingsMs as Types.Timing.MilliSeconds,
    LCP: overallSavingsMs as Types.Timing.MilliSeconds,
  };

  return {
    relatedEvents: [documentRequest],
    data: {
      serverResponseTime,
      serverResponseTooSlow,
      redirectDuration: Types.Timing.MilliSeconds(redirectDuration),
      uncompressedResponseBytes: getCompressionSavings(documentRequest),
      documentRequest,
    },
    metricSavings,
  };
}
