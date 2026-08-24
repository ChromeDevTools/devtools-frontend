// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as UI from '../../ui/legacy/legacy.js';

export type ContextType = 'NETWORK_REQUEST';

export interface ExternalAIRequestOptions {
  context?: {
    type: ContextType,
    contextIdentifier: string,
  };
  prompts: string[];
}

export interface IndividualPromptRequestResponse {
  prompt: string;
  response: string;
  error?: string;
}

function resolveConversationType(contextType?: ContextType): AiAssistanceModel.AiHistoryStorage.ConversationType {
  switch (contextType) {
    case 'NETWORK_REQUEST':
      return AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK;
    default:
      return AiAssistanceModel.AiHistoryStorage.ConversationType.NONE;
  }
}

function getMatchingFlavorContext(
    contextOptions?: ExternalAIRequestOptions['context'],
    ): AiAssistanceModel.AiAgent.ConversationContext<unknown>|null {
  if (!contextOptions?.contextIdentifier) {
    return null;
  }
  if (contextOptions.type === 'NETWORK_REQUEST') {
    const raw = UI.Context.Context.instance().flavor(SDK.NetworkRequest.NetworkRequest);
    if (raw) {
      if (raw.name() !== contextOptions.contextIdentifier && raw.url() !== contextOptions.contextIdentifier) {
        return null;
      }
      return new AiAssistanceModel.RequestContext.RequestContext(
          raw, new NetworkTimeCalculator.NetworkTransferTimeCalculator());
    }
  }
  return null;
}

export async function handleExternalAIRequest(options: ExternalAIRequestOptions): Promise<unknown[]> {
  localStorage.setItem('aiAssistanceStructuredLogEnabled', 'true');
  localStorage.removeItem('aiAssistanceStructuredLog');

  const conversationType = resolveConversationType(options.context?.type);

  const aidaClient = new Host.AidaClient.AidaClient();
  const conversation = new AiAssistanceModel.AiConversation.AiConversation({
    type: conversationType,
    data: [],
    isReadOnly: false,
    aidaClient,
  });

  const resolvedContext = getMatchingFlavorContext(options.context);
  if (resolvedContext) {
    conversation.setContext(resolvedContext);
  }

  for (const prompt of options.prompts) {
    await Array.fromAsync(conversation.run(prompt));
  }

  const logsRaw = localStorage.getItem('aiAssistanceStructuredLog');
  return logsRaw ? JSON.parse(logsRaw) : [];
}

declare global {
  interface Window {
    handleExternalAIRequest?: typeof handleExternalAIRequest;
  }
}

// @ts-expect-error
globalThis.handleExternalAIRequest = handleExternalAIRequest;
