// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../../../models/bindings/bindings.js';
import type * as Platform from '../../../core/platform/platform.js';

export function linkText(url: string, lineNumber?: number): string {
  if (url) {
    // TODO(crbug.com/1253323): Cast to UrlString will be removed when migration to branded types is complete.
    const displayName = Bindings.ResourceUtils.displayNameForURL(url as Platform.DevToolsPath.UrlString);
    let text = `${displayName}`;
    if (typeof lineNumber !== 'undefined') {
      text += `:${lineNumber + 1}`;
    }
    return text;
  }

  throw new Error('New linkifier component error: don\'t know how to generate link text for given arguments');
}
