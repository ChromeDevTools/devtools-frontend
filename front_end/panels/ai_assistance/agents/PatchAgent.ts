// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as TextUtils from '../../../models/text_utils/text_utils.js';
import type * as Workspace from '../../../models/workspace/workspace.js';
import {debugLog} from '../debug.js';

import {
  type AgentOptions as BaseAgentOptions,
  AgentType,
  AiAgent,
  type ContextResponse,
  type ConversationContext,
  type RequestOptions,
  type ResponseData,
  ResponseType,
} from './AiAgent.js';

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
  #project: Workspace.Workspace.Project;
  #fileUpdateAgent: FileUpdateAgent;
  #changeSummary = '';

  override async *
      // eslint-disable-next-line require-yield
      handleContextDetails(_select: ConversationContext<Workspace.Workspace.Project>|null):
          AsyncGenerator<ContextResponse, void, void> {
    return;
  }

  override readonly type = AgentType.PATCH;
  readonly preamble = undefined;
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

  constructor(opts: BaseAgentOptions&{fileUpdateAgent?: FileUpdateAgent, project: Workspace.Workspace.Project}) {
    super(opts);
    this.#project = opts.project;
    this.#fileUpdateAgent = opts.fileUpdateAgent ?? new FileUpdateAgent(opts);
    this.declareFunction<Record<never, unknown>>('listFiles', {
      description: 'Returns a list of all files in the project.',
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
        const project = this.#project;
        const {files} = getFiles(project);
        return {
          result: {
            files,
          }
        };
      },
    });

    this.declareFunction<{
      query: string,
      caseSensitive?: boolean,
      isRegex?: boolean,
    }>('searchInFiles', {
      description:
          'Searches for a text match in all files in the project. For each match it returns the positions of matches.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          query: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'The query to search for matches in files',
            nullable: false,
          },
          caseSensitive: {
            type: Host.AidaClient.ParametersTypes.BOOLEAN,
            description: 'Whether the query is case sensitive or not',
            nullable: false,
          },
          isRegex: {
            type: Host.AidaClient.ParametersTypes.BOOLEAN,
            description: 'Whether the query is a regular expression or not',
            nullable: true,
          }
        },
      },
      handler: async params => {
        if (!this.#project) {
          return {
            error: 'No project available',
          };
        }
        const project = this.#project;
        const {map} = getFiles(project);
        const matches = [];
        for (const [filepath, file] of map.entries()) {
          await file.requestContentData();
          debugLog('searching in', filepath, 'for', params.query);
          const content = file.isDirty() ? file.workingCopyContentData() : await file.requestContentData();
          const results = TextUtils.TextUtils.performSearchInContentData(
              content, params.query, params.caseSensitive ?? true, params.isRegex ?? false);
          for (const result of results) {
            debugLog('matches in', filepath);
            matches.push({
              filepath,
              lineNumber: result.lineNumber,
              columnNumber: result.columnNumber,
              matchLength: result.matchLength
            });
          }
        }
        return {
          result: {
            matches,
          }
        };
      },
    });

    this.declareFunction<{
      files: string[],
    }>('updateFiles', {
      description: 'When called this function performs necesary updates to files',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          files: {
            type: Host.AidaClient.ParametersTypes.ARRAY,
            description: 'List of file names from the project',
            nullable: false,
            items: {type: Host.AidaClient.ParametersTypes.STRING, description: 'File name'}
          }
        },
      },
      handler: async args => {
        debugLog('updateFiles', args.files);
        if (!this.#project) {
          return {
            error: 'No project available',
          };
        }
        const project = this.#project;
        const {map} = getFiles(project);
        for (const file of args.files.slice(0, 3)) {
          debugLog('updating', file);
          const uiSourceCode = map.get(file);
          if (!uiSourceCode) {
            debugLog(file, 'not found');
            continue;
          }
          const prompt = `I have applied the following CSS changes to my page in Chrome DevTools.

\`\`\`css
${this.#changeSummary}
\`\`\`

Following '===' I provide the source code file. Update the file to apply the same change to it.
CRITICAL: Output the entire file with changes without any other modifications! DO NOT USE MARKDOWN.

===
${uiSourceCode.workingCopyContentData().text}
`;
          let response;
          for await (response of this.#fileUpdateAgent.run(prompt, {selected: null})) {
          }
          debugLog('response', response);
          if (response?.type !== ResponseType.ANSWER) {
            debugLog('wrong response type', response);
            continue;
          }
          const updated = response.text;
          uiSourceCode.setWorkingCopy(updated);
          debugLog('updated', updated);
        }
        return {
          result: {
            success: true,
          }
        };
      },
    });
  }

  async * applyChanges(changeSummary: string): AsyncGenerator<ResponseData, void, void> {
    this.#changeSummary = changeSummary;
    const prompt =
        `I have applied the following CSS changes to my page in Chrome DevTools, what are the files in my source code that I need to change to apply the same change?

\`\`\`css
${changeSummary}
\`\`\`

Try searching using the selectors and if nothing matches, try to find a semantically appropriate place to change.
Consider updating files containing styles like CSS files first!
Call the updateFiles with the list of files to be updated once you are done.
`;

    yield* this.run(prompt, {
      selected: null,
    });
  }
}

/**
 * This is an inner "agent" to apply a change to one file.
 */
export class FileUpdateAgent extends AiAgent<Workspace.Workspace.Project> {
  override async *
      // eslint-disable-next-line require-yield
      handleContextDetails(_select: ConversationContext<Workspace.Workspace.Project>|null):
          AsyncGenerator<ContextResponse, void, void> {
    return;
  }

  override readonly type = AgentType.PATCH;
  readonly preamble = undefined;
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
}
