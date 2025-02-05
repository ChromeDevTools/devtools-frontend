// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as TextUtils from '../../../models/text_utils/text_utils.js';
import type * as Workspace from '../../../models/workspace/workspace.js';
import type * as Lit from '../../../ui/lit/lit.js';

import {
  type AgentOptions as BaseAgentOptions,
  AgentType,
  AiAgent,
  type ContextResponse,
  ConversationContext,
  type RequestOptions,
  type ResponseData,
} from './AiAgent.js';

/* clang-format off */
const preamble = `You are responsible for changing the source code on behalf of the user.
The user query defines what changes are to be made.
You have a number of functions to get information about source files in the project.
Use those functions to fulfill the user query.

## Step-by-step instructions

- Think about what the user wants.
- List all files in the project or search for relevant files.
- Identify the files that are likely to be modified.
- Retrieve the content of those files.
- Rewrite the files according to the user query.

## General considerations

- Avoid requesting too many files.
- Always prefer changing the true source files and not the build output.
- The build output is usually in dist/, out/, build/ folders.
- *CRITICAL* never make the same function call twice.
- *CRITICAL* do not make any changes if not prompted.

Instead of using the writeFile function you can also produce  the following diff format:

\`\`\`
src/index.html
<meta charset="utf-8">
<title>Test</title>
\`\`\`

First output the filename (example, src/index.html), then output the SEARCH block,
followed by the REPLACE block.

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

  override getTitle(): string|ReturnType<typeof Lit.Directives.until> {
    return this.#project.displayName();
  }
}

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
  #project: ConversationContext<Workspace.Workspace.Project>|undefined;

  override async *
      // eslint-disable-next-line require-yield
      handleContextDetails(_select: ConversationContext<Workspace.Workspace.Project>|null):
          AsyncGenerator<ContextResponse, void, void> {
    // TODO: Implement
    return;
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
    super(opts);
    this.declareFunction<Record<never, unknown>>('listFiles', {
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
          result: {
            files,
          }
        };
      },
    });

    this.declareFunction<{
      query: string,
      caseSensitive: boolean,
      isRegex: boolean,
    }>('searchInFiles', {
      description:
          'Searches for a query in all files in the project. For each match it returns the positions of matches.',
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
        const project = this.#project.getItem();
        const {map} = getFiles(project);
        const matches = [];
        for (const [filepath, file] of map.entries()) {
          const results = await project.searchInFileContent(file, params.query, params.caseSensitive, params.isRegex);
          for (const result of results) {
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

    this.declareFunction('changeFile', {
      description: 'returns a list of all files in the project.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: true,
        properties: {
          filepath: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'A file path that identifies the file to get the content for',
            nullable: false,
          },
        },
      },
      handler: async () => {
        return {result: {}};
      },
    });

    this.declareFunction<{filepath: string}>('readFile', {
      description: 'returns the complement content of a file',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        properties: {
          filepath: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'A file path that identifies the file to get the content for',
            nullable: false,
          },
        },
      },
      handler: async params => {
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
          result: {
            content: content.text,
          }
        };
      },
    });

    this.declareFunction<{filepath: string, content: string}>('writeFile', {
      description: '(over)writes the file with the provided content',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        properties: {
          filepath: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'A file path that identifies the file',
            nullable: false,
          },
          content: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'Full content of the file that will replace the current file content',
            nullable: false,
          },
        },
      },
      handler: async params => {
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
        // TODO: we unescape some characters to restore the original
        // content but this should be fixed upstream.
        uiSourceCode.setContent(
            content.replaceAll('\\n', '\n').replaceAll('\\"', '"').replaceAll('\\\'', '\''),
            false,
        );
        return {
          result: null,
        };
      },
    });
  }

  override async * run(initialQuery: string, options: {
    signal?: AbortSignal, selected: ConversationContext<Workspace.Workspace.Project>|null,
  }): AsyncGenerator<ResponseData, void, void> {
    this.#project = options.selected ?? undefined;

    return yield* super.run(initialQuery, options);
  }
}
