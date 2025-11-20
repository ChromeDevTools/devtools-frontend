// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';

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

export const NOT_FOUND_IMAGE_DATA = '';
const MAX_TITLE_LENGTH = 80;

export class AiConversation {
  static generateContextDetailsMarkdown(details: ContextDetail[]): string {
    const detailsMarkdown: string[] = [];
    for (const detail of details) {
      const text = `\`\`\`\`${detail.codeLang || ''}\n${detail.text.trim()}\n\`\`\`\``;
      detailsMarkdown.push(`**${detail.title}:**\n${text}`);
    }
    return detailsMarkdown.join('\n\n');
  }

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
    this.#agent = this.#createAgent(type);

    this.type = type;
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
            contentParts.push(AiConversation.generateContextDetailsMarkdown(item.details));
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

  #createAgent(conversationType: ConversationType): AiAgent<unknown> {
    const options = {
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled(),
      changeManager: this.#changeManager,
    };
    let agent: AiAgent<unknown>;
    switch (conversationType) {
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

  async *
      run(
          initialQuery: string,
          options: {
            selected: ConversationContext<unknown>|null,
            signal?: AbortSignal,
          },
          multimodalInput?: MultimodalInput,
          ): AsyncGenerator<ResponseData, void, void> {
    for await (const data of this.#agent.run(initialQuery, options, multimodalInput)) {
      // We don't want to save partial responses to the conversation history.
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
