// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/markdown_view/markdown_view.js';

import * as Trace from '../../../../models/trace/trace.js';
import * as Marked from '../../../../third_party/marked/marked.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

const {html} = LitHtml;

export function shouldRenderForCategory(options: {
  activeCategory: Trace.Insights.Types.InsightCategory,
  insightCategory: Trace.Insights.Types.InsightCategory,
}): boolean {
  return options.activeCategory === Trace.Insights.Types.InsightCategory.ALL ||
      options.activeCategory === options.insightCategory;
}

/**
 * Returns a rendered MarkdownView component.
 *
 * This should not be used for markdown that is not guaranteed to be valid.
 */
export function md(markdown: string): LitHtml.TemplateResult {
  const tokens = Marked.Marked.lexer(markdown);
  const data = {tokens};
  return html`<devtools-markdown-view .data=${data}></devtools-markdown-view>`;
}
