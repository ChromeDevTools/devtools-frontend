import '../../../ui/components/spinners/spinners.js';
import * as Host from '../../../core/host/host.js';
import * as Console from '../../console/console.js';
export declare class CloseEvent extends Event {
    static readonly eventName = "close";
    constructor();
}
type PublicPromptBuilder = Pick<Console.PromptBuilder.PromptBuilder, 'buildPrompt' | 'getSearchQuery'>;
type PublicAidaClient = Pick<Host.AidaClient.AidaClient, 'doConversation' | 'registerClientEvent'>;
export declare class ConsoleInsight extends HTMLElement {
    #private;
    static create(promptBuilder: PublicPromptBuilder, aidaClient: PublicAidaClient): Promise<ConsoleInsight>;
    disableAnimations: boolean;
    constructor(promptBuilder: PublicPromptBuilder, aidaClient: PublicAidaClient, aidaPreconditions: Host.AidaClient.AidaAccessPreconditions);
    connectedCallback(): void;
    disconnectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-console-insight': ConsoleInsight;
    }
}
export {};
