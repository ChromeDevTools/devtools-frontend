import * as Host from '../../core/host/host.js';
export interface ConversationSummaryOptions {
    aidaClient: Host.AidaClient.AidaClient;
    serverSideLoggingEnabled?: boolean;
}
/**
 * A class that takes a full conversation between a user and an agent in markdown
 * format and produces a succinct summary of the conversation.
 *
 * This summary is designed to be read by a local agent in the user's IDE and it
 * will be used to help apply fixes to the user's local codebase based on the
 * debugging information the devtools agent found.
 */
export declare class ConversationSummary {
    #private;
    constructor(options: ConversationSummaryOptions);
    summarizeConversation(conversation: string): Promise<string>;
}
