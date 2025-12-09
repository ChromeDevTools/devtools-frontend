import * as Host from '../core/host/host.js';
import * as Console from '../panels/console/console.js';
import * as Explain from '../panels/explain/explain.js';
import * as Lit from '../ui/lit/lit.js';
/**
 * Creates and shows an ConsoleInsight instance returning the view
 * stubs and the initial view input caused by Widget.show().
 */
export declare function createConsoleInsightWidget(options?: Partial<Explain.ViewOutput> & {
    aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
    promptBuilder?: Explain.PublicPromptBuilder;
    aidaClient?: Explain.PublicAidaClient;
}): Promise<{
    component: Explain.ConsoleInsight;
    view: import("./ViewFunctionHelpers.js").ViewFunctionStub<typeof Explain.ConsoleInsight>;
    output: {
        headerRef: Lit.Directives.Ref<HTMLHeadingElement>;
        citationLinks: HTMLElement[];
    };
    stubAidaCheckAccessPreconditions: (aidaAvailability: Host.AidaClient.AidaAccessPreconditions) => import("sinon").SinonStub<[], Promise<Host.AidaClient.AidaAccessPreconditions>>;
    testPromptBuilder: {
        buildPrompt(): Promise<{
            prompt: string;
            sources: {
                type: Console.PromptBuilder.SourceType;
                value: string;
            }[];
            isPageReloadRecommended: boolean;
        }>;
        getSearchQuery(): string;
    };
    testAidaClient: {
        doConversation(): AsyncGenerator<{
            explanation: string;
            metadata: {
                rpcGlobalId: number;
            };
            completed: boolean;
        }, void, unknown>;
        registerClientEvent: import("sinon").SinonSpy<any[], any>;
    };
}>;
