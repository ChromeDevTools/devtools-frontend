// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
const UIStrings = {
    /**
     * @description Summary line in a tooltip explaining a CSS selector specificity.
     * @example {1} PH1
     * @example {2} PH2
     * @example {3} PH3
     */
    specificity: 'Specificity: ({PH1},{PH2},{PH3})',
    /**
     * @description Tooltip line listing the selector parts contributing to the ID-like specificity bucket.
     * @example {#main} PH1
     */
    idLikeSpecificity: '(a) ID-like: {PH1}',
    /**
     * @description Tooltip line listing the selector parts contributing to the class-like specificity bucket.
     * @example {.active, :hover} PH1
     */
    classLikeSpecificity: '(b) Class-like: {PH1}',
    /**
     * @description Tooltip line listing the selector parts contributing to the type-like specificity bucket.
     * @example {div} PH1
     */
    typeLikeSpecificity: '(c) Type-like: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/CSSSpecificityBreakdown.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function formatContribution(text, contribution) {
    return contribution > 1 ? `${text} x${contribution}` : text;
}
function formatComponentList(components) {
    const formatter = new Intl.ListFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
        style: 'long',
        type: 'conjunction',
    });
    return formatter.format(components);
}
export function getSpecificityBreakdown(specificity) {
    const ids = [];
    const classes = [];
    const types = [];
    for (const component of specificity.components ?? []) {
        if (component.a > 0) {
            ids.push(formatContribution(component.text, component.a));
        }
        if (component.b > 0) {
            classes.push(formatContribution(component.text, component.b));
        }
        if (component.c > 0) {
            types.push(formatContribution(component.text, component.c));
        }
    }
    return { ids, classes, types };
}
/**
 * Formats the specificity breakdown into a human-readable multi-line string
 * suitable for displaying in a tooltip.
 *
 * Example output for selector "div#main .active:hover":
 *   Specificity: (1,2,1)
 *   (a) ID-like: #main
 *   (b) Class-like: .active, :hover
 *   (c) Type-like: div
 */
export function formatSpecificitySummary(specificity) {
    return i18nString(UIStrings.specificity, { PH1: specificity.a, PH2: specificity.b, PH3: specificity.c });
}
export function getSpecificityBreakdownLines(specificity) {
    const breakdown = getSpecificityBreakdown(specificity);
    const lines = [];
    if (breakdown.ids.length > 0) {
        lines.push(i18nString(UIStrings.idLikeSpecificity, { PH1: formatComponentList(breakdown.ids) }));
    }
    if (breakdown.classes.length > 0) {
        lines.push(i18nString(UIStrings.classLikeSpecificity, { PH1: formatComponentList(breakdown.classes) }));
    }
    if (breakdown.types.length > 0) {
        lines.push(i18nString(UIStrings.typeLikeSpecificity, { PH1: formatComponentList(breakdown.types) }));
    }
    return lines;
}
export function formatSpecificityTooltip(specificity) {
    return [formatSpecificitySummary(specificity), ...getSpecificityBreakdownLines(specificity)].join('\n');
}
//# sourceMappingURL=CSSSpecificityBreakdown.js.map