import type * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import type * as Lit from '../../../ui/lit/lit.js';
/**
 * The model returns multiline code blocks in an erroneous way with the language being in new line.
 * This renderer takes that into account and correctly updates the parsed multiline token with the language
 * correctly identified and stripped from the content.
 * Example:
 * ```
 * css <-- This should have been on the first line.
 * * {
 * color: red;
 * }
 * ```
 **/
export declare class MarkdownRendererWithCodeBlock extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
    templateForToken(token: Marked.Marked.MarkedToken): Lit.TemplateResult | null;
}
