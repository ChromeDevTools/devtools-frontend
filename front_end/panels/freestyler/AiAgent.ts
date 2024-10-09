// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';

export enum ResponseType {
  TITLE = 'title',
  THOUGHT = 'thought',
  ACTION = 'action',
  SIDE_EFFECT = 'side-effect',
  ANSWER = 'answer',
  ERROR = 'error',
  QUERYING = 'querying',
}

export const enum ErrorType {
  UNKNOWN = 'unknown',
  ABORT = 'abort',
  MAX_STEPS = 'max-steps',
}

export interface AnswerResponse {
  type: ResponseType.ANSWER;
  text: string;
  rpcId?: number;
  suggestions?: string[];
}

export interface ErrorResponse {
  type: ResponseType.ERROR;
  error: ErrorType;
  rpcId?: number;
}

export interface TitleResponse {
  type: ResponseType.TITLE;
  title: string;
  rpcId?: number;
}

export interface ThoughtResponse {
  type: ResponseType.THOUGHT;
  thought?: string;
  contextDetails?: [ContextDetail, ...ContextDetail[]];
  rpcId?: number;
}

export interface SideEffectResponse {
  type: ResponseType.SIDE_EFFECT;
  code: string;
  confirm: (confirm: boolean) => void;
  rpcId?: number;
}

export interface ActionResponse {
  type: ResponseType.ACTION;
  code: string;
  output: string;
  canceled: boolean;
  rpcId?: number;
}

export interface QueryResponse {
  type: ResponseType.QUERYING;
}

export type ResponseData =
    AnswerResponse|ErrorResponse|ActionResponse|SideEffectResponse|ThoughtResponse|TitleResponse|QueryResponse;

export interface ContextDetail {
  title: string;
  text: string;
  codeLang?: string;
}

export interface AidaBuildRequestOptions {
  input: string;
}

export interface HistoryChunk {
  text: string;
  entity: Host.AidaClient.Entity;
}

export interface AidaRequestOptions {
  temperature?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  model_id?: string;
}

type AgentOptions = {
  aidaClient: Host.AidaClient.AidaClient,
  serverSideLoggingEnabled?: boolean,
};

export abstract class AiAgent {
  readonly #sessionId: string = crypto.randomUUID();
  #aidaClient: Host.AidaClient.AidaClient;
  #serverSideLoggingEnabled: boolean;
  abstract readonly preamble: string;
  abstract readonly options: AidaRequestOptions;
  abstract readonly clientFeature: Host.AidaClient.ClientFeature;
  abstract readonly userTier: string|undefined;

  /**
   * Mapping between the unique request id and
   * the history chuck it created
   */
  #chatHistory: Map<number, HistoryChunk[]> = new Map();

  constructor(opts: AgentOptions) {
    this.#aidaClient = opts.aidaClient;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
  }

  get historyEntry(): Array<HistoryChunk> {
    return [...this.#chatHistory.values()].flat();
  }

  get chatHistoryForTesting(): Array<HistoryChunk> {
    return this.historyEntry;
  }

  set chatHistoryForTesting(history: Map<number, HistoryChunk[]>) {
    this.#chatHistory = history;
  }

  removeHistoryRun(id: number): void {
    this.#chatHistory.delete(id);
  }

  addToHistory({
    id,
    query,
    output,
  }: {
    id: number,
    query: string,
    output: string,
  }): void {
    const currentRunEntries = this.#chatHistory.get(id) ?? [];

    this.#chatHistory.set(id, [
      ...currentRunEntries,
      {
        text: query,
        entity: Host.AidaClient.Entity.USER,
      },
      {
        text: output,
        entity: Host.AidaClient.Entity.SYSTEM,
      },
    ]);
  }

  #structuredLog: Array<{
    request: Host.AidaClient.AidaRequest,
    response: string,
    rawResponse?: Host.AidaClient.AidaResponse,
  }> = [];
  async aidaFetch(
      input: string,
      options?: {signal?: AbortSignal},
      ): Promise<{
    response: string,
    rpcId: number|undefined,
  }> {
    const request = this.buildRequest({
      input,
    });

    let rawResponse: Host.AidaClient.AidaResponse|undefined = undefined;
    let response = '';
    let rpcId;
    for await (rawResponse of this.#aidaClient.fetch(request, options)) {
      response = rawResponse.explanation;
      rpcId = rawResponse.metadata.rpcGlobalId ?? rpcId;
      if (rawResponse.metadata.attributionMetadata?.some(
              meta => meta.attributionAction === Host.AidaClient.RecitationAction.BLOCK)) {
        throw new Error('Attribution action does not allow providing the response');
      }
    }

    debugLog({
      request,
      response: rawResponse,
    });

    this.#structuredLog.push({
      request: structuredClone(request),
      response,
      rawResponse,
    });
    localStorage.setItem('freestylerStructuredLog', JSON.stringify(this.#structuredLog));

    return {response, rpcId};
  }

  buildRequest(opts: AidaBuildRequestOptions): Host.AidaClient.AidaRequest {
    const request: Host.AidaClient.AidaRequest = {
      input: opts.input,
      preamble: this.preamble,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      chat_history: this.#chatHistory.size ? this.historyEntry : undefined,
      client: Host.AidaClient.CLIENT_NAME,
      options: this.options,
      metadata: {
        disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
        string_session_id: this.#sessionId,
        user_tier: Host.AidaClient.convertToUserTierEnum(this.userTier),
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      functionality_type: Host.AidaClient.FunctionalityType.CHAT,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      client_feature: this.clientFeature,
    };
    return request;
  }

  static validTemperature(temperature: number|undefined): number|undefined {
    return typeof temperature === 'number' && temperature >= 0 ? temperature : undefined;
  }
}

export function isDebugMode(): boolean {
  return Boolean(localStorage.getItem('debugFreestylerEnabled'));
}

export function debugLog(...log: unknown[]): void {
  if (!isDebugMode()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(...log);
}

function setDebugFreestylerEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem('debugFreestylerEnabled', 'true');
  } else {
    localStorage.removeItem('debugFreestylerEnabled');
  }
}
// @ts-ignore
globalThis.setDebugFreestylerEnabled = setDebugFreestylerEnabled;
