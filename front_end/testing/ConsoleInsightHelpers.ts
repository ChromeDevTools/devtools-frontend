// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import sinon from 'sinon';

import * as Host from '../core/host/host.js';
import * as Root from '../core/root/root.js';
import * as Console from '../panels/console/console.js';
import * as Explain from '../panels/explain/explain.js';
import * as Lit from '../ui/lit/lit.js';

import {updateHostConfig} from './EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from './ViewFunctionHelpers.js';

function getTestAidaClient() {
  return {
    async *
        doConversation() {
          yield {explanation: 'test', metadata: {rpcGlobalId: 0}, completed: true};
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
export async function createConsoleInsightWidget(options?: Partial<Explain.ViewOutput>&{
  aidaAvailability?: Host.AidaClient.AidaAccessPreconditions,
  promptBuilder?: Explain.PublicPromptBuilder,
  aidaClient?: Explain.PublicAidaClient,
}): Promise<{
  component: Explain.ConsoleInsight,
  view: ViewFunctionStub<typeof Explain.ConsoleInsight>,
  output: Explain.ViewOutput,
  stubAidaCheckAccessPreconditions: (aidaAvailability: Host.AidaClient.AidaAccessPreconditions) => sinon.SinonStub,
  testPromptBuilder: Explain.PublicPromptBuilder,
  testAidaClient: Explain.PublicAidaClient & {
    registerClientEvent: sinon.SinonSpy,
  },
}> {
  const output = {
    headerRef: options?.headerRef ?? Lit.Directives.createRef<HTMLHeadingElement>(),
    citationLinks: options?.citationLinks ?? [],
  };

  updateHostConfig({
    aidaAvailability: {
      enabled: true,
      ...Root.Runtime.hostConfig.aidaAvailability,
    },
    devToolsConsoleInsights: {
      enabled: true,
      ...Root.Runtime.hostConfig.devToolsConsoleInsights,
    },
  });
  const view = createViewFunctionStub(Explain.ConsoleInsight, output);

  let aidaAvailabilityForStub = options?.aidaAvailability ?? Host.AidaClient.AidaAccessPreconditions.AVAILABLE;
  const checkAccessPreconditionsStub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
                                           .callsFake(() => Promise.resolve(aidaAvailabilityForStub));

  const stubAidaCheckAccessPreconditions = (aidaAvailability: Host.AidaClient.AidaAccessPreconditions) => {
    aidaAvailabilityForStub = aidaAvailability;
    return checkAccessPreconditionsStub;
  };

  const testPromptBuilder = getTestPromptBuilder();
  const testAidaClient = getTestAidaClient();

  const component = new Explain.ConsoleInsight(
      options?.promptBuilder ?? testPromptBuilder,
      options?.aidaClient ?? testAidaClient,
      options?.aidaAvailability ?? Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      undefined,
      view,
  );

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
