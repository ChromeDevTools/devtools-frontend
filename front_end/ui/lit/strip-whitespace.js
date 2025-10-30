// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../../third_party/lit/lit.js';
const templates = new WeakMap();
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
    return Lit.html(stripped, ...values);
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