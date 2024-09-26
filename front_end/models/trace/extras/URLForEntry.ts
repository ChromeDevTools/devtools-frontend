// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Types from '../types/types.js';

/**
 * Use this helper whenever resolving an URL's source mapping is not an
 * option. For example when processing non-ui data. Otherwise use the
 * helper SourceMapsResolver::resolvedURLForEntry
 *
 * If an URL will be displayed in the UI, it's likely you should not use
 * this helper and prefer the other option instead.
 */

export function getNonResolved(
    parsedTrace: Handlers.Types.ParsedTrace, entry: Types.Events.Event): Platform.DevToolsPath.UrlString|null {
  if (Types.Events.isProfileCall(entry)) {
    return entry.callFrame.url as Platform.DevToolsPath.UrlString;
  }

  if (entry.args?.data?.stackTrace && entry.args.data.stackTrace.length > 0) {
    return entry.args.data.stackTrace[0].url as Platform.DevToolsPath.UrlString;
  }

  if (Types.Events.isSyntheticNetworkRequest(entry)) {
    return entry.args.data.url as Platform.DevToolsPath.UrlString;
  }

  // DecodeImage events use the URL from the relevant PaintImage event.
  if (Types.Events.isDecodeImage(entry)) {
    const paintEvent = parsedTrace.ImagePainting.paintImageForEvent.get(entry);
    return paintEvent ? getNonResolved(parsedTrace, paintEvent) : null;
  }

  // DrawLazyPixelRef events use the URL from the relevant PaintImage event.
  if (Types.Events.isDrawLazyPixelRef(entry) && entry.args?.LazyPixelRef) {
    const paintEvent = parsedTrace.ImagePainting.paintImageByDrawLazyPixelRef.get(entry.args.LazyPixelRef);
    return paintEvent ? getNonResolved(parsedTrace, paintEvent) : null;
  }

  // ParseHTML events store the URL under beginData, not data.
  if (Types.Events.isParseHTML(entry)) {
    return entry.args.beginData.url as Platform.DevToolsPath.UrlString;
  }

  // For all other events, try to see if the URL is provided, else return null.
  if (entry.args?.data?.url) {
    return entry.args.data.url as Platform.DevToolsPath.UrlString;
  }

  return null;
}
