// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as TextUtils from '../../../models/text_utils/text_utils.js';
import type * as Workspace from '../../../models/workspace/workspace.js';
import type * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {
  type ActionResponse,
  type AgentOptions as BaseAgentOptions,
  AgentType,
  AiAgent,
  type ContextResponse,
  ConversationContext,
  debugLog,
  ErrorType,
  type ParsedResponse,
  type RequestOptions,
  type ResponseData,
  ResponseType,
} from './AiAgent.js';

/* clang-format off */
const preamble = `You are responsible for changing the source code on behalf of the user.
The user query defines what changes are to be made.
You have a number of functions to get information about source files in the project.
Use those functions to fullful the user query.

## Step-by-step instructions

- Think about what the user wants.
- List all files in the project.
- Identify the files that are likely to be modified.
- Retrieve the content of those files.
- Rewrite the files according to the user query.

## General considerations

- Avoid requesting too many files.
- Always prefer changing the true source files and not the build output.
- The build output is usually in dist/, out/, build/ folders.
- *CRITICAL* never make the same function call twice.
`;
/* clang-format on */

export class ProjectContext extends ConversationContext<Workspace.Workspace.Project> {
  readonly #project: Workspace.Workspace.Project;

  constructor(project: Workspace.Workspace.Project) {
    super();
    this.#project = project;
  }

  getOrigin(): string {
    // TODO
    return 'test';
  }

  getItem(): Workspace.Workspace.Project {
    return this.#project;
  }

  override getIcon(): HTMLElement {
    return document.createElement('span');
  }

  override getTitle(): string|ReturnType<typeof LitHtml.Directives.until> {
    return this.#project.displayName();
  }
}

const MAX_STEPS = 10;

function getFiles(project: Workspace.Workspace.Project):
    {files: string[], map: Map<string, Workspace.UISourceCode.UISourceCode>} {
  const files = [];
  const map = new Map();
  for (const uiSourceCode of project.uiSourceCodes()) {
    let path = uiSourceCode.fullDisplayName();
    const idx = path.indexOf('/');
    if (idx !== -1) {
      path = path.substring(idx + 1);
    }
    files.push(path);
    map.set(path, uiSourceCode);
  }
  return {files, map};
}

export class PatchAgent extends AiAgent<Workspace.Workspace.Project> {
  #aidaClient: Host.AidaClient.AidaClient;
  #project: ConversationContext<Workspace.Workspace.Project>|undefined;

  override handleContextDetails(_select: ConversationContext<Workspace.Workspace.Project>|
                                null): AsyncGenerator<ContextResponse, void, void> {
    throw new Error('Method not implemented.');
  }

  override readonly type = AgentType.PATCH;
  readonly preamble = preamble;
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_PATCH_AGENT;

  get userTier(): string|undefined {
    return 'TESTERS';
  }

  get options(): RequestOptions {
    return {
      temperature: undefined,
      modelId: undefined,
    };
  }

  constructor(opts: BaseAgentOptions) {
    super({
      aidaClient: opts.aidaClient,
      serverSideLoggingEnabled: false,
    });
    this.#aidaClient = opts.aidaClient;
    this.declareFunction('listFiles', {
      description: 'returns a list of all files in the project.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: true,
        properties: {},
      },
      handler: async () => {
        if (!this.#project) {
          return {
            error: 'No project available',
          };
        }
        const project = this.#project.getItem();
        const {files} = getFiles(project);
        return {
          files,
        };
      },
    });

