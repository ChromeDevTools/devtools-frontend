import sinon from 'sinon';
import * as Host from '../core/host/host.js';
import * as Explain from '../panels/explain/explain.js';
import { type ViewFunctionStub } from './ViewFunctionHelpers.js';
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
    view: ViewFunctionStub<typeof Explain.ConsoleInsight>;
    output: Explain.ViewOutput;
    stubAidaCheckAccessPreconditions: (aidaAvailability: Host.AidaClient.AidaAccessPreconditions) => sinon.SinonStub;
    testPromptBuilder: Explain.PublicPromptBuilder;
    testAidaClient: Explain.PublicAidaClient & {
        registerClientEvent: sinon.SinonSpy;
    };
}>;
