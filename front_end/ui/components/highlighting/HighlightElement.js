// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TextUtils from '../../../models/text_utils/text_utils.js';
import { HighlightManager } from './HighlightManager.js';
export class HighlightElement extends HTMLElement {
    static observedAttributes = ['ranges', 'current-range'];
    #ranges = [];
    #currentRange;
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }
        switch (name) {
            case 'ranges':
                this.#ranges = parseRanges(newValue);
                break;
            case 'current-range':
                this.#currentRange = parseRanges(newValue)[0];
                break;
        }
        HighlightManager.instance().set(this, this.#ranges, this.#currentRange);
    }
}
function parseRanges(value) {
    if (!value) {
        return [];
    }
    const ranges = value.split(' ')
        .filter(rangeString => {
        const parts = rangeString.split(',');
        // A valid range string must have exactly two parts.
        if (parts.length !== 2) {
            return false;
        }
        // Both parts must be convertible to valid numbers.
        const num1 = Number(parts[0]);
        const num2 = Number(parts[1]);
        return !isNaN(num1) && !isNaN(num2);
    })
        .map(rangeString => {
        const parts = rangeString.split(',').map(part => Number(part));
        return new TextUtils.TextRange.SourceRange(parts[0], parts[1]);
    });
    return sortAndMergeRanges(ranges);
}
function sortAndMergeRanges(ranges) {
    // Sort by start position.
    ranges.sort((a, b) => a.offset - b.offset);
    if (ranges.length === 0) {
        return [];
    }
    // Merge overlapping ranges.
    const merged = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
        const last = merged[merged.length - 1];
        const current = ranges[i];
        if (current.offset <= last.offset + last.length) {
            const newEnd = Math.max(last.offset + last.length, current.offset + current.length);
            const newLength = newEnd - last.offset;
            merged[merged.length - 1] = new TextUtils.TextRange.SourceRange(last.offset, newLength);
        }
        else {
            merged.push(current);
        }
    }
    return merged;
}
customElements.define('devtools-highlight', HighlightElement);
//# sourceMappingURL=HighlightElement.js.map