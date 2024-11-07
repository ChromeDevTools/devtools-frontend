// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {DevToolsLocale} from './DevToolsLocale.js';

export interface NumberFormatter {
  format(value: number): string;
  formatToParts(value: number): Intl.NumberFormatPart[];
}

/**
 * Creates an instance of NumberFormatter.
 *
 * Safe to call in top-level of a module, since the creation of Intl.NumberFormat is deferred
 * until first usage.
 */
export function defineFormatter(options: Intl.NumberFormatOptions): NumberFormatter {
  let intlNumberFormat: Intl.NumberFormat;

  return {
    format(value) {
      if (!intlNumberFormat) {
        intlNumberFormat = new Intl.NumberFormat(DevToolsLocale.instance().locale, options);
      }
      return formatAndEnsureSpace(intlNumberFormat, value);
    },
    formatToParts(value) {
      if (!intlNumberFormat) {
        intlNumberFormat = new Intl.NumberFormat(DevToolsLocale.instance().locale, options);
      }
      return intlNumberFormat.formatToParts(value);
    },
  };
}

/**
 * When using 'narrow' unitDisplay, many locales exclude the space between the literal and the unit.
 * We don't like that, so when there is no space literal we inject an nbsp manually.
 */
function formatAndEnsureSpace(formatter: Intl.NumberFormat, value: number): string {
  const parts = formatter.formatToParts(value);

  let hasSpace = false;
  for (const part of parts) {
    if (part.type === 'literal') {
      if (part.value === ' ') {
        hasSpace = true;
        part.value = '\xA0';
      } else if (part.value === '\xA0') {
        hasSpace = true;
      }
    }
  }

  if (hasSpace) {
    return parts.map(part => part.value).join('');
  }

  const unitIndex = parts.findIndex(part => part.type === 'unit');

  // Unexpected for there to be no unit, but just in case, handle that.
  if (unitIndex === -1) {
    return parts.map(part => part.value).join('');
  }

  // For locales where the unit comes first (sw), the space has to come after the unit.
  if (unitIndex === 0) {
    return parts[0].value + '\xA0' + parts.slice(1).map(part => part.value).join('');
  }

  // Otherwise, it comes before.
  return parts.slice(0, unitIndex).map(part => part.value).join('') + '\xA0' +
      parts.slice(unitIndex).map(part => part.value).join('');
}
