// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Workspace from '../../workspace/workspace.js';
import {type ContextDetail, ConversationContext} from '../agents/AiAgent.js';
import {FileFormatter} from '../data_formatters/FileFormatter.js';

export class FileContext extends ConversationContext<Workspace.UISourceCode.UISourceCode> {
  #file: Workspace.UISourceCode.UISourceCode;

  constructor(file: Workspace.UISourceCode.UISourceCode) {
    super();
    this.#file = file;
  }

  override getURL(): string {
    return this.#file.url();
  }

  override getItem(): Workspace.UISourceCode.UISourceCode {
    return this.#file;
  }

  override getTitle(): string {
    return this.#file.displayName();
  }

  override async getPromptDetails(): Promise<string|null> {
    return `# Selected file\n${new FileFormatter(this.#file).formatFile()}`;
  }

  override async getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]]|null> {
    return [
      {
        title: 'Selected file',
        text: new FileFormatter(this.#file).formatFile(),
      },
    ];
  }

  override async refresh(): Promise<void> {
    await this.#file.requestContentData();
  }
}
