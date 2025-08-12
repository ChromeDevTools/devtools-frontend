// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import type * as PanelCommon from '../../../panels/common/common.js';
import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';

export function flattenRect(rect: DOMRect, left: boolean): {
  left: number,
  right: number,
  top: number,
  bottom: number,
} {
  const x = left ? rect.left : rect.right;
  return {left: x, right: x, top: rect.top, bottom: rect.bottom};
}

export class AiCodeCompletionTeaserPlaceholder extends CM.WidgetType {
  constructor(readonly teaser: PanelCommon.AiCodeCompletionTeaser) {
    super();
  }

  toDOM(): HTMLElement {
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
  override coordsAt(dom: HTMLElement): {
    left: number,
    right: number,
    top: number,
    bottom: number,
  }|null {
    const boundingClientRect = dom.firstElementChild?.getBoundingClientRect();
    if (!boundingClientRect) {
      return null;
    }
    const style = window.getComputedStyle(dom.parentNode as HTMLElement);
    const rect = flattenRect(boundingClientRect, style.direction !== 'rtl');
    const lineHeight = parseInt(style.lineHeight, 10);
    if (rect.bottom - rect.top > lineHeight * 1.5) {
      return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.top + lineHeight};
    }
    return rect;
  }

  override ignoreEvent(_: Event): boolean {
    return false;
  }

  override destroy(dom: HTMLElement): void {
    super.destroy(dom);
    this.teaser?.hideWidget();
  }
}

export function aiCodeCompletionTeaserPlaceholder(teaser: PanelCommon.AiCodeCompletionTeaser): CM.Extension {
  const plugin = CM.ViewPlugin.fromClass(class {
    placeholder: CM.DecorationSet;

    constructor(readonly view: CM.EditorView) {
      this.placeholder = CM.Decoration.set(
          [CM.Decoration.widget({widget: new AiCodeCompletionTeaserPlaceholder(teaser), side: 1}).range(0)]);
    }

    declare update: () => void;

    get decorations(): CM.DecorationSet {
      return this.view.state.doc.length ? CM.Decoration.none : this.placeholder;
    }
  }, {decorations: v => v.decorations});
  return plugin;
}
