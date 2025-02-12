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

  constructor(opts: BaseAgentOptions) {
    super(opts);
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
        const project = this.#project.getItem();
        const {map} = getFiles(project);
        const matches = [];
        for (const [filepath, file] of map.entries()) {
          const results = TextUtils.TextUtils.performSearchInContentData(
              file.workingCopyContentData(), params.query, params.caseSensitive ?? true, params.isRegex ?? false);
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
  }

  override async * run(initialQuery: string, options: {
    signal?: AbortSignal, selected: ConversationContext<Workspace.Workspace.Project>|null,
  }): AsyncGenerator<ResponseData, void, void> {
    this.#project = options.selected ?? undefined;

    return yield* super.run(initialQuery, options);
  }
}
