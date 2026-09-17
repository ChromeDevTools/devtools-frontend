import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Lit from '../../../ui/lit/lit.js';
export interface MarkdownRendererWithCodeBlockOptions {
    /**
     * Retrieves the established origin locked for the active conversation.
     * Required to authorize #file-<id> links and prevent cross-origin file leakage.
     * When omitted or unauthorized, file links safely render as plain inert text.
     */
    getEstablishedOrigin?: () => SDK.SecurityOrigin.SecurityOrigin | undefined;
}
/**
 * Markdown renderer for AI assistance conversations.
 *
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
 *
 * Also handles linkifying DevTools internal resource links (#req- and origin-locked #file-).
 */
export declare class MarkdownRendererWithCodeBlock extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
    #private;
    private readonly options;
    constructor(options?: MarkdownRendererWithCodeBlockOptions);
    templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate | null;
}
