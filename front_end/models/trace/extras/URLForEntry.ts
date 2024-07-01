// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Types from '../types/types.js';

export function get(traceParsedData: Handlers.Types.TraceParseData, entry: Types.TraceEvents.TraceEventData):
    Platform.DevToolsPath.UrlString|null {
  if (Types.TraceEvents.isProfileCall(entry)) {
    return entry.callFrame.url as Platform.DevToolsPath.UrlString;
  }

  if (entry.args?.data?.stackTrace && entry.args.data.stackTrace.length > 0) {
    return entry.args.data.stackTrace[0].url as Platform.DevToolsPath.UrlString;
  }

  if (Types.TraceEvents.isSyntheticNetworkRequestEvent(entry)) {
    return entry.args.data.url as Platform.DevToolsPath.UrlString;
  }

  // DecodeImage events use the URL from the relevant PaintImage event.
  if (Types.TraceEvents.isTraceEventDecodeImage(entry)) {
    const paintEvent = traceParsedData.ImagePainting.paintImageForEvent.get(entry);
    return paintEvent ? get(traceParsedData, paintEvent) : null;
  }

  // DrawLazyPixelRef events use the URL from the relevant PaintImage event.
  if (Types.TraceEvents.isTraceEventDrawLazyPixelRef(entry) && entry.args?.LazyPixelRef) {
    const paintEvent = traceParsedData.ImagePainting.paintImageByDrawLazyPixelRef.get(entry.args.LazyPixelRef);
    return paintEvent ? get(traceParsedData, paintEvent) : null;
  }

  // ParseHTML events store the URL under beginData, not data.
  if (Types.TraceEvents.isTraceEventParseHTML(entry)) {
    return entry.args.beginData.url as Platform.DevToolsPath.UrlString;
  }

  // For all other events, try to see if the URL is provided, else return null.
  if (entry.args?.data?.url) {
    return entry.args.data.url as Platform.DevToolsPath.UrlString;
  }

  return null;
}
