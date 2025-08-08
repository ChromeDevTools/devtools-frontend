// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  type AiAgent,
  type ExternalRequestResponse,
  ExternalRequestResponseType,
  type ResponseData,
  ResponseType
} from './agents/AiAgent.js';
import {FileAgent} from './agents/FileAgent.js';
import {NetworkAgent, RequestContext} from './agents/NetworkAgent.js';
import {PerformanceAgent} from './agents/PerformanceAgent.js';
import {NodeContext, StylingAgent, StylingAgentWithFunctionCalling} from './agents/StylingAgent.js';
import {
  Conversation,
  ConversationType,
} from './AiHistoryStorage.js';
import {getDisabledReasons} from './AiUtils.js';
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

function isAiAssistanceStylingWithFunctionCallingEnabled(): boolean {
  return Boolean(Root.Runtime.hostConfig.devToolsFreestyler?.functionCalling);
}

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

  /**
   * Handles an external request using the given prompt and uses the
   * conversation type to use the correct agent.
   */
  async handleExternalRequest(
      parameters: ExternalStylingRequestParameters|ExternalNetworkRequestParameters|
      ExternalPerformanceInsightsRequestParameters,
      ): Promise<AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse>> {
    // eslint-disable-next-line require-yield
    async function*
        generateErrorResponse(message: string): AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse> {
      return {
        type: ExternalRequestResponseType.ERROR,
        message,
      };
    }

    try {
      Snackbars.Snackbar.Snackbar.show({message: i18nString(UIStrings.externalRequestReceived)});
      const disabledReasons = await this.#getDisabledReasons();
      const aiAssistanceSetting = this.#aiAssistanceEnabledSetting?.getIfNotDisabled();
      if (!aiAssistanceSetting) {
        disabledReasons.push(lockedString(UIStringsNotTranslate.enableInSettings));
      }
      if (disabledReasons.length > 0) {
        return generateErrorResponse(disabledReasons.join(' '));
      }

      void VisualLogging.logFunctionCall(`start-conversation-${parameters.conversationType}`, 'external');
      switch (parameters.conversationType) {
        case ConversationType.STYLING: {
          return this.#handleExternalStylingConversation(parameters.prompt, parameters.selector);
        }
        case ConversationType.PERFORMANCE_INSIGHT:
          return generateErrorResponse('Not implemented here');
        case ConversationType.NETWORK:
          if (!parameters.requestUrl) {
            return generateErrorResponse('The url is required for debugging a network request.');
          }
          return this.#handleExternalNetworkConversation(parameters.prompt, parameters.requestUrl);
      }
    } catch (error) {
      return generateErrorResponse(error.message);
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

  async *
      #handleExternalStylingConversation(prompt: string, selector = 'body'):
          AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse> {
    const options = {
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
    };
    const stylingAgent = isAiAssistanceStylingWithFunctionCallingEnabled() ?
        new StylingAgentWithFunctionCalling({...options}) :
        new StylingAgent({...options});

    const externalConversation = new Conversation(
        ConversationType.STYLING,
        [],
        stylingAgent.id,
        /* isReadOnly */ true,
        /* isExternal */ true,
    );

    const node = await inspectElementBySelector(selector);
    if (node) {
      await node.setAsInspectedNode();
    }
    const generator = stylingAgent.run(
        prompt,
        {
          selected: node ? new NodeContext(node) : null,
        },
    );
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

  async *
      #handleExternalNetworkConversation(prompt: string, requestUrl: string):
          AsyncGenerator<ExternalRequestResponse, ExternalRequestResponse> {
    const options = {
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
    };
    const networkAgent = new NetworkAgent(options);
    const externalConversation = new Conversation(
        ConversationType.NETWORK,
        [],
        networkAgent.id,
        /* isReadOnly */ true,
        /* isExternal */ true,
    );

    const request = await inspectNetworkRequestByUrl(requestUrl);
    if (!request) {
      return {
        type: ExternalRequestResponseType.ERROR,
        message: `Can't find request with the given selector ${requestUrl}`,
      };
    }
    const generator = networkAgent.run(
        prompt,
        {
          selected: new RequestContext(request),
        },
    );
    const generatorWithHistory = this.handleConversationWithHistory(generator, externalConversation);
    const devToolsLogs: object[] = [];
    for await (const data of generatorWithHistory) {
      // We don't want to save partial responses to the conversation history.
      if (data.type !== ResponseType.ANSWER || data.complete) {
        void externalConversation.addHistoryItem(data);
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
