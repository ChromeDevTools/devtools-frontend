// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';
export function flattenRect(rect, left) {
    const x = left ? rect.left : rect.right;
    return { left: x, right: x, top: rect.top, bottom: rect.bottom };
}
export class AiCodeCompletionTeaserPlaceholder extends CM.WidgetType {
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
}
export function aiCodeCompletionTeaserPlaceholder(teaser) {
    const plugin = CM.ViewPlugin.fromClass(class {
        view;
        placeholder;
        constructor(view) {
            this.view = view;
            this.placeholder = CM.Decoration.set([CM.Decoration.widget({ widget: new AiCodeCompletionTeaserPlaceholder(teaser), side: 1 }).range(0)]);
        }
        get decorations() {
            return this.view.state.doc.length ? CM.Decoration.none : this.placeholder;
        }
    }, { decorations: v => v.decorations });
    return plugin;
}
//# sourceMappingURL=AiCodeCompletionTeaserPlaceholder.js.map