// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Handlers from './handlers/handlers.js';
import * as Common from '../../core/common/common.js';

export function extractOriginFromTrace(trace: Handlers.Types.TraceParseData): string|null {
  const firstNavigation = trace.Meta.mainFrameURL;
  const url = Common.ParsedURL.ParsedURL.fromString(firstNavigation);
  if (url) {
    // We do this to save some space in the toolbar - seeing the `www` is less
    // useful than seeing `foo.com` if it's truncated at narrow widths
    if (url.host.startsWith('www.')) {
      return url.host.slice(4);
    }
    return url.host;
  }
  return null;
}
