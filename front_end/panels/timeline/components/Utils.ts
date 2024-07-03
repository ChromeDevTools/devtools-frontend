// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as TraceEngine from '../../../models/trace/trace.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';

export const enum NetworkCategory {
  HTML = 'HTML',
  Script = 'Script',
  Style = 'Style',
  Media = 'Media',
  Other = 'Other',
}

function syntheticNetworkRequestCategory(request: TraceEngine.Types.TraceEvents.SyntheticNetworkRequest):
    NetworkCategory {
  switch (request.args.data.mimeType) {
    case 'text/html':
      return NetworkCategory.HTML;
    case 'application/javascript':
    case 'application/x-javascript':
    case 'text/javascript':
      return NetworkCategory.Script;
    case 'text/css':
      return NetworkCategory.Style;
    case 'audio/ogg':
    case 'image/gif':
    case 'image/jpeg':
    case 'image/png':
    case 'image/svg+xml':
    case 'image/webp':
    case 'image/x-icon':
    case 'font/opentype':
    case 'font/woff2':
    case 'font/ttf':
    case 'application/font-woff':
      return NetworkCategory.Media;
    default:
      return NetworkCategory.Other;
  }
}

export function colorForNetworkRequest(request: TraceEngine.Types.TraceEvents.SyntheticNetworkRequest): string {
  const category = syntheticNetworkRequestCategory(request);

  let cssVarName = '--app-color-system';
  switch (category) {
    case NetworkCategory.HTML:
      cssVarName = '--app-color-loading';
      break;
    case NetworkCategory.Script:
      cssVarName = '--app-color-scripting';
      break;
    case NetworkCategory.Style:
      cssVarName = '--app-color-rendering';
      break;
    case NetworkCategory.Media:
      cssVarName = '--app-color-painting';
      break;
    default:
      cssVarName = '--app-color-system';
      break;
  }
  return ThemeSupport.ThemeSupport.instance().getComputedValue(cssVarName);
}
