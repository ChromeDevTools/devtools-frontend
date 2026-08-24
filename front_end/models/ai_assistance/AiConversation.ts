// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as LHModel from '../../models/lighthouse/lighthouse.js';
import type * as Trace from '../../models/trace/trace.js';
import type * as NetworkTimeCalculator from '../network_time_calculator/network_time_calculator.js';

import {AccessibilityAgent} from './agents/AccessibilityAgent.js';
import {
  type AgentOptions,
  type AiAgent,
  type AllowedOriginResult,
  type ContextDetail,
  type ConversationContext,
  ErrorType,
  type MultimodalInput,
  type ResponseData,
  ResponseType,
  type UserQuery,
} from './agents/AiAgent.js';
import {ContextSelectionAgent} from './agents/ContextSelectionAgent.js';
import {FileAgent} from './agents/FileAgent.js';
import {NetworkAgent} from './agents/NetworkAgent.js';
import {PerformanceAgent} from './agents/PerformanceAgent.js';
import {StorageAgent} from './agents/StorageAgent.js';
import {StylingAgent} from './agents/StylingAgent.js';
import {AiAgent2} from './AiAgent2.js';
import {AiHistoryStorage, ConversationType, type SerializedConversation} from './AiHistoryStorage.js';
import type {ChangeManager} from './ChangeManager.js';
import {AccessibilityContext} from './contexts/AccessibilityContext.js';
import {DOMNodeContext} from './contexts/DOMNodeContext.js';
import {FileContext} from './contexts/FileContext.js';
import {PerformanceTraceContext} from './contexts/PerformanceTraceContext.js';
import {RequestContext} from './contexts/RequestContext.js';
import {StorageContext} from './contexts/StorageContext.js';
import {ToolAnnotation} from './tools/Tool.js';
import {ToolRegistry} from './tools/ToolRegistry.js';

export const NOT_FOUND_IMAGE_DATA = '';
export const CONTEXT_TITLE = 'Analyzing data';
const MAX_TITLE_LENGTH = 80;
/**
 * List of page navigations that are allowed during an AI agent run.
 * These are page navigations triggered by agents themselves:
 * - `about://` : Navigated to before initiating a trace recording to ensure a clean state.
 * - `chrome://terms`: Navigated to by Lighthouse during its Back-Forward Cache
 *    audit.
 */
export const ALLOWED_PAGE_NAVIGATIONS: Platform.DevToolsPath.UrlString[] = [
  Platform.DevToolsPath.urlString`about://`,
  Platform.DevToolsPath.urlString`chrome://terms`,
];

export function generateContextDetailsMarkdown(details: ContextDetail[]): string {
  const detailsMarkdown: string[] = [];
  for (const detail of details) {
    const text = `\`\`\`\`${detail.codeLang || ''}\n${detail.text.trim()}\n\`\`\`\``;
    detailsMarkdown.push(`**${detail.title}:**\n${text}`);
  }
  return detailsMarkdown.join('\n\n');
}
export interface AiConversationOptions {
  type: ConversationType;
  data?: ResponseData[];
  id?: string;
  isReadOnly?: boolean;
  aidaClient?: Host.AidaClient.AidaClient;
  changeManager?: ChangeManager;
  performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>;
  onInspectElement?: () => Promise<SDK.DOMModel.DOMNode|null>;
  networkTimeCalculator?: NetworkTimeCalculator.NetworkTransferTimeCalculator;
  lighthouseRecording?: (overrides?: LHModel.RunTypes.RunOverrides) => Promise<LHModel.ReporterTypes.ReportJSON|null>;
  aiHistoryStorage?: AiHistoryStorage;
  targetManager?: SDK.TargetManager.TargetManager;
}

export class AiConversation {
  static fromSerializedConversation(serializedConversation: SerializedConversation): AiConversation {
    const history = serializedConversation.history.map(entry => {
      if (entry.type === ResponseType.SIDE_EFFECT) {
        return {...entry, confirm: () => {}};
      }
      return entry;
    });
    return new AiConversation({
      type: serializedConversation.type,
      data: history,
      id: serializedConversation.id,
      isReadOnly: true,
    });
  }

