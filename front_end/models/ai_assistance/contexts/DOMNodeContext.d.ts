import * as SDK from '../../../core/sdk/sdk.js';
import { type ContextDetail, ConversationContext, type ConversationSuggestions } from '../agents/AiAgent.js';
export declare class DOMNodeContext extends ConversationContext<SDK.DOMModel.DOMNode> {
    #private;
    readonly jslogContext: 'ai-context-dom-node';
    constructor(node: SDK.DOMModel.DOMNode);
    /**
     * Returns the security origin of the node's owner document.
     *
     * If the node is detached from a document, returns a unique opaque origin to
     * prevent unauthorized cross-origin access in AI conversations.
     *
     * @returns The security origin of the owner document, or a unique opaque origin.
     */
    getOrigin(): SDK.SecurityOrigin.SecurityOrigin;
    getItem(): SDK.DOMModel.DOMNode;
    getTitle(): string;
    getSuggestions(): Promise<ConversationSuggestions | undefined>;
    getPromptDetails(): Promise<string | null>;
    getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]] | null>;
    describe(): Promise<string>;
}
