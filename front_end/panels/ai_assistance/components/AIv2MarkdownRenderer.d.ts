import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Trace from '../../../models/trace/trace.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Lit from '../../../ui/lit/lit.js';
export interface AIv2MarkdownRendererOptions {
    mainFrameId?: string;
    mainDocumentURL?: Platform.DevToolsPath.UrlString;
    /**
     * Retrieves the established origin locked for the active conversation.
     * Required to authorize #file-<id> links and prevent cross-origin file leakage.
     *
     * TODO(crbug.com/559522248): Defer renderer instantiation until a conversation
     * starts so this origin can be passed as a mandatory, non-getter property.
     */
    getEstablishedOrigin?: () => SDK.SecurityOrigin.SecurityOrigin | undefined;
    lookupTraceEvent?: (key: string) => Trace.Types.Events.Event | null;
}
/**
 * AIv2MarkdownRenderer is currently duplicated from the agent-specific renderers
 * as part of the migration to the V2 architecture. It will eventually become
 * the only markdown renderer used by AI assistance.
 */
export declare class AIv2MarkdownRenderer extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
    #private;
    private readonly options;
    constructor(options?: AIv2MarkdownRendererOptions);
    templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate | null;
}
