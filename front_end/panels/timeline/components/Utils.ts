// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

export enum NetworkCategory {
  DOC = 'Doc',
  CSS = 'CSS',
  JS = 'JS',
  FONT = 'Font',
  IMG = 'Img',
  MEDIA = 'Media',
  WASM = 'Wasm',
  OTHER = 'Other',
}

function syntheticNetworkRequestCategory(request: Trace.Types.Events.SyntheticNetworkRequest): NetworkCategory {
  switch (request.args.data.mimeType) {
    case 'text/html':
      return NetworkCategory.DOC;
    case 'application/javascript':
    case 'application/x-javascript':
    case 'text/javascript':
      return NetworkCategory.JS;
    case 'text/css':
      return NetworkCategory.CSS;
    case 'image/gif':
    case 'image/jpeg':
    case 'image/png':
    case 'image/svg+xml':
    case 'image/webp':
    case 'image/x-icon':
      return NetworkCategory.IMG;
    case 'audio/aac':
    case 'audio/midi':
    case 'audio/x-midi':
    case 'audio/mpeg':
    case 'audio/ogg':
    case 'audio/wav':
    case 'audio/webm':
      return NetworkCategory.MEDIA;
    case 'font/opentype':
    case 'font/woff2':
    case 'font/ttf':
    case 'application/font-woff':
      return NetworkCategory.FONT;
    case 'application/wasm':
      return NetworkCategory.WASM;
    default:
      return NetworkCategory.OTHER;
  }
}

export function colorForNetworkCategory(category: NetworkCategory): string {
  let cssVarName = '--app-color-system';
  switch (category) {
    case NetworkCategory.DOC:
      cssVarName = '--app-color-doc';
      break;
    case NetworkCategory.JS:
      cssVarName = '--app-color-scripting';
      break;
    case NetworkCategory.CSS:
      cssVarName = '--app-color-css';
      break;
    case NetworkCategory.IMG:
      cssVarName = '--app-color-image';
      break;
    case NetworkCategory.MEDIA:
      cssVarName = '--app-color-media';
      break;
    case NetworkCategory.FONT:
      cssVarName = '--app-color-font';
      break;
    case NetworkCategory.WASM:
      cssVarName = '--app-color-wasm';
      break;
    case NetworkCategory.OTHER:
    default:
      cssVarName = '--app-color-system';
      break;
  }
  return ThemeSupport.ThemeSupport.instance().getComputedValue(cssVarName);
}

export function colorForNetworkRequest(request: Trace.Types.Events.SyntheticNetworkRequest): string {
  const category = syntheticNetworkRequestCategory(request);
  return colorForNetworkCategory(category);
}

export type MetricRating = 'good'|'needs-improvement'|'poor';
export type MetricThresholds = [number, number];

// TODO: Consolidate our metric rating logic with the trace engine.
export const LCP_THRESHOLDS = [2500, 4000] as MetricThresholds;
export const CLS_THRESHOLDS = [0.1, 0.25] as MetricThresholds;
export const INP_THRESHOLDS = [200, 500] as MetricThresholds;

export function rateMetric(value: number, thresholds: MetricThresholds): MetricRating {
  if (value <= thresholds[0]) {
    return 'good';
  }
  if (value <= thresholds[1]) {
    return 'needs-improvement';
  }
  return 'poor';
}

/**
 * Ensure to also include `metricValueStyles.css` when generating metric value elements.
 */
export function renderMetricValue(
    jslogContext: string, value: number|undefined, thresholds: MetricThresholds, format: (value: number) => string,
    options?: {dim?: boolean}): HTMLElement {
  const metricValueEl = document.createElement('span');
  metricValueEl.classList.add('metric-value');
  if (value === undefined) {
    metricValueEl.classList.add('waiting');
    metricValueEl.textContent = '-';
    return metricValueEl;
  }

  metricValueEl.textContent = format(value);
  const rating = rateMetric(value, thresholds);
  metricValueEl.classList.add(rating);
  // Ensure we log impressions of each section. We purposefully add this here
  // because if we don't have field data (dealt with in the undefined branch
  // above), we do not want to log an impression on it.
  metricValueEl.setAttribute('jslog', `${VisualLogging.section(jslogContext)}`);
  if (options?.dim) {
    metricValueEl.classList.add('dim');
  }

  return metricValueEl;
}
