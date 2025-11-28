// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import * as NetworkTimeCalculator from '../network_time_calculator/network_time_calculator.js';

import {
  type AiAgent,
  type ContextDetail,
  type ConversationContext,
  type MultimodalInput,
  type ResponseData,
  ResponseType
} from './agents/AiAgent.js';
import {FileAgent} from './agents/FileAgent.js';
import {NetworkAgent} from './agents/NetworkAgent.js';
import {PerformanceAgent} from './agents/PerformanceAgent.js';
import {StylingAgent} from './agents/StylingAgent.js';
import {AiHistoryStorage, ConversationType, type SerializedConversation} from './AiHistoryStorage.js';
import type {ChangeManager} from './ChangeManager.js';
import {NetworkRequestFormatter} from './data_formatters/NetworkRequestFormatter.js';
import {PerformanceInsightFormatter} from './data_formatters/PerformanceInsightFormatter.js';
import {micros} from './data_formatters/UnitFormatters.js';
import {AgentFocus} from './performance/AIContext.js';

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
    );
  }

  readonly id: string;
  type: ConversationType;
  #isReadOnly: boolean;
  readonly history: ResponseData[];
  #isExternal: boolean;

  #aidaClient: Host.AidaClient.AidaClient;
  #changeManager: ChangeManager|undefined;
  #agent: AiAgent<unknown>;

  constructor(
      type: ConversationType,
      data: ResponseData[] = [],
      id: string = crypto.randomUUID(),
      isReadOnly = true,
      aidaClient: Host.AidaClient.AidaClient = new Host.AidaClient.AidaClient(),
      changeManager?: ChangeManager,
      isExternal = false,
  ) {
    this.#changeManager = changeManager;
    this.#aidaClient = aidaClient;
    this.type = type;
    this.#agent = this.#createAgent();

    this.id = id;
    this.#isReadOnly = isReadOnly;
    this.#isExternal = isExternal;
    this.history = this.#reconstructHistory(data);
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
      history: this.history.map(item => {
        if (item.type === ResponseType.USER_QUERY) {
          return {...item, imageInput: undefined};
        }
        // Remove the `confirm()`-function because `structuredClone()` throws on functions
        if (item.type === ResponseType.SIDE_EFFECT) {
          return {...item, confirm: undefined};
        }
        return item;
      }),
      type: this.type,
      isExternal: this.#isExternal,
    };
  }

  #createAgent(): AiAgent<unknown> {
    const options = {
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
      changeManager: this.#changeManager,
    };
    let agent: AiAgent<unknown>;
    switch (this.type) {
      case ConversationType.STYLING: {
        agent = new StylingAgent(options);
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
      case ConversationType.PERFORMANCE: {
        agent = new PerformanceAgent(options);
        break;
      }
    }
    return agent;
  }

  #factsCache = new Map<ExtraContext, Host.AidaClient.RequestFact>();

  async #createFactsForExtraContext(contexts: ExtraContext[]): Promise<void> {
    for (const context of contexts) {
      const cached = this.#factsCache.get(context);
      if (cached) {
        this.#agent.addFact(cached);
        continue;
      }

      if (context instanceof SDK.DOMModel.DOMNode) {
        const desc = await StylingAgent.describeElement(context);

        const fact = {
          text: `Relevant HTML element:\n${desc}`,
          metadata: {
            source: 'devtools-floaty',
            score: 1,
          }
        };
        this.#factsCache.set(context, fact);
        this.#agent.addFact(fact);
      } else if (context instanceof SDK.NetworkRequest.NetworkRequest) {
        const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
        calculator.updateBoundaries(context);
        const formatter = new NetworkRequestFormatter(context, calculator);
        const desc = await formatter.formatNetworkRequest();

        const fact = {
          text: `Relevant network request:\n${desc}`,
          metadata: {
            source: 'devtools-floaty',
            score: 1,
          }
        };
        this.#factsCache.set(context, fact);
        this.#agent.addFact(fact);
      } else if ('insight' in context) {
        const focus = AgentFocus.fromInsight(context.trace, context.insight);
        const formatter = new PerformanceInsightFormatter(
            focus,
            context.insight,
        );

        const text = `Relevant Performance Insight:\n${formatter.formatInsight()}`;
        const fact = {
          text,
          metadata: {
            source: 'devtools-floaty',
            score: 1,
          }
        };
        this.#factsCache.set(context, fact);
        this.#agent.addFact(fact);
      } else {
        // Must be a trace event
        const time = Trace.Types.Timing.Micro(
            context.event.ts - context.traceStartTime,
        );

        const desc = `Trace event: ${context.event.name}
Time: ${micros(time)}`;

        const fact = {
          text: `Relevant trace event:\n${desc}`,
          metadata: {
            source: 'devtools-floaty',
            score: 1,
          }
        };
        this.#factsCache.set(context, fact);
        this.#agent.addFact(fact);
      }
    }
  }

  async *
      run(
          initialQuery: string,
          options: {selected: ConversationContext<unknown>|null, signal?: AbortSignal, extraContext?: ExtraContext[]},
          multimodalInput?: MultimodalInput,
          ): AsyncGenerator<ResponseData, void, void> {
    if (options.extraContext) {
      await this.#createFactsForExtraContext(options.extraContext);
    }
    for await (const data of this.#agent.run(initialQuery, options, multimodalInput)) {
      // We don't want to save partial responses to the conversation history.
      // TODO(crbug.com/463325400): We should save interleaved answers to the history as well.
      if (data.type !== ResponseType.ANSWER || data.complete) {
        void this.addHistoryItem(data);
      }
      yield data;
    }
  }

  get origin(): string|undefined {
    return this.#agent.origin;
  }
}

function isAiAssistanceServerSideLoggingEnabled(): boolean {
  return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}

// TODO: this is the same as the type in UI.Floaty but we cannot use UI
// here. This is fine for prototyping but if we take this further we can
// rearchitect.
type ExtraContext = SDK.DOMModel.DOMNode|SDK.NetworkRequest.NetworkRequest|
                    {event: Trace.Types.Events.Event, traceStartTime: Trace.Types.Timing.Micro}|
                    {insight: Trace.Insights.Types.InsightModel, trace: Trace.TraceModel.ParsedTrace};
