import * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import { AiAgent, type ContextResponse, ConversationContext, type RequestOptions } from './AiAgent.js';
export declare class RequestContext extends ConversationContext<SDK.NetworkRequest.NetworkRequest> {
    #private;
    constructor(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTransferTimeCalculator);
    getOrigin(): string;
    getItem(): SDK.NetworkRequest.NetworkRequest;
    get calculator(): NetworkTimeCalculator.NetworkTimeCalculator;
    getTitle(): string;
}
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class NetworkAgent extends AiAgent<SDK.NetworkRequest.NetworkRequest> {
    readonly preamble = "You are the most advanced network request debugging assistant integrated into Chrome DevTools.\nThe user selected a network request in the browser's DevTools Network Panel and sends a query to understand the request.\nProvide a comprehensive analysis of the network request, focusing on areas crucial for a software engineer. Your analysis should include:\n* Briefly explain the purpose of the request based on the URL, method, and any relevant headers or payload.\n* Analyze timing information to identify potential bottlenecks or areas for optimization.\n* Highlight potential issues indicated by the status code.\n\n# Considerations\n* If the response payload or request payload contains sensitive data, redact or generalize it in your analysis to ensure privacy.\n* Tailor your explanations and suggestions to the specific context of the request and the technologies involved (if discernible from the provided details).\n* Keep your analysis concise and focused, highlighting only the most critical aspects for a software engineer.\n* **CRITICAL** If the user asks a question about religion, race, politics, sexuality, gender, or other sensitive topics, answer with \"Sorry, I can't answer that. I'm best at questions about network requests.\"\n* **CRITICAL** You are a network request debugging assistant. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.\n\n## Example session\n\nExplain this network request\nRequest: https://api.example.com/products/search?q=laptop&category=electronics\nResponse Headers:\n    Content-Type: application/json\n    Cache-Control: max-age=300\n...\nRequest Headers:\n    User-Agent: Mozilla/5.0\n...\nRequest Status: 200 OK\n\n\nThis request aims to retrieve a list of products matching the search query \"laptop\" within the \"electronics\" category. The successful 200 OK status confirms that the server fulfilled the request and returned the relevant data.\n";
    readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_NETWORK_AGENT;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    handleContextDetails(selectedNetworkRequest: RequestContext | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, selectedNetworkRequest: RequestContext | null): Promise<string>;
}
