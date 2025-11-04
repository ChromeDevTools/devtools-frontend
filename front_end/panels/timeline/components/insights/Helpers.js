// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/components/markdown_view/markdown_view.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Marked from '../../../../third_party/marked/marked.js';
import * as Lit from '../../../../ui/lit/lit.js';
const { html } = Lit;
export function shouldRenderForCategory(options) {
    return options.activeCategory === Trace.Insights.Types.InsightCategory.ALL ||
        options.activeCategory === options.insightCategory;
}
/**
 * Returns a rendered MarkdownView component.
 *
 * This should only be used for markdown that is guaranteed to be valid,
 * and not contain any user-generated content.
 */
export function md(markdown) {
    const tokens = Marked.Marked.lexer(markdown);
    const data = { tokens };
    return html `<devtools-markdown-view .data=${data}></devtools-markdown-view>`;
}
//# sourceMappingURL=Helpers.js.map