  readonly id: string;
  // Handled in #updateAgent
  #type!: ConversationType;
  // Handled in #updateAgent
  #agent!: AiAgent<unknown>;

  #isReadOnly: boolean;
  readonly history: ResponseData[];

  #aidaClient: Host.AidaClient.AidaClient;
  #changeManager: ChangeManager|undefined;
  #origin?: string;
  #navigationOccurredDuringRun = false;

  #contexts: Array<ConversationContext<unknown>> = [];

  #performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>;
  #lighthouseRecording?: (overrides?: LHModel.RunTypes.RunOverrides) => Promise<LHModel.ReporterTypes.ReportJSON|null>;
  #onInspectElement?: () => Promise<SDK.DOMModel.DOMNode|null>;
  #networkTimeCalculator?: NetworkTimeCalculator.NetworkTransferTimeCalculator;
  readonly #aiHistoryStorage: AiHistoryStorage;
  readonly #targetManager: SDK.TargetManager.TargetManager;

  constructor(options: AiConversationOptions) {
    const {
      type,
      data = [],
      id = crypto.randomUUID(),
      isReadOnly = true,
      aidaClient = new Host.AidaClient.AidaClient(),
      changeManager,
      performanceRecordAndReload,
      onInspectElement,
      networkTimeCalculator,
      lighthouseRecording,
      aiHistoryStorage = AiHistoryStorage.instance(),
      // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
      targetManager = SDK.TargetManager.TargetManager.instance(),
    } = options;
    this.#changeManager = changeManager;
    this.#aidaClient = aidaClient;
    this.#performanceRecordAndReload = performanceRecordAndReload;
    this.#onInspectElement = onInspectElement;
    this.#networkTimeCalculator = networkTimeCalculator;
    this.#lighthouseRecording = lighthouseRecording;
    this.#aiHistoryStorage = aiHistoryStorage;
    this.#targetManager = targetManager;

    this.id = id;
    this.#isReadOnly = isReadOnly;
    this.history = this.#reconstructHistory(data);
    // Needs to be last
    this.#updateAgent(type);
  }

  get isReadOnly(): boolean {
    return this.#isReadOnly;
  }

  static titleForSerialized(serialized: SerializedConversation): string|undefined {
    const query = serialized.history.find(item => item.type === ResponseType.USER_QUERY)?.query;
    if (!query) {
      return undefined;
    }
    return AiConversation.title(query);
  }

  static title(query: string): string {
    return `${query.substring(0, MAX_TITLE_LENGTH)}${query.length > MAX_TITLE_LENGTH ? '…' : ''}`;
  }

  get title(): string|undefined {
    const query = this.history.find(response => response.type === ResponseType.USER_QUERY)?.query;

    if (!query) {
      return;
    }

    return AiConversation.title(query);
  }

  get isEmpty(): boolean {
    return this.history.length === 0;
  }

