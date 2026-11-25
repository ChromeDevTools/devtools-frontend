// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Bindings from '../../bindings/bindings.js';
import type * as Workspace from '../../workspace/workspace.js';
import {type ContextDetail, ConversationContext} from '../agents/AiAgent.js';
import {FileFormatter} from '../data_formatters/FileFormatter.js';
import {ListSourcesTool} from '../tools/ListSources.js';

export class FileContext extends ConversationContext<Workspace.UISourceCode.UISourceCode> {
  override readonly jslogContext = 'ai-context-file' as const;
  #file: Workspace.UISourceCode.UISourceCode;
  #debuggerWorkspaceBinding?: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;

  constructor(file: Workspace.UISourceCode.UISourceCode,
              debuggerWorkspaceBinding?: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding) {
    super();
    this.#file = file;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
  }

  /**
   * Returns the security origin of the workspace file.
   */
  override getOrigin(): SDK.SecurityOrigin.SecurityOrigin {
    return this.#file.securityOrigin();
  }

  override getItem(): Workspace.UISourceCode.UISourceCode {
    return this.#file;
  }

  override getTitle(): string {
    return this.#file.displayName();
  }

  /**
   * Registers the selected file and includes its `File ID` so the model can page
   * truncated content with `getSourceContent` and match `listSources` rows without
   * an extra `listSources` call.
   */
  override async getPromptDetails(): Promise<string|null> {
    const fileId = ListSourcesTool.registerSource(this.#file);
    const header = fileId !== null ? `# Selected file\nFile ID: ${fileId}` : '# Selected file';
    return `${header}\n${new FileFormatter(this.#file, this.#debuggerWorkspaceBinding).formatFile()}`;
  }

  override async getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]]|null> {
    return [
      {
        title: 'Selected file',
        text: new FileFormatter(this.#file, this.#debuggerWorkspaceBinding).formatFile(),
      },
    ];
  }

  override async refresh(): Promise<void> {
    await this.#file.requestContentData();
  }
}
