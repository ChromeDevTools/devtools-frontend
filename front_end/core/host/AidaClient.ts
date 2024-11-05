// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import type * as Root from '../root/root.js';

import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import type {AidaClientResult, SyncInformation} from './InspectorFrontendHostAPI.js';
import {bindOutputStream} from './ResourceLoader.js';

export enum Entity {
  UNKNOWN = 0,
  USER = 1,
  SYSTEM = 2,
}

export const enum Rating {
  SENTIMENT_UNSPECIFIED = 'SENTIMENT_UNSPECIFIED',
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
}

export interface Chunk {
  text: string;
  entity: Entity;
}

export enum FunctionalityType {
  // Unspecified functionality type.
  FUNCTIONALITY_TYPE_UNSPECIFIED = 0,
  // The generic AI chatbot functionality.
  CHAT = 1,
  // The explain error functionality.
  EXPLAIN_ERROR = 2,
}

export enum ClientFeature {
  // Unspecified client feature.
  CLIENT_FEATURE_UNSPECIFIED = 0,
  // Chrome console insights feature.
  CHROME_CONSOLE_INSIGHTS = 1,
  // Chrome freestyler.
  CHROME_FREESTYLER = 2,
  // Chrome DrJones Network Agent.
  CHROME_DRJONES_NETWORK_AGENT = 7,
  // Chrome DrJones Performance Agent.
  CHROME_DRJONES_PERFORMANCE_AGENT = 8,
  // Chrome DrJones File Agent.
  CHROME_DRJONES_FILE_AGENT = 9,
}

export enum UserTier {
  // Unspecified user tier.
  USER_TIER_UNSPECIFIED = 0,
  // Users who are internal testers.
  TESTERS = 1,
  // Users who are early adopters.
  BETA = 2,
  // Users in the general public.
  PUBLIC = 3,
}

export interface AidaRequest {
  input: string;
  preamble?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  chat_history?: Chunk[];
  client: string;
  options?: {
    temperature?: Number,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    model_id?: string,
  };
  metadata?: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    disable_user_content_logging: boolean,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    string_session_id?: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    user_tier?: UserTier,
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  functionality_type?: FunctionalityType;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  client_feature?: ClientFeature;
}

export interface AidaDoConversationClientEvent {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  corresponding_aida_rpc_global_id: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  disable_user_content_logging: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  do_conversation_client_event: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    user_feedback: {
      sentiment?: Rating,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      user_input?: {
        comment?: string,
      },
    },
  };
}

export enum RecitationAction {
  ACTION_UNSPECIFIED = 'ACTION_UNSPECIFIED',
  CITE = 'CITE',
  BLOCK = 'BLOCK',
  NO_ACTION = 'NO_ACTION',
  EXEMPT_FOUND_IN_PROMPT = 'EXEMPT_FOUND_IN_PROMPT',
}

export interface Citation {
  startIndex: number;
  endIndex: number;
  url: string;
}

export interface AttributionMetadata {
  attributionAction: RecitationAction;
  citations: Citation[];
}

export interface AidaResponseMetadata {
  rpcGlobalId?: number;
  attributionMetadata?: AttributionMetadata[];
}

export interface AidaResponse {
  explanation: string;
  metadata: AidaResponseMetadata;
  completed: boolean;
}

export const enum AidaAccessPreconditions {
  AVAILABLE = 'available',
  NO_ACCOUNT_EMAIL = 'no-account-email',
  NO_INTERNET = 'no-internet',
  // This is the state (mostly enterprise) users are in, when they are automatically logged out from
  // Chrome after a certain time period. For making AIDA requests, they need to log in again.
  SYNC_IS_PAUSED = 'sync-is-paused',
}

export const CLIENT_NAME = 'CHROME_DEVTOOLS';

const CODE_CHUNK_SEPARATOR = '\n`````\n';

export class AidaAbortError extends Error {}

