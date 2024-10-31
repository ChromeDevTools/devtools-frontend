// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import { TimelineUIUtils } from '../timeline/TimelineUIUtils.js';

export const enum ResponseType {
  CONTEXT = 'context',
  TITLE = 'title',
  THOUGHT = 'thought',
  ACTION = 'action',
  SIDE_EFFECT = 'side-effect',
  ANSWER = 'answer',
  ERROR = 'error',
  QUERYING = 'querying',
  USER_QUERY = 'user-query',
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
  suggestions?: [string, ...string[]];
}

export interface ErrorResponse {
  type: ResponseType.ERROR;
  error: ErrorType;
  rpcId?: number;
}

export interface ContextDetail {
  title: string;
  text: string;
  codeLang?: string;
}
export interface ContextResponse {
  type: ResponseType.CONTEXT;
  title: string;
  details: [ContextDetail, ...ContextDetail[]];
}

export interface TitleResponse {
  type: ResponseType.TITLE;
  title: string;
  rpcId?: number;
}

export interface ThoughtResponse {
  type: ResponseType.THOUGHT;
  thought: string;
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
  query: string;
}

export interface UserQuery {
  type: ResponseType.USER_QUERY;
  query: string;
}

export type ResponseData = AnswerResponse|ErrorResponse|ActionResponse|SideEffectResponse|ThoughtResponse|TitleResponse|
    QueryResponse|ContextResponse|UserQuery;

export interface AidaBuildRequestOptions {
  input: string;
}

export interface HistoryChunk {
  text: string;
  entity: Host.AidaClient.Entity;
}

export interface AidaRequestOptions {
  temperature?: number;
  modelId?: string;
}

interface AgentOptions {
  aidaClient: Host.AidaClient.AidaClient;
  serverSideLoggingEnabled?: boolean;
}

interface ParsedResponseAnswer {
  answer: string;
  suggestions?: [string, ...string[]];
}

interface ParsedResponseStep {
  thought?: string;
  title?: string;
  action?: string;
}

export type ParsedResponse = ParsedResponseAnswer|ParsedResponseStep;

export const enum AgentType {
  FREESTYLER = 'freestyler',
  DRJONES_FILE = 'drjones-file',
  DRJONES_NETWORK_REQUEST = 'drjones-network-request',
  DRJONES_PERFORMANCE = 'drjones-performance',
}

const MAX_STEP = 10;

export abstract class AiAgent<T> {
  static validTemperature(temperature: number|undefined): number|undefined {
    return typeof temperature === 'number' && temperature >= 0 ? temperature : undefined;
  }

  abstract type: AgentType;
  readonly #sessionId: string = crypto.randomUUID();
  #aidaClient: Host.AidaClient.AidaClient;
  #serverSideLoggingEnabled: boolean;
  abstract readonly preamble: string;
  abstract readonly options: AidaRequestOptions;
  abstract readonly clientFeature: Host.AidaClient.ClientFeature;
  abstract readonly userTier: string|undefined;
  abstract handleContextDetails(select: T|null): AsyncGenerator<ContextResponse, void, void>;

  /**
   * Mapping between the unique request id and
   * the history chuck it created
   */
  #history = new Map<number, ResponseData[]>();

  constructor(opts: AgentOptions) {
    this.#aidaClient = opts.aidaClient;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
  }

  get chatHistoryForTesting(): Array<HistoryChunk> {
    return this.#historyEntry;
  }

  set chatNewHistoryForTesting(history: Map<number, ResponseData[]>) {
    this.#history = history;
  }

  get isEmpty(): boolean {
    return this.#history.size <= 0;
  }

  get title(): string|undefined {
    return [...this.#history.values()]
        .flat()
        .filter(response => {
          return response.type === ResponseType.USER_QUERY;
        })
        .at(0)
        ?.query;
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
    rpcId?: number,
  }> {
    const request = this.buildRequest({
      input,
    });

    let rawResponse: Host.AidaClient.AidaResponse|undefined = undefined;
    let response = '';
    let rpcId: number|undefined;
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
      chat_history: this.#history.size ? this.#historyEntry : undefined,
      client: Host.AidaClient.CLIENT_NAME,
      options: {
        temperature: AiAgent.validTemperature(this.options.temperature),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        model_id: this.options.modelId,
      },
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

  handleAction(action: string, rpcId?: number): AsyncGenerator<SideEffectResponse, ActionResponse, void>;
  handleAction(): never {
    throw new Error('Unexpected action found');
  }

  async enhanceQuery(query: string, selected: T|null): Promise<string>;
  async enhanceQuery(query: string): Promise<string> {
    return query;
  }

  parseResponse(response: string): ParsedResponse {
    return {
      answer: response,
    };
  }

  formatHistoryChunkAnswer(text: string): string {
    return text;
  }

  formatHistoryChunkObservation(observation: {
    title?: string,
    thought?: string,
    action?: string,
  }): string {
    let text = '';
    if (observation.thought) {
      text = `THOUGHT: ${observation.thought}`;
    }
    if (observation.title) {
      text += `\nTITLE: ${observation.title}`;
    }
    if (observation.action) {
      text += `\nACTION
${observation.action}
STOP`;
    }

    return text;
  }

  get #historyEntry(): HistoryChunk[] {
    const historyAll = new Map<number, HistoryChunk[]>();
    for (const [id, entry] of this.#history.entries()) {
      const history: HistoryChunk[] = [];
      historyAll.set(id, history);
      let response: {
        title?: string,
        thought?: string,
        action?: string,
      } = {};
      for (const data of entry) {
        switch (data.type) {
          case ResponseType.CONTEXT:
          case ResponseType.SIDE_EFFECT:
          case ResponseType.USER_QUERY:
            continue;
          case ResponseType.QUERYING: {
            const observation = this.formatHistoryChunkObservation(response);
            if (observation) {
              history.push({
                entity: Host.AidaClient.Entity.SYSTEM,
                text: observation,
              });
              response = {};
            }

            history.push({
              entity: Host.AidaClient.Entity.USER,
              text: data.query,
            });
            break;
          }
          case ResponseType.ANSWER:
            history.push({
              entity: Host.AidaClient.Entity.SYSTEM,
              text: this.formatHistoryChunkAnswer(data.text),
            });
            break;
          case ResponseType.TITLE:
            response.title = data.title;
            break;
          case ResponseType.THOUGHT:
            response.thought = data.thought;
            break;
          case ResponseType.ACTION:
            response.action = data.code;
            break;
          case ResponseType.ERROR:
            historyAll.delete(id);
            break;
        }
      }
      const observation = this.formatHistoryChunkObservation(response);
      if (observation) {
        history.push({
          entity: Host.AidaClient.Entity.USER,
          text: observation,
        });
      }
    }

    return [...historyAll.values()].flat();
  }

  #addHistory(id: number, data: ResponseData): void {
    const currentRunEntries = this.#history.get(id);
    if (currentRunEntries) {
      currentRunEntries.push(data);
      return;
    }
    this.#history.set(id, [data]);
  }

