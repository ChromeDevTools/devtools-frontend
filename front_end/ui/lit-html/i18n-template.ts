// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as I18n from '../../third_party/i18n/i18n.js';
import * as Lit from '../../third_party/lit/lit.js';

const {html} = Lit.StaticHtml;

/**
 * @param placeholders placeholders must not contain localized strings or other localized templates as that is
 * incompatible with languages using a different sentence structure or ordering (e.g., RTL).
 */
export function i18nTemplate(
    registeredStrings: I18n.LocalizedStringSet.RegisteredFileStrings, stringId: string,
    placeholders: Record<string, Lit.TemplateResult|string>): Lit.TemplateResult {
  const formatter = registeredStrings.getLocalizedStringSetFor(i18n.DevToolsLocale.DevToolsLocale.instance().locale)
                        .getMessageFormatterFor(stringId);
  let result = html``;
  for (const icuElement of formatter.getAst()) {
    if (icuElement.type === /* argumentElement */ 1) {
      const placeholderValue = placeholders[icuElement.value];
      if (placeholderValue) {
        result = html`${result}${placeholderValue}`;
      }
    } else if ('value' in icuElement) {
      result = html`${result}${icuElement.value}`;
    }
  }
  return result;
}