export class AidaClient {
  static buildConsoleInsightsRequest(input: string): AidaRequest {
    const request: AidaRequest = {
      input,
      client: CLIENT_NAME,
      functionality_type: FunctionalityType.EXPLAIN_ERROR,
      client_feature: ClientFeature.CHROME_CONSOLE_INSIGHTS,
    };
    const config = Common.Settings.Settings.instance().getHostConfig();
    let temperature = -1;
    let modelId = '';
    if (config.devToolsConsoleInsights?.enabled) {
      temperature = config.devToolsConsoleInsights.temperature ?? -1;
      modelId = config.devToolsConsoleInsights.modelId || '';
    }
    const disallowLogging = config.aidaAvailability?.disallowLogging ?? true;

    if (temperature >= 0) {
      request.options ??= {};
      request.options.temperature = temperature;
    }
    if (modelId) {
      request.options ??= {};
      request.options.model_id = modelId;
    }
    if (disallowLogging) {
      request.metadata = {
        disable_user_content_logging: true,
      };
    }
    return request;
  }

  static async checkAccessPreconditions(): Promise<AidaAccessPreconditions> {
    if (!navigator.onLine) {
      return AidaAccessPreconditions.NO_INTERNET;
    }

    const syncInfo = await new Promise<SyncInformation>(
        resolve => InspectorFrontendHostInstance.getSyncInformation(syncInfo => resolve(syncInfo)));
    if (!syncInfo.accountEmail) {
      return AidaAccessPreconditions.NO_ACCOUNT_EMAIL;
    }

    if (syncInfo.isSyncPaused) {
      return AidaAccessPreconditions.SYNC_IS_PAUSED;
    }

    return AidaAccessPreconditions.AVAILABLE;
  }

  async * fetch(request: AidaRequest, options?: {signal?: AbortSignal}): AsyncGenerator<AidaResponse, void, void> {
    if (!InspectorFrontendHostInstance.doAidaConversation) {
      throw new Error('doAidaConversation is not available');
    }
    const stream = (() => {
      let {promise, resolve, reject} = Promise.withResolvers<string|null>();
      options?.signal?.addEventListener('abort', () => {
        reject(new AidaAbortError());
      });
      return {
        write: async(data: string): Promise<void> => {
          resolve(data);
          ({promise, resolve, reject} = Promise.withResolvers<string|null>());
        },
        close: async(): Promise<void> => {
          resolve(null);
        },
        read: (): Promise<string|null> => {
          return promise;
        },
        fail: (e: Error) => reject(e),
      };
    })();
    const streamId = bindOutputStream(stream);
    InspectorFrontendHostInstance.doAidaConversation(JSON.stringify(request), streamId, result => {
      if (result.statusCode === 403) {
        stream.fail(new Error('Server responded: permission denied'));
      } else if (result.error) {
        stream.fail(new Error(`Cannot send request: ${result.error} ${result.detail || ''}`));
      } else if (result.statusCode !== 200) {
        stream.fail(new Error(`Request failed: ${JSON.stringify(result)}`));
      } else {
        void stream.close();
      }
    });
    let chunk;
    const text = [];
    let inCodeChunk = false;
    const metadata: AidaResponseMetadata = {rpcGlobalId: 0};
    while ((chunk = await stream.read())) {
      let textUpdated = false;
      // The AIDA response is a JSON array of objects, split at the object
      // boundary. Therefore each chunk may start with `[` or `,` and possibly
      // followed by `]`. Each chunk may include one or more objects, so we
      // make sure that each chunk becomes a well-formed JSON array when we
      // parse it by adding `[` and `]` and removing `,` where appropriate.
      if (!chunk.length) {
        continue;
      }
      if (chunk.startsWith(',')) {
        chunk = chunk.slice(1);
      }
      if (!chunk.startsWith('[')) {
        chunk = '[' + chunk;
      }
      if (!chunk.endsWith(']')) {
        chunk = chunk + ']';
      }
      let results;
      try {
        results = JSON.parse(chunk);
      } catch (error) {
        throw new Error('Cannot parse chunk: ' + chunk, {cause: error});
      }

      for (const result of results) {
        if ('metadata' in result) {
          metadata.rpcGlobalId = result.metadata.rpcGlobalId;
          if ('attributionMetadata' in result.metadata) {
            if (!metadata.attributionMetadata) {
              metadata.attributionMetadata = [];
            }
            metadata.attributionMetadata.push(result.metadata.attributionMetadata);
          }
        }
        if ('textChunk' in result) {
          if (inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR);
            inCodeChunk = false;
          }
          text.push(result.textChunk.text);
          textUpdated = true;
        } else if ('codeChunk' in result) {
          if (!inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR);
            inCodeChunk = true;
          }
          text.push(result.codeChunk.code);
          textUpdated = true;
        } else if ('error' in result) {
          throw new Error(`Server responded: ${JSON.stringify(result)}`);
        } else {
          throw new Error('Unknown chunk result');
        }
      }
      if (textUpdated) {
        yield {
          explanation: text.join('') + (inCodeChunk ? CODE_CHUNK_SEPARATOR : ''),
          metadata,
          completed: false,
        };
      }
    }
    yield {
      explanation: text.join('') + (inCodeChunk ? CODE_CHUNK_SEPARATOR : ''),
      metadata,
      completed: true,
    };
  }

  registerClientEvent(clientEvent: AidaDoConversationClientEvent): Promise<AidaClientResult> {
    const {promise, resolve} = Promise.withResolvers<AidaClientResult>();
    InspectorFrontendHostInstance.registerAidaClientEvent(
        JSON.stringify({
          client: CLIENT_NAME,
          event_time: new Date().toISOString(),
          ...clientEvent,
        }),
        resolve,
    );

    return promise;
  }
}

