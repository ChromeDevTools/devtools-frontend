import * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import type * as Protocol from '../../../../generated/protocol.js';
export interface NodeLinkData {
    backendNodeId: Protocol.DOM.BackendNodeId;
    frame: string;
    options?: Common.Linkifier.Options;
    /**
     * URL to display if backendNodeId cannot be resolved (ie for traces loaded from disk).
     * Will be given to linkifyURL. Use this or one of the other fallback fields.
     */
    fallbackUrl?: Platform.DevToolsPath.UrlString;
    /**
     * Text to display if backendNodeId cannot be resolved (ie for traces loaded from disk).
     * Displayed as monospace code.
     */
    fallbackHtmlSnippet?: string;
    /**
     * Text to display if backendNodeId cannot be resolved (ie for traces loaded from disk).
     * Displayed as plain text.
     */
    fallbackText?: string;
}
export declare class NodeLink extends HTMLElement {
    #private;
    set data(data: NodeLinkData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-node-link': NodeLink;
    }
}
