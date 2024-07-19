// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as TraceEngine from '../../../models/trace/trace.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';

export enum NetworkCategory {
  Doc = 'Doc',
  CSS = 'CSS',
  JS = 'JS',
  Font = 'Font',
  Img = 'Img',
  Media = 'Media',
  Wasm = 'Wasm',
  Other = 'Other',
}

function syntheticNetworkRequestCategory(request: TraceEngine.Types.TraceEvents.SyntheticNetworkRequest):
    NetworkCategory {
  switch (request.args.data.mimeType) {
    case 'text/html':
      return NetworkCategory.Doc;
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
      return NetworkCategory.Img;
    case 'audio/aac':
    case 'audio/midi':
    case 'audio/x-midi':
    case 'audio/mpeg':
    case 'audio/ogg':
    case 'audio/wav':
    case 'audio/webm':
      return NetworkCategory.Media;
    case 'font/opentype':
    case 'font/woff2':
    case 'font/ttf':
    case 'application/font-woff':
      return NetworkCategory.Font;
    case 'application/wasm':
      return NetworkCategory.Wasm;
    default:
      return NetworkCategory.Other;
  }
}

export function colorForNetworkCategory(category: NetworkCategory): string {
  let cssVarName = '--app-color-system';
  switch (category) {
    case NetworkCategory.Doc:
      cssVarName = '--app-color-doc';
      break;
    case NetworkCategory.JS:
      cssVarName = '--app-color-scripting';
      break;
    case NetworkCategory.CSS:
      cssVarName = '--app-color-css';
      break;
    case NetworkCategory.Img:
      cssVarName = '--app-color-image';
      break;
    case NetworkCategory.Media:
      cssVarName = '--app-color-media';
      break;
    case NetworkCategory.Font:
      cssVarName = '--app-color-font';
      break;
    case NetworkCategory.Wasm:
      cssVarName = '--app-color-wasm';
      break;
    case NetworkCategory.Other:
    default:
      cssVarName = '--app-color-system';
      break;
  }
  return ThemeSupport.ThemeSupport.instance().getComputedValue(cssVarName);
}

export function colorForNetworkRequest(request: TraceEngine.Types.TraceEvents.SyntheticNetworkRequest): string {
  const category = syntheticNetworkRequestCategory(request);
  return colorForNetworkCategory(category);
}