export function convertToUserTierEnum(userTier: string|undefined): UserTier {
  if (userTier) {
    switch (userTier) {
      case 'TESTERS':
        return UserTier.TESTERS;
      case 'BETA':
        return UserTier.BETA;
      case 'PUBLIC':
        return UserTier.PUBLIC;
    }
  }
  return UserTier.BETA;
}

let hostConfigTrackerInstance: HostConfigTracker|undefined;

export class HostConfigTracker extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #pollTimer?: number;
  #aidaAvailability?: AidaAccessPreconditions;

  private constructor() {
    super();
  }

  static instance(): HostConfigTracker {
    if (!hostConfigTrackerInstance) {
      hostConfigTrackerInstance = new HostConfigTracker();
    }
    return hostConfigTrackerInstance;
  }

  override addEventListener(eventType: Events, listener: Common.EventTarget.EventListener<EventTypes, Events>):
      Common.EventTarget.EventDescriptor<EventTypes> {
    const isFirst = !this.hasEventListeners(eventType);
    const eventDescriptor = super.addEventListener(eventType, listener);
    if (isFirst) {
      window.clearTimeout(this.#pollTimer);
      void this.pollAidaAvailability();
    }
    return eventDescriptor;
  }

  override removeEventListener(eventType: Events, listener: Common.EventTarget.EventListener<EventTypes, Events>):
      void {
    super.removeEventListener(eventType, listener);
    if (!this.hasEventListeners(eventType)) {
      window.clearTimeout(this.#pollTimer);
    }
  }

  private async pollAidaAvailability(): Promise<void> {
    this.#pollTimer = window.setTimeout(() => this.pollAidaAvailability(), 2000);
    const currentAidaAvailability = await AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      const config = await new Promise<Root.Runtime.HostConfig>(
          resolve => InspectorFrontendHostInstance.getHostConfig(config => resolve(config)));
      Common.Settings.Settings.instance().setHostConfig(config);
      this.dispatchEventToListeners(Events.AIDA_AVAILABILITY_CHANGED);
    }
  }
}

export const enum Events {
  AIDA_AVAILABILITY_CHANGED = 'aidaAvailabilityChanged',
}

export type EventTypes = {
  [Events.AIDA_AVAILABILITY_CHANGED]: void,
};
