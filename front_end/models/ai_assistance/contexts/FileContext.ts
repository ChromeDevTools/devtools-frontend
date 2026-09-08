// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Bindings from '../../bindings/bindings.js';
import type * as Workspace from '../../workspace/workspace.js';
import {type ContextDetail, ConversationContext} from '../agents/AiAgent.js';
import {FileFormatter} from '../data_formatters/FileFormatter.js';

export class FileContext extends ConversationContext<Workspace.UISourceCode.UISourceCode> {
  #file: Workspace.UISourceCode.UISourceCode;
  #debuggerWorkspaceBinding?: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;

  constructor(file: Workspace.UISourceCode.UISourceCode,
              debuggerWorkspaceBinding?: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding) {
    super();
    this.#file = file;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
  }

  /**
   * Resolves the security origin of a given UISourceCode.
   * Prefers the project security origin, falling back to the origin of the file URL.
   */
  static originForUISourceCode(file: Workspace.UISourceCode.UISourceCode): SDK.SecurityOrigin.SecurityOrigin {
    return file.project()?.securityOrigin?.() ?? SDK.SecurityOrigin.SecurityOrigin.create(file.url());
  }

  /**
   * Returns the security origin of the project containing the file, falling
   * back to the origin derived from the file URL.
   */
  override getOrigin(): SDK.SecurityOrigin.SecurityOrigin {
    return FileContext.originForUISourceCode(this.#file);
  }

  override getItem(): Workspace.UISourceCode.UISourceCode {
    return this.#file;
  }

  override getTitle(): string {
    return this.#file.displayName();
  }

  override async getPromptDetails(): Promise<string|null> {
    return `# Selected file\n${new FileFormatter(this.#file, this.#debuggerWorkspaceBinding).formatFile()}`;
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
