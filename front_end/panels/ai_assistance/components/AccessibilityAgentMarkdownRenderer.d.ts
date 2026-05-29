import type * as Platform from '../../../core/platform/platform.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../../ui/lit/lit.js';
import { MarkdownRendererWithCodeBlock } from './MarkdownRendererWithCodeBlock.js';
export declare class AccessibilityAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
    #private;
    private mainDocumentURL;
    constructor(mainDocumentURL?: Platform.DevToolsPath.UrlString);
    templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate | null;
}
