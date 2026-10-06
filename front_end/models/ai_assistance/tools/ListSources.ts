// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Workspace from '../../workspace/workspace.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  isOriginAllowedByLock,
  type OriginLockCapability,
  type OriginLockState,
  PermissionPrompt,
  resolveOriginFromLock,
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
  readonly permissionPrompt: PermissionPrompt = PermissionPrompt.NEVER;
  readonly description: string =
      'Lists deployed and authored source files in the workspace (including source-mapped files) with their display name and unique numeric ID.';

  static lastSourceId = 0;
  static uiSourceCodeId: WeakMap<Workspace.UISourceCode.UISourceCode, number> =
      new WeakMap<Workspace.UISourceCode.UISourceCode, number>();
  static idToUiSourceCode: Map<number, Workspace.UISourceCode.UISourceCode> =
      new Map<number, Workspace.UISourceCode.UISourceCode>();

  static reset(): void {
    ListSourcesTool.lastSourceId = 0;
    ListSourcesTool.uiSourceCodeId = new WeakMap();
    ListSourcesTool.idToUiSourceCode = new Map();
  }

  static getUISourceCodes(
      originLock: OriginLockState,
      // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
      workspace: Workspace.Workspace.WorkspaceImpl = Workspace.Workspace.WorkspaceImpl.instance(),
      ): Workspace.UISourceCode.UISourceCode[] {
    if (originLock.status !== 'ESTABLISHED_ORIGIN' || originLock.origin.isOpaque()) {
      return [];
    }

    const uiSourceCodes = new Map<string, Workspace.UISourceCode.UISourceCode>();

    for (const project of workspace.projectsForType(Workspace.Workspace.projectTypes.Network)) {
      const projectOrigin = project.securityOrigin?.();
      if (projectOrigin && !isOriginAllowedByLock(originLock, projectOrigin)) {
        continue;
      }

      for (const uiSourceCode of project.uiSourceCodes()) {
        if (uiSourceCode.isIgnoreListed()) {
          continue;
        }
        if (!projectOrigin && !isOriginAllowedByLock(originLock, uiSourceCode.securityOrigin())) {
          continue;
        }

        const url = uiSourceCode.url();
        if (!uiSourceCodes.get(url) || uiSourceCode.contentType().isFromSourceMap()) {
          uiSourceCodes.set(url, uiSourceCode);
          if (!ListSourcesTool.uiSourceCodeId.has(uiSourceCode)) {
            const id = ++ListSourcesTool.lastSourceId;
            ListSourcesTool.uiSourceCodeId.set(uiSourceCode, id);
            ListSourcesTool.idToUiSourceCode.set(id, uiSourceCode);
          }
        }
      }
    }

    return Array.from(uiSourceCodes.values());
  }

  static getSourceById(
      id: number,
      originLock: OriginLockState,
      ): Workspace.UISourceCode.UISourceCode|undefined {
    if (!Number.isInteger(id) || id <= 0) {
      return undefined;
    }
    const file = ListSourcesTool.idToUiSourceCode.get(id);
    if (!file || !isOriginAllowedByLock(originLock, file.securityOrigin())) {
      return undefined;
    }
    return file;
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
    const originLock = context.getOriginLock();
    const originResult = resolveOriginFromLock(originLock);
    if ('error' in originResult) {
      return originResult;
    }

    const files = ListSourcesTool.getUISourceCodes(originLock);

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
