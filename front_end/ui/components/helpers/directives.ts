// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../lit-html/lit-html.js';

/**
 * Provides a hook to get a callback when a LitHtml node is rendered into the DOM:
 * @example
 *
 * ```
 * <p on-render=${nodeRenderedCallback(node => ...)}>
 * ```
 */
class NodeRenderedCallback extends LitHtml.Directive.Directive {
  constructor(partInfo: LitHtml.Directive.PartInfo) {
    super(partInfo);

    if (partInfo.type !== LitHtml.Directive.PartType.ATTRIBUTE) {
      throw new Error('Node rendered callback directive must be used as an attribute.');
    }
  }

  update(part: LitHtml.Directive.ElementPart, [callback]: LitHtml.Directive.DirectiveParameters<this>): void {
    callback(part.element);
  }

  /*
   * Because this directive doesn't render anything, there's no implementation
   * here for the render method. But we need it to state that it takes in a
   * callback function at the callsite. Without this definition, the types in
   * the update() method above don't get correctly picked up.
   */
  render(_callback: (domNode: Element) => void): void {
  }
}

export const nodeRenderedCallback = LitHtml.Directive.directive(NodeRenderedCallback);
