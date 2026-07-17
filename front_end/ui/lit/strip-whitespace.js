// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import * as Lit from '../../third_party/lit/lit.js';
const templates = new WeakMap();
export function isLitDirective(value) {
    return Boolean(typeof value === 'object' && value && '_$litDirective$' in value && 'values' in value);
}
export function html(strings, ...values) {
    let stripped = templates.get(strings);
    if (!stripped) {
        if (strings.some(s => s.includes('\n'))) {
            stripped = strip(strings);
        }
        else {
            stripped = strings;
        }
    }
    templates.set(strings, stripped);
    const escapeValue = (val) => {
        if (typeof val === 'string') {
            return Platform.StringUtilities.safeEscapeUnicode(val);
        }
        if (Array.isArray(val)) {
            return val.map(escapeValue);
        }
        if (isLitDirective(val)) {
            val.values = val.values.map(escapeValue);
            return val;
        }
        return val;
    };
    const escapedValues = values.map(escapeValue);
    return Lit.html(stripped, ...escapedValues);
}
function strip(strings) {
    let inTag = false;
    // Remove runs of whitespace following newline outside of tags.
    const stripped = strings.map(s => s.replace(/[<>]|\n\s*/g, s => {
        if (s === '<') {
            inTag = true;
        }
        else if (inTag && s === '>') {
            inTag = false;
        }
        else if (!inTag) {
            return '';
        }
        return s;
    }));
    stripped.raw = strings.raw;
    return stripped;
}
//# sourceMappingURL=strip-whitespace.js.map