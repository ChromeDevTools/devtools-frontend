// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../core/host/host.js';
import * as Console from '../panels/console/console.js';
import * as Explain from '../panels/explain/explain.js';
import * as Lit from '../ui/lit/lit.js';
import { createViewFunctionStub } from './ViewFunctionHelpers.js';
function getTestAidaClient() {
    return {
        async *doConversation() {
            yield { explanation: 'test', metadata: { rpcGlobalId: 0 }, completed: true };
        },
        registerClientEvent: sinon.spy(),
    };
}
function getTestPromptBuilder() {
    return {
        async buildPrompt() {
            return {
                prompt: '',
                sources: [
                    {
                        type: Console.PromptBuilder.SourceType.MESSAGE,
                        value: 'error message',
                    },
                ],
                isPageReloadRecommended: true,
            };
        },
        getSearchQuery() {
            return '';
        },
    };
}
/**
 * Creates and shows an ConsoleInsight instance returning the view
 * stubs and the initial view input caused by Widget.show().
 */
export async function createConsoleInsightWidget(options) {
    const output = {
        headerRef: options?.headerRef ?? Lit.Directives.createRef(),
        citationLinks: options?.citationLinks ?? [],
    };
    const view = createViewFunctionStub(Explain.ConsoleInsight, output);
    let aidaAvailabilityForStub = options?.aidaAvailability ?? "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */;
    const checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
        .callsFake(() => Promise.resolve(aidaAvailabilityForStub));
    const stubAidaCheckAccessPreconditions = (aidaAvailability) => {
        aidaAvailabilityForStub = aidaAvailability;
        return checkAccessPreconditionsStub;
    };
    const testPromptBuilder = getTestPromptBuilder();
    const testAidaClient = getTestAidaClient();
    const component = new Explain.ConsoleInsight(options?.promptBuilder ?? testPromptBuilder, options?.aidaClient ?? testAidaClient, options?.aidaAvailability ?? "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */, undefined, view);
    await view.nextInput;
    return {
        component,
        view,
        output,
        stubAidaCheckAccessPreconditions,
        testPromptBuilder,
        testAidaClient,
    };
}
//# sourceMappingURL=ConsoleInsightHelpers.js.map