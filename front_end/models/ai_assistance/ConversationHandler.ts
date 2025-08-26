// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Tracing from '../../services/tracing/tracing.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import type * as Trace from '../trace/trace.js';

import {
  type AiAgent,
  type ExternalRequestResponse,
  ExternalRequestResponseType,
  type ResponseData,
  ResponseType
} from './agents/AiAgent.js';
import {FileAgent} from './agents/FileAgent.js';
import {NetworkAgent, RequestContext} from './agents/NetworkAgent.js';
import {PerformanceAgent, PerformanceTraceContext} from './agents/PerformanceAgent.js';
import {NodeContext, StylingAgent} from './agents/StylingAgent.js';
import {
  Conversation,
  ConversationType,
} from './AiHistoryStorage.js';
import {getDisabledReasons} from './AiUtils.js';
import type {ChangeManager} from './ChangeManager.js';

interface ExternalStylingRequestParameters {
  conversationType: ConversationType.STYLING;
  prompt: string;
  selector?: string;
}

interface ExternalNetworkRequestParameters {
  conversationType: ConversationType.NETWORK;
  prompt: string;
  requestUrl: string;
}

export interface ExternalPerformanceInsightsRequestParameters {
  conversationType: ConversationType.PERFORMANCE_INSIGHT;
  prompt: string;
  insightTitle: string;
  traceModel: Trace.TraceModel.Model;
}

export interface ExternalPerformanceRequestParameters {
  conversationType: ConversationType.PERFORMANCE_FULL;
  prompt: string;
  traceModel: Trace.TraceModel.Model;
}

const UIStrings = {
  /**
   * @description Notification shown to the user whenever DevTools receives an external request.
   */
  externalRequestReceived: '`DevTools` received an external request',
} as const;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   * @description Error message shown when AI assistance is not enabled in DevTools settings.
   */
  enableInSettings: 'For AI features to be available, you need to enable AI assistance in DevTools settings.',
} as const;

const str_ = i18n.i18n.registerUIStrings('models/ai_assistance/ConversationHandler.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

function isAiAssistanceServerSideLoggingEnabled(): boolean {
  return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}

async function inspectElementBySelector(selector: string): Promise<SDK.DOMModel.DOMNode|null> {
  const whitespaceTrimmedQuery = selector.trim();
  if (!whitespaceTrimmedQuery.length) {
    return null;
  }

  const showUAShadowDOM = Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom').get();
  const domModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMModel.DOMModel, {scoped: true});

  const performSearchPromises =
      domModels.map(domModel => domModel.performSearch(whitespaceTrimmedQuery, showUAShadowDOM));
  const resultCounts = await Promise.all(performSearchPromises);

  // If the selector matches multiple times, this returns the first match.
  const index = resultCounts.findIndex(value => value > 0);
  if (index >= 0) {
    return await domModels[index].searchResult(0);
  }
  return null;
}

async function inspectNetworkRequestByUrl(selector: string): Promise<SDK.NetworkRequest.NetworkRequest|null> {
  const networkManagers =
      SDK.TargetManager.TargetManager.instance().models(SDK.NetworkManager.NetworkManager, {scoped: true});

  const results = networkManagers
                      .map(networkManager => {
                        let request = networkManager.requestForURL(Platform.DevToolsPath.urlString`${selector}`);
                        if (!request && selector.at(-1) === '/') {
                          request =
                              networkManager.requestForURL(Platform.DevToolsPath.urlString`${selector.slice(0, -1)}`);
                        } else if (!request && selector.at(-1) !== '/') {
                          request = networkManager.requestForURL(Platform.DevToolsPath.urlString`${selector}/`);
                        }
                        return request;
                      })
                      .filter(req => !!req);
  const request = results.at(0);

  return request ?? null;
}

let conversationHandlerInstance: ConversationHandler|undefined;

export class ConversationHandler {
  #aiAssistanceEnabledSetting: Common.Settings.Setting<boolean>|undefined;
  #aidaClient: Host.AidaClient.AidaClient;
  #aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;

