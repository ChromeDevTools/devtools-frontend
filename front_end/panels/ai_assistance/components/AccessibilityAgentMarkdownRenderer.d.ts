import type * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../../ui/lit/lit.js';
import { MarkdownRendererWithCodeBlock } from './MarkdownRendererWithCodeBlock.js';
export declare class AccessibilityAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
    #private;
    private mainFrameId;
    constructor(mainFrameId?: string);
    templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate | null;
}
