import '../../../../ui/components/markdown_view/markdown_view.js';
import type * as Common from '../../../../core/common/common.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
export declare function shouldRenderForCategory(options: {
    activeCategory: Trace.Insights.Types.InsightCategory;
    insightCategory: Trace.Insights.Types.InsightCategory;
}): boolean;
/**
 * Returns a rendered MarkdownView component.
 *
 * This should only be used for markdown that is guaranteed to be valid,
 * and not contain any user-generated content.
 */
export declare function md(markdown: Common.UIString.LocalizedString): Lit.TemplateResult;
