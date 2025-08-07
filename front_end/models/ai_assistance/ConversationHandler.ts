// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';

import {type AiAgent, type ResponseData, ResponseType} from './agents/AiAgent.js';
import {FileAgent} from './agents/FileAgent.js';
import {NetworkAgent} from './agents/NetworkAgent.js';
import {PerformanceAgent} from './agents/PerformanceAgent.js';
import {StylingAgent, StylingAgentWithFunctionCalling} from './agents/StylingAgent.js';
import {
  type Conversation,
  ConversationType,
} from './AiHistoryStorage.js';
import type {ChangeManager} from './ChangeManager.js';

export interface ExternalStylingRequestParameters {
  conversationType: ConversationType.STYLING;
  prompt: string;
  selector?: string;
}

export interface ExternalNetworkRequestParameters {
  conversationType: ConversationType.NETWORK;
  prompt: string;
  requestUrl: string;
}

export interface ExternalPerformanceInsightsRequestParameters {
  conversationType: ConversationType.PERFORMANCE_INSIGHT;
  prompt: string;
  insightTitle: string;
}

function isAiAssistanceStylingWithFunctionCallingEnabled(): boolean {
  return Boolean(Root.Runtime.hostConfig.devToolsFreestyler?.functionCalling);
}

function isAiAssistanceServerSideLoggingEnabled(): boolean {
  return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}

let conversationHandlerInstance: ConversationHandler|undefined;

export class ConversationHandler {
  #aidaClient: Host.AidaClient.AidaClient;

  private constructor(
      aidaClient: Host.AidaClient.AidaClient, _aidaAvailability: Host.AidaClient.AidaAccessPreconditions) {
    this.#aidaClient = aidaClient;
  }

  static instance(opts: {
    aidaClient: Host.AidaClient.AidaClient,
    aidaAvailability: Host.AidaClient.AidaAccessPreconditions,
    forceNew?: boolean,
  }): ConversationHandler {
    if (opts.forceNew || conversationHandlerInstance === undefined) {
      conversationHandlerInstance = new ConversationHandler(opts.aidaClient, opts.aidaAvailability);
    }
    return conversationHandlerInstance;
  }

  static removeInstance(): void {
    conversationHandlerInstance = undefined;
  }

  async *
      handleConversationWithHistory(
          items: AsyncIterable<ResponseData, void, void>, conversation: Conversation|undefined):
          AsyncGenerator<ResponseData, void, void> {
    for await (const data of items) {
      // We don't want to save partial responses to the conversation history.
      if (data.type !== ResponseType.ANSWER || data.complete) {
        void conversation?.addHistoryItem(data);
      }
      yield data;
    }
  }

  createAgent(conversationType: ConversationType, changeManager?: ChangeManager): AiAgent<unknown> {
    const options = {
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
    };
    let agent: AiAgent<unknown>;
    switch (conversationType) {
      case ConversationType.STYLING: {
        agent = new StylingAgent({
          ...options,
          changeManager,
        });
        if (isAiAssistanceStylingWithFunctionCallingEnabled()) {
          agent = new StylingAgentWithFunctionCalling({
            ...options,
            changeManager,
          });
        }

        break;
      }
      case ConversationType.NETWORK: {
        agent = new NetworkAgent(options);
        break;
      }
      case ConversationType.FILE: {
        agent = new FileAgent(options);
        break;
      }
      case ConversationType.PERFORMANCE_INSIGHT:
      case ConversationType.PERFORMANCE: {
        agent = new PerformanceAgent(options, conversationType);
        break;
      }
    }
    return agent;
  }
}