  #setOriginIfEmpty(newOrigin: string|undefined): void {
    if (!this.#origin) {
      this.#origin = newOrigin;
    }
  }

  setContext(updateContext: ConversationContext<unknown>|null): void {
    if (!updateContext) {
      this.#contexts = [];
      if (isAiAssistanceContextSelectionEnabled()) {
        this.#updateAgent(ConversationType.NONE);
      }

      return;
    }

    this.#contexts = [updateContext];

    if (isAiAssistanceContextSelectionEnabled()) {
      if (updateContext instanceof FileContext) {
        this.#updateAgent(ConversationType.FILE);
      } else if (updateContext instanceof DOMNodeContext) {
        this.#updateAgent(ConversationType.STYLING);
      } else if (updateContext instanceof RequestContext) {
        this.#updateAgent(ConversationType.NETWORK);
      } else if (updateContext instanceof PerformanceTraceContext) {
        this.#updateAgent(ConversationType.PERFORMANCE);
      } else if (updateContext instanceof AccessibilityContext) {
        this.#updateAgent(ConversationType.ACCESSIBILITY);
      } else if (updateContext instanceof StorageContext) {
        this.#updateAgent(ConversationType.STORAGE);
      }
    }
  }

  get selectedContext(): ConversationContext<unknown>|undefined {
    return this.#contexts.at(0);
  }

  #reconstructHistory(historyWithoutImages: ResponseData[]): ResponseData[] {
    const imageHistory = this.#aiHistoryStorage.getImageHistory();
    if (imageHistory && imageHistory.length > 0) {
      const history: ResponseData[] = [];
      for (const data of historyWithoutImages) {
        if (data.type === ResponseType.USER_QUERY && data.imageId) {
          const image = imageHistory.find(item => item.id === data.imageId);
          const inlineData = image ? {data: image.data, mimeType: image.mimeType} :
                                     {data: NOT_FOUND_IMAGE_DATA, mimeType: 'image/jpeg'};
          history.push({...data, imageInput: {inlineData}});
        } else {
          history.push(data);
        }
      }
      return history;
    }
    return historyWithoutImages;
  }

  getConversationMarkdown(): string {
    const contentParts: string[] = [];
    contentParts.push(
        '# Exported Chat from Chrome DevTools AI Assistance\n\n' +
            `**Export Timestamp (UTC):** ${new Date().toISOString()}\n\n` +
            '---',
    );
    for (const item of this.history) {
      switch (item.type) {
        case ResponseType.USER_QUERY: {
          contentParts.push(`## User\n\n${item.query}`);
          if (item.imageInput) {
            contentParts.push('User attached an image');
          }
          contentParts.push('## AI');
          break;
        }
        case ResponseType.CONTEXT: {
          contentParts.push(`### ${CONTEXT_TITLE}`);
          if (item.details && item.details.length > 0) {
            contentParts.push(generateContextDetailsMarkdown(item.details));
          }
          break;
        }
        case ResponseType.TITLE: {
          contentParts.push(`### ${item.title}`);
          break;
        }
        case ResponseType.THOUGHT: {
          contentParts.push(`${item.thought}`);
          break;
        }
        case ResponseType.ACTION: {
          // We want to export only actions with output field
          if (!item.output) {
            break;
          }
          if (item.code) {
            contentParts.push(`**Code executed:**\n\`\`\`\n${item.code.trim()}\n\`\`\``);
          }
          contentParts.push(`**Data returned:**\n\`\`\`\n${item.output}\n\`\`\``);
          break;
        }
        case ResponseType.ANSWER: {
          if (item.complete) {
            contentParts.push(`### Answer\n\n${item.text.trim()}`);
          }
          break;
        }
      }
    }
    return contentParts.join('\n\n');
  }

  archiveConversation(): void {
    this.#isReadOnly = true;
  }

  async addHistoryItem(item: ResponseData): Promise<void> {
    this.history.push(item);
    await this.#aiHistoryStorage.upsertHistoryEntry(this.serialize());
    if (item.type === ResponseType.USER_QUERY) {
      void this.#aiHistoryStorage.addRecentPrompt(item.query);
      if (item.imageId && item.imageInput && 'inlineData' in item.imageInput) {
        const inlineData = item.imageInput.inlineData;
        await this.#aiHistoryStorage.upsertImage({
          id: item.imageId,
          data: inlineData.data,
          mimeType: inlineData.mimeType,
        });
      }
    }
  }

  serialize(): SerializedConversation {
    return {
      id: this.id,
      history: this.history
                   .map(item => {
                     switch (item.type) {
                       case ResponseType.CONTEXT_CHANGE: {
                         return null;
                       }
                       case ResponseType.USER_QUERY: {
                         return {...item, imageInput: undefined};
                       }
                       case ResponseType.SIDE_EFFECT: {
                         return {...item, confirm: undefined};
                       }
                       case ResponseType.CONTEXT: {
                         return {...item, widgets: undefined};
                       }
                       case ResponseType.ACTION: {
                         const tool = item.toolName ? ToolRegistry.get(item.toolName) : undefined;
                         const shouldRedact = tool?.annotations?.includes(ToolAnnotation.REDACT_FROM_HISTORY);
                         return {
                           ...item,
                           output: shouldRedact ? '<redacted>' : item.output,
                           widgets: undefined,
                         };
                       }
                       default:
                         return item;
                     }
                   })
                   .filter(history => !!history),
      type: this.#type,
    };
  }

  #filterHistoryForNewAgent(): Host.AidaClient.Content[] {
    return this.#agent?.history
               .map(content => {
                 return {
                   ...content,
                   parts: content.parts.filter(part => !('functionCall' in part) && !('functionResponse' in part)),
                 };
               })
               .filter(content => content.parts.length > 0) ??
        [];
  }

  #updateAgent(type: ConversationType): void {
    if (this.#type === type) {
      return;
    }

    const previousType = this.#type;
    this.#type = type;

    // In AI Architecture V2, DevTools uses a single unified agent (AiAgent2) that
    // dynamically loads skills on demand. Reusing the existing agent instance across
    // context changes preserves its loaded activeSkills and declared tools so the model
    // does not need to re-learn skills it already acquired earlier in the conversation.
    if (Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled && this.#agent instanceof AiAgent2) {
      return;
    }

    // In legacy V1 architecture, agents are recreated when switching conversation types.
    // Discard conversation history when transitioning away from Storage to prevent
    // sensitive data (e.g. cookies or storage items) from leaking into subsequent agent queries.
    const isTransitioningFromStorage = previousType === ConversationType.STORAGE && type !== ConversationType.STORAGE;
    const history = isTransitioningFromStorage ? [] : this.#filterHistoryForNewAgent();

    const options = {
      aidaClient: this.#aidaClient,
      serverSideLoggingAllowed: isAiAssistanceServerSideLoggingAllowed(),
      sessionId: this.id,
      changeManager: this.#changeManager,
      performanceRecordAndReload: this.#performanceRecordAndReload,
      onInspectElement: this.#onInspectElement,
      networkTimeCalculator: this.#networkTimeCalculator,
      lighthouseRecording: this.#lighthouseRecording,
      allowedOrigin: this.allowedOrigin,
      history,
      targetManager: this.#targetManager,
    };

    this.#agent = Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled ? new AiAgent2(options) :
                                                                              this.#createV1Agent(type, options);
  }

  #createV1Agent(type: ConversationType, options: AgentOptions): AiAgent<unknown> {
    switch (type) {
      case ConversationType.STYLING:
        return new StylingAgent(options);
      case ConversationType.NETWORK:
        return new NetworkAgent(options);
      case ConversationType.FILE:
        return new FileAgent(options);
      case ConversationType.PERFORMANCE:
        return new PerformanceAgent(options);
      case ConversationType.ACCESSIBILITY:
        return new AccessibilityAgent(options);
      case ConversationType.STORAGE:
        return new StorageAgent(options);
      case ConversationType.NONE:
        return new ContextSelectionAgent(options);
      default:
        Platform.assertNever(type, 'Unknown conversation type');
    }
  }

  async *
      run(
          initialQuery: string,
          options: {
            signal?: AbortSignal,
            multimodalInput?: MultimodalInput,
          } = {},
          ): AsyncGenerator<ResponseData, void, void> {
    this.#navigationOccurredDuringRun = false;
    const originAtRunStart = getPrimaryPageOrigin(this.#targetManager);
    const listener = (): void => {
      // If an unexpected navigation to a different origin occurred
      // during processing the user's request, we don't want to allow
      // the agent to run any function calls and retrieve data from the new origin.
      // Performance agent and accessibility agent navigate to 'about://' or 'chrome://terms'
      const newOrigin = getPrimaryPageOrigin(this.#targetManager);
      if (originAtRunStart !== newOrigin && newOrigin && !ALLOWED_PAGE_NAVIGATIONS.includes(newOrigin)) {
        this.#navigationOccurredDuringRun = true;
      }
    };
    const targetManager = this.#targetManager;
    targetManager.addModelListener(SDK.ResourceTreeModel.ResourceTreeModel,
                                   SDK.ResourceTreeModel.Events.PrimaryPageChanged, listener, this);

    try {
      if (this.isBlockedByOrigin) {
        // This error should not be reached. If it happens, some
        // invariants do not hold anymore.
        throw new Error('cross-origin context data should not be included');
      }

      yield* this.#runAgent(initialQuery, options, {isInitialCall: true});
    } finally {
      targetManager.removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel,
                                        SDK.ResourceTreeModel.Events.PrimaryPageChanged, listener, this);
    }
  }

  #getQueryAfterSelection(initialQuery: string, selection: string): string {
    return `${selection}\nOriginal user query: ${initialQuery}`;
  }

  async *
      #runAgent(
          initialQuery: string,
          options: {
            signal?: AbortSignal,
            multimodalInput?: MultimodalInput,
          } = {},
          runOptions: {isInitialCall?: boolean} = {},
          ): AsyncGenerator<ResponseData, void, void> {
    this.#setOriginIfEmpty(this.selectedContext?.getOrigin());
    if (this.isBlockedByOrigin) {
      yield {
        type: ResponseType.ERROR,
        error: ErrorType.CROSS_ORIGIN,
      };
      return;
    }

    if (runOptions.isInitialCall) {
      const userQuery: UserQuery = {
        type: ResponseType.USER_QUERY,
        query: initialQuery,
        imageInput: options.multimodalInput?.input,
        imageId: options.multimodalInput?.id,
      };
      void this.addHistoryItem(userQuery);
      yield userQuery;
    }

    function shouldAddToHistory(data: ResponseData): boolean {
      if (data.type === ResponseType.CONTEXT_CHANGE) {
        return false;
      }

      // We don't want to save partial responses to the conversation history.
      // TODO(crbug.com/463325400): We should save interleaved answers to the history as well.
      if (data.type === ResponseType.ANSWER && !data.complete) {
        return false;
      }

      return true;
    }

    for await (const data of this.#agent.run(
        initialQuery,
        {
          signal: options.signal,
          selected: this.selectedContext ?? null,
        },
        options.multimodalInput,
        )) {
      // Add to history if relevant
      if (shouldAddToHistory(data)) {
        void this.addHistoryItem(data);
      }
      // Always yield the data
      yield data;

      // If we change the context
      // requery with the specialized agent.
      if (data.type === ResponseType.CONTEXT_CHANGE) {
        this.setContext(data.context);
        yield*
            this.#runAgent(this.#getQueryAfterSelection(initialQuery, data.description), options,
                           {isInitialCall: false});
        return;
      }
    }
  }

  /**
   * Indicates whether the new conversation context is blocked due to cross-origin restrictions.
   * This happens when the conversation's context has a different
   * origin than the selected context.
   */
  get isBlockedByOrigin(): boolean {
    return !this.#contexts.every(context => context.isOriginAllowed(this.#origin));
  }

  get origin(): string|undefined {
    return this.#origin;
  }

  get type(): ConversationType {
    return this.#type;
  }

  allowedOrigin = (): AllowedOriginResult => {
    if (this.#navigationOccurredDuringRun) {
      return {blocked: true};
    }
    if (this.#origin) {
      return {origin: this.#origin};
    }
    this.#origin = getPrimaryPageOrigin(this.#targetManager);

    return {origin: this.#origin};
  };
}

/**
 * Checks whether server-side logging is allowed by the global system policy.
 * Note that even if this returns true, individual agents can still dynamically
 * deactivate/activate logging during their execution (e.g., when handling
 * sensitive tools).
 */
function isAiAssistanceServerSideLoggingAllowed(): boolean {
  return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}

/**
 * Returns true if context changes should dynamically update the conversation's
 * agent/type state. Enabled for both the legacy V1 selection agent and the
 * unified V2 architecture.
 */
function isAiAssistanceContextSelectionEnabled(): boolean {
  return Boolean(Root.Runtime.hostConfig.devToolsAiAssistanceContextSelectionAgent?.enabled) ||
      Boolean(Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled);
}

function getPrimaryPageOrigin(
    targetManager: SDK.TargetManager.TargetManager,
    ): Platform.DevToolsPath.UrlString|undefined {
  const target = targetManager.primaryPageTarget();
  const inspectedURL = target?.inspectedURL();
  return inspectedURL ? new Common.ParsedURL.ParsedURL(inspectedURL).securityOrigin() : undefined;
}
