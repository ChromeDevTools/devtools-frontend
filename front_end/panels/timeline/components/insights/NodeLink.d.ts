import type * as Platform from '../../../../core/platform/platform.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as PanelsCommon from '../../../common/common.js';
interface ViewInput {
    relatedNodeEl: Node | undefined;
    fallbackUrl?: Platform.DevToolsPath.UrlString;
    fallbackHtmlSnippet?: string;
    fallbackText?: string;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export interface NodeLinkData {
    backendNodeId: Protocol.DOM.BackendNodeId;
    frame?: string;
    options?: PanelsCommon.DOMLinkifier.Options;
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
export declare class NodeLink extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: NodeLinkData);
    performUpdate(): Promise<void>;
}
export declare function nodeLink(data: NodeLinkData): Lit.TemplateResult;
export {};
