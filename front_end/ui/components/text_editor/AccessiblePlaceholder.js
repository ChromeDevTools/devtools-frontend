// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';
export function flattenRect(rect, left) {
    const x = left ? rect.left : rect.right;
    return { left: x, right: x, top: rect.top, bottom: rect.bottom };
}
/**
 * A CodeMirror WidgetType that displays a UI.Widget.Widget as a placeholder.
 *
 * This custom placeholder implementation is used in place of the default
 * CodeMirror placeholder to provide better accessibility. Specifically,
 * it ensures that screen readers can properly announce the content within
 * the encapsulated widget.
 */
export class AccessiblePlaceholder extends CM.WidgetType {
    teaser;
    constructor(teaser) {
        super();
        this.teaser = teaser;
    }
    toDOM() {
        const wrap = document.createElement('span');
        wrap.classList.add('cm-placeholder');
        wrap.style.pointerEvents = 'none';
        wrap.tabIndex = 0;
        this.teaser.show(wrap, undefined, true);
        return wrap;
    }
    /**
     * Controls the cursor's height by reporting this widget's bounds as a
     * single line. This prevents the cursor from expanding vertically when the
     * placeholder content wraps across multiple lines.
     */
    coordsAt(dom) {
        const boundingClientRect = dom.firstElementChild?.getBoundingClientRect();
        if (!boundingClientRect) {
            return null;
        }
        const style = window.getComputedStyle(dom.parentNode);
        const rect = flattenRect(boundingClientRect, style.direction !== 'rtl');
        const lineHeight = parseInt(style.lineHeight, 10);
        if (rect.bottom - rect.top > lineHeight * 1.5) {
            return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + lineHeight };
        }
        return rect;
    }
    ignoreEvent(_) {
        return false;
    }
    destroy(dom) {
        super.destroy(dom);
        this.teaser?.hideWidget();
    }
    eq(other) {
        return this.teaser === other.teaser;
    }
}
//# sourceMappingURL=AccessiblePlaceholder.js.map