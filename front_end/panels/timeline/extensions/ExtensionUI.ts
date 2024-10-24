// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';

export function extensionEntryColor(event: Trace.Types.Extensions.SyntheticExtensionEntry): string {
  const color = event.args.color;
  // Use a default value for when the color of the extension entry
  // was not passed or was set an unknown value.
  let themeColor = '--ref-palette-blue70';
  switch (color) {
    case 'primary':
      themeColor = '--ref-palette-blue70';
      break;
    case 'primary-light':
      themeColor = '--ref-palette-blue80';
      break;
    case 'primary-dark':
      themeColor = '--ref-palette-blue60';
      break;
    case 'secondary':
      themeColor = '--ref-palette-purple80';
      break;
    case 'secondary-light':
      themeColor = '--ref-palette-purple90';
      break;
    case 'secondary-dark':
      themeColor = '--ref-palette-purple70';
      break;
    case 'tertiary':
      themeColor = '--ref-palette-green70';
      break;
    case 'tertiary-light':
      themeColor = '--ref-palette-green80';
      break;
    case 'tertiary-dark':
      themeColor = '--ref-palette-green60';
      break;
    case 'warning':
      themeColor = '--ref-palette-yellow70';
      break;
    case 'error':
      themeColor = '--ref-palette-error60';
      break;
  }
  return ThemeSupport.ThemeSupport.instance().getComputedValue(themeColor);
}
