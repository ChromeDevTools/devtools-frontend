import * as TextUtils from '../../../core/text_utils/text_utils.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../lit/lit.js';
import { MarkdownLitRenderer } from './MarkdownView.js';
export type PlaceholderToken = TextUtils.Markdown.PlaceholderToken;
export declare const tokenizeWithPlaceholders: (markdown: string | Marked.Marked.Token[], substitutions?: Map<string, string>) => Marked.Marked.Token[];
export declare class MarkdownPlaceholderLitRenderer extends MarkdownLitRenderer {
    #private;
    constructor(substitutions?: Map<string, string>);
    unescape(text: string): string;
    templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate | null;
}
