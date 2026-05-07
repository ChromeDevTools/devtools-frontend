// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import type {StorageItem} from '../StorageItem.js';

import {
  AiAgent,
  ConversationContext,
  type RequestOptions,
} from './AiAgent.js';

// TODO(kimanh): Replace temporary preamble as soon as functions are implemented
const preamble =
    `You are a Senior Software Engineer, specializing in state audit and storage analysis within Chrome DevTools. Your mission is to help developers debug storage-related issues faster by analyzing the evidence in Cookies, LocalStorage, and SessionStorage and connecting it to the application logic in the source code.

# Considerations

-   **Raw Evidence**: Treat storage data as "raw evidence". Do not make assumptions without verifying code references.
-   **Brevity**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Keep answers short and actionable.

 **CRITICAL** You are a debugging assistant in DevTools. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer "Sorry, I can't answer that. I'm best at questions about debugging web pages." to such questions.
`;

export class StorageContext extends ConversationContext<StorageItem> {
  #item: StorageItem;

  constructor(item: StorageItem) {
    super();
    this.#item = item;
  }

  override getOrigin(): string {
    return this.#item.origin;
  }

  override getItem(): StorageItem {
    return this.#item;
  }

  override getTitle(): string {
    if (this.#item.key) {
      return `${this.#item.storageType}: ${this.#item.key}`;
    }
    return `Storage for ${this.#item.origin}`;
  }
}

export class StorageAgent extends AiAgent<StorageItem> {
  readonly preamble = preamble;
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_STORAGE_AGENT;

  get userTier(): string|undefined {
    return Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
  }

  get options(): RequestOptions {
    const temperature = Root.Runtime.hostConfig.devToolsFreestyler?.temperature;
    const modelId = Root.Runtime.hostConfig.devToolsFreestyler?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  constructor(opts: {sessionId?: string, aidaClient?: Host.AidaClient.AidaClient} = {}) {
    super({
      aidaClient: opts.aidaClient ?? new Host.AidaClient.AidaClient(),
      sessionId: opts.sessionId,
    });
  }

  async * handleContextDetails(_context: ConversationContext<StorageItem>|null): AsyncGenerator<never, void, void> {
  }

  override async enhanceQuery(query: string, _context: ConversationContext<StorageItem>|null): Promise<string> {
    return query;
  }
}
