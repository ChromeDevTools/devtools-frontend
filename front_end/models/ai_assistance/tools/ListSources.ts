// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
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

/**
 * A tool that lists all network source files in the workspace.
 * Each file is returned with its displayName and a unique session-based numeric ID.
 * The output is a semicolon-delimited list with an `id;name` header.
 */
export class ListSourcesTool implements
    DataTool<Record<string, never>, string, BaseToolCapability&OriginLockCapability> {
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
        // A source map on an allowed page can still point to cross-origin URLs,
        // so a file's origin may differ from its project's origin.
        if (!isOriginAllowedByLock(originLock, uiSourceCode.securityOrigin())) {
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
      ): Promise<DataHandlerResult<string>> {
    const originLock = context.getOriginLock();
    const originResult = resolveOriginFromLock(originLock);
    if ('error' in originResult) {
      return originResult;
    }

    const files = ListSourcesTool.getUISourceCodes(originLock);

    if (files.length === 0) {
      return {
        result: 'No source files found for the current origin.',
      };
    }

    const establishedOrigin = originResult.origin;

    const rows = files.map(file => {
      const id = ListSourcesTool.uiSourceCodeId.get(file) ?? 0;
      const name = formatSourceName(file, establishedOrigin);
      return `${id};${name}`;
    });

    return {
      result: ['id;name', ...rows].join('\n'),
    };
  }
}

/**
 * Formats a source file name for the `listSources` output.
 *
 * `fullDisplayName()` already strips `https?://` for network files while keeping the host,
 * and decodes URI sequences (`%0D`, `%0A`) into raw `\r` and `\n`. Re-encode carriage returns
 * and newlines so filenames cannot break the line-delimited `id;name` output.
 */
function formatSourceName(
    file: Workspace.UISourceCode.UISourceCode,
    establishedOrigin: SDK.SecurityOrigin.SecurityOrigin,
    ): string {
  const fullName = file.fullDisplayName().replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const siteId = establishedOrigin.siteId();
  if (/^https?:\/\//.test(siteId) && file.origin().toLowerCase() === siteId) {
    const hostPrefix = siteId.replace(/^https?:\/\//, '');
    if (fullName.slice(0, hostPrefix.length).toLowerCase() === hostPrefix && fullName[hostPrefix.length] === '/') {
      return fullName.slice(hostPrefix.length);
    }
  }
  return fullName;
}