  private constructor(
      aidaClient: Host.AidaClient.AidaClient, aidaAvailability?: Host.AidaClient.AidaAccessPreconditions) {
    this.#aidaClient = aidaClient;
    if (aidaAvailability) {
      this.#aidaAvailability = aidaAvailability;
    }
    this.#aiAssistanceEnabledSetting = this.#getAiAssistanceEnabledSetting();
  }

  static instance(opts?: {
    aidaClient?: Host.AidaClient.AidaClient,
    aidaAvailability?: Host.AidaClient.AidaAccessPreconditions,
    forceNew?: boolean,
  }): ConversationHandler {
    if (opts?.forceNew || conversationHandlerInstance === undefined) {
      const aidaClient = opts?.aidaClient ?? new Host.AidaClient.AidaClient();
      conversationHandlerInstance = new ConversationHandler(aidaClient, opts?.aidaAvailability ?? undefined);
    }
    return conversationHandlerInstance;
  }

  static removeInstance(): void {
    conversationHandlerInstance = undefined;
  }

  #getAiAssistanceEnabledSetting(): Common.Settings.Setting<boolean>|undefined {
    try {
      return Common.Settings.moduleSetting('ai-assistance-enabled') as Common.Settings.Setting<boolean>;
    } catch {
      return;
    }
  }

  async #getDisabledReasons(): Promise<Platform.UIString.LocalizedString[]> {
    if (this.#aidaAvailability === undefined) {
      this.#aidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    }
    return getDisabledReasons(this.#aidaAvailability);
  }

  // eslint-disable-next-line require-yield
  async * #generateErrorResponse(message: string): AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse> {
    return {
      type: ExternalRequestResponseType.ERROR,
      message,
    };
  }

  /**
   * Handles an external request using the given prompt and uses the
   * conversation type to use the correct agent.
   */
  async handleExternalRequest(
      parameters: ExternalStylingRequestParameters|ExternalNetworkRequestParameters|
      ExternalPerformanceInsightsRequestParameters|ExternalPerformanceRequestParameters,
      ): Promise<AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse>> {
    try {
      Snackbars.Snackbar.Snackbar.show({message: i18nString(UIStrings.externalRequestReceived)});
      const disabledReasons = await this.#getDisabledReasons();
      const aiAssistanceSetting = this.#aiAssistanceEnabledSetting?.getIfNotDisabled();
      if (!aiAssistanceSetting) {
        disabledReasons.push(lockedString(UIStringsNotTranslate.enableInSettings));
      }
      if (disabledReasons.length > 0) {
        return this.#generateErrorResponse(disabledReasons.join(' '));
      }

      void VisualLogging.logFunctionCall(`start-conversation-${parameters.conversationType}`, 'external');
      switch (parameters.conversationType) {
        case ConversationType.STYLING: {
          return await this.#handleExternalStylingConversation(parameters.prompt, parameters.selector);
        }
        case ConversationType.PERFORMANCE_INSIGHT:
          if (!parameters.insightTitle) {
            return this.#generateErrorResponse(
                'The insightTitle parameter is required for debugging a Performance Insight.');
          }
          return await this.#handleExternalPerformanceInsightsConversation(
              parameters.prompt, parameters.insightTitle, parameters.traceModel);
        case ConversationType.PERFORMANCE_FULL:
          return await this.#handleExternalPerformanceConversation(parameters.prompt, parameters.traceModel);
        case ConversationType.NETWORK:
          if (!parameters.requestUrl) {
            return this.#generateErrorResponse('The url is required for debugging a network request.');
          }
          return await this.#handleExternalNetworkConversation(parameters.prompt, parameters.requestUrl);
      }
    } catch (error) {
      return this.#generateErrorResponse(error.message);
    }
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

  async * #doExternalConversation(opts: {
    conversationType: ConversationType,
    aiAgent: AiAgent<unknown>,
    prompt: string,
    selected: NodeContext|PerformanceTraceContext|RequestContext|null,
  }): AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse> {
    const {conversationType, aiAgent, prompt, selected} = opts;
    const externalConversation = new Conversation(
        conversationType,
        [],
        aiAgent.id,
        /* isReadOnly */ true,
        /* isExternal */ true,
    );
    const generator = aiAgent.run(prompt, {selected});
    const generatorWithHistory = this.handleConversationWithHistory(generator, externalConversation);
    const devToolsLogs: object[] = [];
    for await (const data of generatorWithHistory) {
      if (data.type !== ResponseType.ANSWER || data.complete) {
        devToolsLogs.push(data);
      }
      if (data.type === ResponseType.CONTEXT || data.type === ResponseType.TITLE) {
        yield {
          type: ExternalRequestResponseType.NOTIFICATION,
          message: data.title,
        };
      }
      if (data.type === ResponseType.SIDE_EFFECT) {
        data.confirm(true);
      }
      if (data.type === ResponseType.ANSWER && data.complete) {
        return {
          type: ExternalRequestResponseType.ANSWER,
          message: data.text,
          devToolsLogs,
        };
      }
    }
    return {
      type: ExternalRequestResponseType.ERROR,
      message: 'Something went wrong. No answer was generated.',
    };
  }

  async #handleExternalStylingConversation(prompt: string, selector = 'body'):
      Promise<AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse>> {
    const stylingAgent = this.createAgent(ConversationType.STYLING);
    const node = await inspectElementBySelector(selector);
    if (node) {
      await node.setAsInspectedNode();
    }
    const selected = node ? new NodeContext(node) : null;
    return this.#doExternalConversation({
      conversationType: ConversationType.STYLING,
      aiAgent: stylingAgent,
      prompt,
      selected,
    });
  }

  async #handleExternalPerformanceInsightsConversation(
      prompt: string, insightTitle: string,
      traceModel: Trace.TraceModel.Model): Promise<AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse>> {
    const insightsAgent = this.createAgent(ConversationType.PERFORMANCE_INSIGHT);
    const focusOrError = await Tracing.ExternalRequests.getInsightAgentFocusToDebug(
        traceModel,
        insightTitle,
    );
    if ('error' in focusOrError) {
      return this.#generateErrorResponse(focusOrError.error);
    }
    return this.#doExternalConversation({
      conversationType: ConversationType.PERFORMANCE_INSIGHT,
      aiAgent: insightsAgent,
      prompt,
      selected: new PerformanceTraceContext(focusOrError.focus),
    });
  }

  async #handleExternalPerformanceConversation(prompt: string, traceModel: Trace.TraceModel.Model):
      Promise<AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse>> {
    const agent = this.createAgent(ConversationType.PERFORMANCE_FULL);
    const focusOrError = await Tracing.ExternalRequests.getPerformanceAgentFocusToDebug(
        traceModel,
    );
    if ('error' in focusOrError) {
      return this.#generateErrorResponse(focusOrError.error);
    }
    return this.#doExternalConversation({
      conversationType: ConversationType.PERFORMANCE_FULL,
      aiAgent: agent,
      prompt,
      selected: new PerformanceTraceContext(focusOrError.focus),
    });
  }

  async #handleExternalNetworkConversation(prompt: string, requestUrl: string):
      Promise<AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse>> {
    const networkAgent = this.createAgent(ConversationType.NETWORK);
    const request = await inspectNetworkRequestByUrl(requestUrl);
    if (!request) {
      return this.#generateErrorResponse(`Can't find request with the given selector ${requestUrl}`);
    }
    return this.#doExternalConversation({
      conversationType: ConversationType.NETWORK,
      aiAgent: networkAgent,
      prompt,
      selected: new RequestContext(request),
    });
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
      case ConversationType.PERFORMANCE_FULL:
      case ConversationType.PERFORMANCE_INSIGHT:
      case ConversationType.PERFORMANCE_CALL_TREE: {
        agent = new PerformanceAgent(options, conversationType);
        break;
      }
    }
    return agent;
  }
}
