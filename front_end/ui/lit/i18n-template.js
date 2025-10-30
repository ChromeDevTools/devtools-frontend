// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// This files is import lit directly
/* eslint-disable @devtools/lit-template-result-or-nothing */
import * as i18n from '../../core/i18n/i18n.js';
import * as Lit from '../../third_party/lit/lit.js';
const { html } = Lit.StaticHtml;
/**
 * @param placeholders placeholders must not contain localized strings or other localized templates as that is
 * incompatible with languages using a different sentence structure or ordering (e.g., RTL).
 */
export function i18nTemplate(registeredStrings, stringId, placeholders) {
    const formatter = registeredStrings.getLocalizedStringSetFor(i18n.DevToolsLocale.DevToolsLocale.instance().locale)
        .getMessageFormatterFor(stringId);
    let result = Lit.nothing;
    for (const icuElement of formatter.getAst()) {
        if (icuElement.type === /* argumentElement */ 1) {
            const placeholderValue = placeholders[icuElement.value];
            if (placeholderValue) {
                result = html `${result}${placeholderValue}`;
            }
        }
        else if ('value' in icuElement) {
            result = html `${result}${icuElement.value}`;
        }
    }
    return result;
}
//# sourceMappingURL=i18n-template.js.map