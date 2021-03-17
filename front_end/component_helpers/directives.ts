// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../third_party/lit-html/lit-html.js';

/**
 * Provides a hook to get a callback when a LitHtml node is rendered into the DOM:
 * @example
 *
 * ```
 * <p on-render=${nodeRenderedCallback(node => ...)}>
 * ```
 */
export const nodeRenderedCallback = LitHtml.directive((callback: (domNode: Element) => void) => {
  return (part: LitHtml.Part): void => {
    if (!(part instanceof LitHtml.AttributePart)) {
      throw new Error('Directive must be used as an attribute.');
    }

    const elem = part.committer.element;
    callback(elem);
  };
});