    this.declareFunction('readFile', {
      description: 'returns the complement content of a file',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        properties: {
          filepath: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'A file path that idenfities the file to get the content for',
            nullable: false,
          },
        },
      },
      handler: async (params: {filepath: string}) => {
        if (!this.#project) {
          return {
            error: 'No project available',
          };
        }
        const project = this.#project.getItem();
        const {map} = getFiles(project);
        const uiSourceCode = map.get(params.filepath);
        if (!uiSourceCode) {
          return {
            error: `File ${params.filepath} not found`,
          };
        }
        // TODO: clearly define what types of files we handle.
        const content = await uiSourceCode.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(content)) {
          return {
            error: content.error,
          };
        }
        if (!content.isTextContent) {
          return {
            error: 'Non-text files are not supported',
          };
        }
        return {
          content: content.text,
        };
      },
    });

    this.declareFunction('writeFile', {
      description: '(over)writes the file with the provided content',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        properties: {
          filepath: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'A file path that idenfities the file',
            nullable: false,
          },
          content: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'Full content of the file that will replace the current file content',
            nullable: false,
          },
        },
      },
      handler: async (params: {filepath: string, content: string}) => {
        if (!this.#project) {
          return {
            error: 'No project available',
          };
        }
        const project = this.#project.getItem();
        const {map} = getFiles(project);
        const uiSourceCode = map.get(params.filepath);
        if (!uiSourceCode) {
          return {
            error: `File ${params.filepath} not found`,
          };
        }
        const content = params.content;
        // TODO: we unespace some characters to restore the original
        // content but this should be fixed upstream.
        uiSourceCode.setContent(
            content.replaceAll('\\n', '\n').replaceAll('\\"', '"').replaceAll('\\\'', '\''),
            false,
        );
        return {};
      },
    });
  }

  override async *
      aidaFetch(
          request: Host.AidaClient.AidaRequest,
          options?: {signal?: AbortSignal},
          ):
          AsyncGenerator<
              {
                parsedResponse: ParsedResponse,
                functionCall?: Host.AidaClient.AidaFunctionCallResponse, completed: boolean,
                rpcId?: Host.AidaClient.RpcGlobalId,
              },
              void, void> {
    let rawResponse: Host.AidaClient.AidaResponse|undefined = undefined;
    let rpcId: Host.AidaClient.RpcGlobalId|undefined;
    for await (rawResponse of this.#aidaClient.fetch(request, options)) {
      rpcId = rawResponse.metadata.rpcGlobalId ?? rpcId;

      if (rawResponse.functionCalls?.length) {
        debugLog('functionCalls.length', rawResponse.functionCalls.length);
        yield {
          rpcId,
          parsedResponse: {answer: ''},
          functionCall: rawResponse.functionCalls[0],
          completed: true,
        };
        return;
      }

      const parsedResponse = this.parseResponse(rawResponse);
      yield {
        rpcId,
        parsedResponse,
        completed: rawResponse.completed,
      };
    }

    debugLog({
      request,
      response: rawResponse,
    });
  }

  #history: Host.AidaClient.Content[] = [];
  override buildChatHistoryForAida(): Host.AidaClient.Content[] {
    return [...this.#history];
  }

  override async * run(initalQuery: string, options: {
    signal?: AbortSignal, selected: ConversationContext<Workspace.Workspace.Project>|null,
  }): AsyncGenerator<ResponseData, void, void> {
    await options.selected?.refresh();

    this.#project = options.selected ?? undefined;

    let query: Host.AidaClient.Part = {text: initalQuery};

    // Request is built here to capture history up to this point.
    let request = this.buildRequest(query);

    const response = {
      type: ResponseType.USER_QUERY,
      query: JSON.stringify(query),
    } as const;
    yield response;

    for (let i = 0; i < MAX_STEPS; i++) {
      const queryResponse = {
        type: ResponseType.QUERYING,
        query: JSON.stringify(query),
      } as const;
      yield queryResponse;
      let rpcId: Host.AidaClient.RpcGlobalId|undefined;
      let parsedResponse: ParsedResponse|undefined = undefined;
      let functionCall: Host.AidaClient.AidaFunctionCallResponse|undefined = undefined;
      try {
        for await (const fetchResult of this.aidaFetch(request, {signal: options.signal})) {
          rpcId = fetchResult.rpcId;
          parsedResponse = fetchResult.parsedResponse;
          functionCall = fetchResult.functionCall;
        }
      } catch (err) {
        debugLog('Error calling the AIDA API', err);

        if (err instanceof Host.AidaClient.AidaAbortError) {
          const response = {
            type: ResponseType.ERROR,
            error: ErrorType.ABORT,
          } as const;
          yield response;
          break;
        }

        const error = (err instanceof Host.AidaClient.AidaBlockError) ? ErrorType.BLOCK : ErrorType.UNKNOWN;
        const response = {
          type: ResponseType.ERROR,
          error,
        } as const;
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
        yield response;

        break;
      } finally {
        if (i === 0) {
          this.#history.push(request.current_message);
        } else {
          this.#history.push({
            ...request.current_message,
            role: Host.AidaClient.Role.ROLE_UNSPECIFIED,
          });
        }
      }

      if (parsedResponse && 'answer' in parsedResponse && Boolean(parsedResponse.answer)) {
        const response = {
          type: ResponseType.ANSWER,
          text: parsedResponse.answer,
          rpcId,
          suggestions: undefined,
        } as const;
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceAnswerReceived);
        this.#history.push({
          parts: [{
            text: parsedResponse.answer,
          }],
          role: Host.AidaClient.Role.MODEL,
        });
        yield response;
        break;
      } else if (functionCall) {
        const callResult = await this.callFunction(functionCall.name, functionCall.args);
        // Capture history state for the next iteration query.
        query = {
          functionResponse: {
            name: functionCall.name,
            response: callResult,
          },
        };
        this.#history.push({
          parts: [{
            functionCall,
          }],
          role: Host.AidaClient.Role.MODEL,
        });
        request = this.buildRequest(query);
        const result: ActionResponse = {
          type: ResponseType.ACTION,
          code: JSON.stringify(functionCall),
          output: JSON.stringify(callResult),
          canceled: false,
        };
        yield result;
      } else {
        const response = {
          type: ResponseType.ERROR,
          error: ErrorType.UNKNOWN,
        } as const;
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
        yield response;
        break;
      }

      if (i === MAX_STEPS - 1) {
        const response = {
          type: ResponseType.ERROR,
          error: ErrorType.MAX_STEPS,
        } as const;
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
        yield response;
        break;
      }
    }
  }
}
