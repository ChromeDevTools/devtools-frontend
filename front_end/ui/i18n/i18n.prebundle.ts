// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-imperative-dom-api */

import * as I18n from '../../core/i18n/i18n.js';
import type * as ThirdPartyI18n from '../../third_party/i18n/i18n.js';
import {Directives, html, type LitTemplate, nothing} from '../lit/lit.js';

const {repeat} = Directives;
/**
 * Returns a span element that may contains other DOM element as placeholders
 */
export function getFormatLocalizedString(
    registeredStrings: ThirdPartyI18n.LocalizedStringSet.RegisteredFileStrings, stringId: string,
    placeholders: Record<string, Node|string>): HTMLSpanElement {
  const formatter = registeredStrings.getLocalizedStringSetFor(I18n.DevToolsLocale.DevToolsLocale.instance().locale)
                        .getMessageFormatterFor(stringId);

  const element = document.createElement('span');
  for (const icuElement of formatter.getAst()) {
    if (icuElement.type === /* argumentElement */ 1) {
      const placeholderValue = placeholders[icuElement.value];
      if (placeholderValue) {
        element.append(placeholderValue);
      }
    } else if ('value' in icuElement) {
      element.append(String(icuElement.value));
    }
  }
  return element;
}

export function getFormatLocalizedStringTemplate(
    registeredStrings: ThirdPartyI18n.LocalizedStringSet.RegisteredFileStrings, stringId: string,
    placeholders: Record<string, Node|string|LitTemplate>): LitTemplate {
  const formatter = registeredStrings.getLocalizedStringSetFor(I18n.DevToolsLocale.DevToolsLocale.instance().locale)
                        .getMessageFormatterFor(stringId);

  return html`<span>${repeat(formatter.getAst(), icuElement => {
    if (icuElement.type === /* argumentElement */ 1) {
      return placeholders[icuElement.value] ?? nothing;
    }
    return 'value' in icuElement ? String(icuElement.value) : nothing;
  })}</span>`;
}
