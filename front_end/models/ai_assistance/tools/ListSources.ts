// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Workspace from '../../workspace/workspace.js';
import {isOpaqueOrigin} from '../AiOrigins.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type OriginLockCapability,
  ToolName,
} from './Tool.js';

const UIStringsNotTranslate = {
  listingSources: 'Listing workspace sources',
} as const;

const lockedString = i18n.i18n.lockedString;

interface SourceSummary {
  id: number;
  name: string;
}

/**
 * A tool that lists all network source files in the workspace.
 * Each file is returned with its displayName and a unique session-based numeric ID.
 */
export class ListSourcesTool implements
    DataTool<Record<string, never>, {files: SourceSummary[]}, BaseToolCapability&OriginLockCapability> {
  readonly name: ToolName = ToolName.LIST_SOURCES;
  readonly description: string =
      'Lists deployed and authored source files in the workspace (including source-mapped files) with their display name and unique numeric ID.';

  static lastSourceId = 0;
  static uiSourceCodeId: WeakMap<Workspace.UISourceCode.UISourceCode, number> =
      new WeakMap<Workspace.UISourceCode.UISourceCode, number>();

  static reset(): void {
    ListSourcesTool.lastSourceId = 0;
    ListSourcesTool.uiSourceCodeId = new WeakMap();
  }

  // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
  static getUISourceCodes(workspace: Workspace.Workspace.WorkspaceImpl = Workspace.Workspace.WorkspaceImpl.instance()):
      Workspace.UISourceCode.UISourceCode[] {
    const projects =
        workspace.projects().filter(project => project.type() === Workspace.Workspace.projectTypes.Network);
    const uiSourceCodes = new Map<string, Workspace.UISourceCode.UISourceCode>();

    for (const project of projects) {
      for (const uiSourceCode of project.uiSourceCodes()) {
        if (uiSourceCode.isIgnoreListed()) {
          continue;
        }
        const url = uiSourceCode.url();
        if (!uiSourceCodes.get(url) || uiSourceCode.contentType().isFromSourceMap()) {
          uiSourceCodes.set(url, uiSourceCode);
          if (!ListSourcesTool.uiSourceCodeId.has(uiSourceCode)) {
            ListSourcesTool.uiSourceCodeId.set(uiSourceCode, ++ListSourcesTool.lastSourceId);
          }
        }
      }
    }

    return [...uiSourceCodes.values()];
  }

  readonly parameters: Host.AidaClient.FunctionObjectParam<never> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: '',
    nullable: true,
    required: [],
    properties: {},
  };

  displayInfoFromArgs(): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString(UIStringsNotTranslate.listingSources),
      action: 'listSources()',
    };
  }

  async handler(
      _params: Record<string, never>,
      context: BaseToolCapability&OriginLockCapability,
      ): Promise<DataHandlerResult<{files: SourceSummary[]}>> {
    const origin = context.getEstablishedOrigin();
    if (origin && isOpaqueOrigin(origin)) {
      return {
        error: 'Opaque origin not allowed',
      };
    }

    const files = ListSourcesTool.getUISourceCodes().filter(file => {
      const fileUrl = file.url();
      const fileOrigin = Common.ParsedURL.ParsedURL.extractOrigin(fileUrl);
      return !origin || fileOrigin === origin;
    });

    return {
      result: {
        files: files.map(file => ({
                           id: ListSourcesTool.uiSourceCodeId.get(file) ?? 0,
                           name: file.fullDisplayName(),
                         })),
      },
    };
  }
}