  #runId = 0;
  async * run(query: string, options: {
    signal?: AbortSignal, selected: T|null,
  }): AsyncGenerator<ResponseData, void, void> {
    const id = this.#runId++;

    const response = {
      type: ResponseType.USER_QUERY,
      query,
    } as const;
    this.#addHistory(id, response);
    yield response;

    for await (const response of this.handleContextDetails(options.selected)) {
      this.#addHistory(id, response);
      yield response;
    }

    // Potentially enhance the query with Attribution context.
    if (options.selected?.selectedNode?.id === 'EvaluateScript' || options.selected?.selectedNode?.id === 'CompileScript') {
      const url = options.selected?.selectedNode?.event?.args?.data?.url;
      if (url) {
        const attribution = TimelineUIUtils.getAttributionForUrl(url, [...options.selected.parsedTrace.UserTimings.performanceAttributions]);
        if (attribution) {
          query = `${query}\n\nNote:Attribution for this source: ${attribution}`;
        }
      }
    }

    query = await this.enhanceQuery(query, options.selected);

    for (let i = 0; i < MAX_STEP; i++) {
      const queryResponse = {
        type: ResponseType.QUERYING,
        query,
      } as const;
      this.#addHistory(id, queryResponse);
      yield queryResponse;
      let response: string;
      let rpcId: number|undefined;
      try {
        const fetchResult = await this.aidaFetch(
            query,
            {signal: options.signal},
        );
        response = fetchResult.response;
        rpcId = fetchResult.rpcId;
      } catch (err) {
        debugLog('Error calling the AIDA API', err);

        if (err instanceof Host.AidaClient.AidaAbortError) {
          const response = {
            type: ResponseType.ERROR,
            error: ErrorType.ABORT,
            rpcId,
          } as const;
          this.#addHistory(id, response);
          yield response;
          break;
        }

        const response = {
          type: ResponseType.ERROR,
          error: ErrorType.UNKNOWN,
          rpcId,
        } as const;
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
        this.#addHistory(id, response);
        yield response;

        break;
      }

      const parsedResponse = this.parseResponse(response);

      if ('answer' in parsedResponse) {
        const {
          answer,
          suggestions,
        } = parsedResponse;
        if (answer) {
          const response = {
            type: ResponseType.ANSWER,
            text: answer,
            rpcId,
            suggestions,
          } as const;
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceAnswerReceived);
          this.#addHistory(id, response);
          yield response;
        } else {
          const response = {
            type: ResponseType.ERROR,
            error: ErrorType.UNKNOWN,
            rpcId,
          } as const;
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
          this.#addHistory(id, response);
          yield response;
        }

        break;
      }

      const {
        title,
        thought,
        action,
      } = parsedResponse;

      if (title) {
        const response = {
          type: ResponseType.TITLE,
          title,
          rpcId,
        } as const;
        this.#addHistory(id, response);
        yield response;
      }

      if (thought) {
        const response = {
          type: ResponseType.THOUGHT,
          thought,
          rpcId,
        } as const;
        this.#addHistory(id, response);
        yield response;
      }

      if (action) {
        const result = yield* this.handleAction(action, rpcId);
        this.#addHistory(id, result);
        yield result;
        query = `OBSERVATION: ${result.output}`;
      }

      if (i === MAX_STEP - 1) {
        const response = {
          type: ResponseType.ERROR,
          error: ErrorType.MAX_STEPS,
        } as const;
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
        this.#addHistory(id, response);
        yield response;
        break;
      }
    }
    if (isDebugMode()) {
      window.dispatchEvent(new CustomEvent('freestylerdone'));
    }
  }

  async * runFromHistory(): AsyncGenerator<ResponseData, void, void> {
    for (const historyChunk of this.#history.values()) {
      for (const entry of historyChunk) {
        yield entry;
      }
    }
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
