// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Trace from '../../models/trace/trace.js';
import * as Greendev from '../greendev/greendev.js';
import type * as NetworkTimeCalculator from '../network_time_calculator/network_time_calculator.js';

import {
  type AiAgent,
  type ContextDetail,
  type ConversationContext,
  type MultimodalInput,
  type ResponseData,
  ResponseType,
  type UserQuery
} from './agents/AiAgent.js';
import {BreakpointDebuggerAgent} from './agents/BreakpointDebuggerAgent.js';
import {ContextSelectionAgent} from './agents/ContextSelectionAgent.js';
import {FileAgent, FileContext} from './agents/FileAgent.js';
import {NetworkAgent, RequestContext} from './agents/NetworkAgent.js';
import {PerformanceAgent, PerformanceTraceContext} from './agents/PerformanceAgent.js';
import {NodeContext, StylingAgent} from './agents/StylingAgent.js';
import {AiHistoryStorage, ConversationType, type SerializedConversation} from './AiHistoryStorage.js';
import type {ChangeManager} from './ChangeManager.js';

export const NOT_FOUND_IMAGE_DATA = '';
const MAX_TITLE_LENGTH = 80;

export function generateContextDetailsMarkdown(details: ContextDetail[]): string {
  const detailsMarkdown: string[] = [];
  for (const detail of details) {
    const text = `\`\`\`\`${detail.codeLang || ''}\n${detail.text.trim()}\n\`\`\`\``;
    detailsMarkdown.push(`**${detail.title}:**\n${text}`);
  }
  return detailsMarkdown.join('\n\n');
}
export class AiConversation {
  static fromSerializedConversation(serializedConversation: SerializedConversation): AiConversation {
    const history = serializedConversation.history.map(entry => {
      if (entry.type === ResponseType.SIDE_EFFECT) {
        return {...entry, confirm: () => {}};
      }
      return entry;
    });
    return new AiConversation(
        serializedConversation.type,
        history,
        serializedConversation.id,
        true,
        undefined,
        undefined,
        serializedConversation.isExternal,
        undefined,
        undefined,
    );
  }

  readonly id: string;
  // Handled in #updateAgent
  #type!: ConversationType;
  // Handled in #updateAgent
  #agent!: AiAgent<unknown>;

  #isReadOnly: boolean;
  readonly history: ResponseData[];
  #isExternal: boolean;

  #aidaClient: Host.AidaClient.AidaClient;
  #changeManager: ChangeManager|undefined;
  #origin?: string;

  #contexts: Array<ConversationContext<unknown>> = [];

  #performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>;
  #onInspectElement?: () => Promise<SDK.DOMModel.DOMNode|null>;
  #networkTimeCalculator?: NetworkTimeCalculator.NetworkTransferTimeCalculator;

  constructor(
      type: ConversationType,
      data: ResponseData[] = [],
      id: string = crypto.randomUUID(),
      isReadOnly = true,
      aidaClient: Host.AidaClient.AidaClient = new Host.AidaClient.AidaClient(),
      changeManager?: ChangeManager,
      isExternal = false,
      performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>,
      onInspectElement?: () => Promise<SDK.DOMModel.DOMNode|null>,
      networkTimeCalculator?: NetworkTimeCalculator.NetworkTransferTimeCalculator,
  ) {
    this.#changeManager = changeManager;
    this.#aidaClient = aidaClient;
    this.#performanceRecordAndReload = performanceRecordAndReload;
    this.#onInspectElement = onInspectElement;
    this.#networkTimeCalculator = networkTimeCalculator;

    this.id = id;
    this.#isReadOnly = isReadOnly;
    this.#isExternal = isExternal;
    this.history = this.#reconstructHistory(data);
    // Needs to be last
    this.#updateAgent(type);
  }

  get isReadOnly(): boolean {
    return this.#isReadOnly;
  }

  get title(): string|undefined {
    const query = this.history.find(response => response.type === ResponseType.USER_QUERY)?.query;

    if (!query) {
      return;
    }

    if (this.#isExternal) {
      return `[External] ${query.substring(0, MAX_TITLE_LENGTH - 11)}${
          query.length > MAX_TITLE_LENGTH - 11 ? '…' : ''}`;
    }
    return `${query.substring(0, MAX_TITLE_LENGTH)}${query.length > MAX_TITLE_LENGTH ? '…' : ''}`;
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
      if (isAiAssistanceContextSelectionAgentEnabled()) {
        this.#updateAgent(ConversationType.NONE);
      }

      return;
    }

    this.#contexts = [updateContext];

    if (isAiAssistanceContextSelectionAgentEnabled()) {
      if (updateContext instanceof FileContext) {
        this.#updateAgent(ConversationType.FILE);
      } else if (updateContext instanceof NodeContext) {
        this.#updateAgent(ConversationType.STYLING);
      } else if (updateContext instanceof RequestContext) {
        this.#updateAgent(ConversationType.NETWORK);
      } else if (updateContext instanceof PerformanceTraceContext) {
        this.#updateAgent(ConversationType.PERFORMANCE);
      }
    }
  }

  get selectedContext(): ConversationContext<unknown>|undefined {
    return this.#contexts.at(0);
  }

  #reconstructHistory(historyWithoutImages: ResponseData[]): ResponseData[] {
    const imageHistory = AiHistoryStorage.instance().getImageHistory();
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
          contentParts.push(`### ${item.title}`);
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
    await AiHistoryStorage.instance().upsertHistoryEntry(this.serialize());
    if (item.type === ResponseType.USER_QUERY) {
      if (item.imageId && item.imageInput && 'inlineData' in item.imageInput) {
        const inlineData = item.imageInput.inlineData;
        await AiHistoryStorage.instance().upsertImage({
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
                     if (item.type === ResponseType.CONTEXT_CHANGE) {
                       return null;
                     }

                     if (item.type === ResponseType.USER_QUERY) {
                       return {...item, imageInput: undefined};
                     }
                     // Remove the `confirm()`-function because `structuredClone()` throws on functions
                     if (item.type === ResponseType.SIDE_EFFECT) {
                       return {...item, confirm: undefined};
                     }
                     return item;
                   })
                   .filter(history => !!history),
      type: this.#type,
      isExternal: this.#isExternal,
    };
  }

  #updateAgent(type: ConversationType): void {
    if (this.#type === type) {
      return;
    }

    this.#type = type;

    // We need to filter out the function calls
    // as the LLM tries to call the existing ones.
    const history =
        this.#agent?.history
            .map(content => {
              return {
                ...content,
                parts: content.parts.filter(part => !('functionCall' in part) && !('functionResponse' in part)),
              };
            })
            .filter(content => content.parts.length > 0);

    const options = {
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
      sessionId: this.id,
      changeManager: this.#changeManager,
      performanceRecordAndReload: this.#performanceRecordAndReload,
      onInspectElement: this.#onInspectElement,
      networkTimeCalculator: this.#networkTimeCalculator,
      history,
    };
    switch (type) {
      case ConversationType.STYLING: {
        this.#agent = new StylingAgent(options);
        break;
      }
      case ConversationType.NETWORK: {
        this.#agent = new NetworkAgent(options);
        break;
      }
      case ConversationType.FILE: {
        this.#agent = new FileAgent(options);
        break;
      }
      case ConversationType.PERFORMANCE: {
        this.#agent = new PerformanceAgent(options);
        break;
      }
      case ConversationType.BREAKPOINT: {
        const breakpointAgentEnabled = Greendev.Prototypes.instance().isEnabled('breakpointDebuggerAgent');
        if (breakpointAgentEnabled) {
          this.#agent = new BreakpointDebuggerAgent(options);
        }
        break;
      }
      case ConversationType.NONE: {
        this.#agent = new ContextSelectionAgent(options);
        break;
      }
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
    if (this.isBlockedByOrigin) {
      // This error should not be reached. If it happens, some
      // invariants do not hold anymore.
      throw new Error('cross-origin context data should not be included');
    }

    const userQuery: UserQuery = {
      type: ResponseType.USER_QUERY,
      query: initialQuery,
      imageInput: options.multimodalInput?.input,
      imageId: options.multimodalInput?.id,
    };
    void this.addHistoryItem(userQuery);
    yield userQuery;

    this.#setOriginIfEmpty(this.selectedContext?.getOrigin());

    if (this.isBlockedByOrigin) {
      throw new Error('Cross-origin context data should not be included');
    }

    yield* this.#runAgent(initialQuery, options);
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
          ): AsyncGenerator<ResponseData, void, void> {
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
        yield* this.#runAgent(this.#getQueryAfterSelection(initialQuery, data.description), options);
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
}

function isAiAssistanceServerSideLoggingEnabled(): boolean {
  return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}

function isAiAssistanceContextSelectionAgentEnabled(): boolean {
  return Boolean(Root.Runtime.hostConfig.devToolsAiAssistanceContextSelectionAgent?.enabled);
}
