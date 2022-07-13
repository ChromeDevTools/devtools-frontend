/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';

import {type SourcesView} from './SourcesView.js';
import {type UISourceCodeFrame} from './UISourceCodeFrame.js';

export const HistoryDepth = 20;

export class EditingLocationHistoryManager {
  private readonly entries: EditingLocationHistoryEntry[] = [];
  private current = -1;
  private revealing = false;

  constructor(private readonly sourcesView: SourcesView) {
  }

  trackSourceFrameCursorJumps(sourceFrame: UISourceCodeFrame): void {
    sourceFrame.addEventListener(
        SourceFrame.SourceFrame.Events.EditorUpdate, event => this.onEditorUpdate(event.data, sourceFrame));
  }

  private onEditorUpdate(update: CodeMirror.ViewUpdate, sourceFrame: UISourceCodeFrame): void {
    if (update.docChanged) {
      this.mapEntriesFor(sourceFrame.uiSourceCode(), update.changes);
    }
    const prevPos = update.startState.selection.main;
    const newPos = update.state.selection.main;
    const isJump = !this.revealing && prevPos.anchor !== newPos.anchor && update.transactions.some((tr): boolean => {
      return Boolean(
          tr.isUserEvent('select.pointer') || tr.isUserEvent('select.reveal') || tr.isUserEvent('select.search'));
    });
    if (isJump) {
      this.updateCurrentState(sourceFrame.uiSourceCode(), prevPos.head);
      if (this.entries.length > this.current + 1) {
        this.entries.length = this.current + 1;
      }
      this.entries.push(new EditingLocationHistoryEntry(sourceFrame.uiSourceCode(), newPos.head));
      this.current++;
      if (this.entries.length > HistoryDepth) {
        this.entries.shift();
        this.current--;
      }
    }
  }

  updateCurrentState(uiSourceCode: Workspace.UISourceCode.UISourceCode, position: number): void {
    if (!this.revealing) {
      const top = this.current >= 0 ? this.entries[this.current] : null;
      if (top?.matches(uiSourceCode)) {
        top.position = position;
      }
    }
  }

  private mapEntriesFor(uiSourceCode: Workspace.UISourceCode.UISourceCode, change: CodeMirror.ChangeDesc): void {
    for (const entry of this.entries) {
      if (entry.matches(uiSourceCode)) {
        entry.position = change.mapPos(entry.position);
      }
    }
  }

  private reveal(entry: EditingLocationHistoryEntry): void {
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCode(entry.projectId, entry.url);
    if (uiSourceCode) {
      this.revealing = true;
      this.sourcesView.showSourceLocation(uiSourceCode, entry.position, false, true);
      this.revealing = false;
    }
  }

  rollback(): void {
    if (this.current > 0) {
      this.current--;
      this.reveal(this.entries[this.current]);
    }
  }

  rollover(): void {
    if (this.current < this.entries.length - 1) {
      this.current++;
      this.reveal(this.entries[this.current]);
    }
  }

  removeHistoryForSourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].matches(uiSourceCode)) {
        this.entries.splice(i, 1);
        if (this.current >= i) {
          this.current--;
        }
      }
    }
  }
}

class EditingLocationHistoryEntry {
  readonly projectId: string;
  readonly url: Platform.DevToolsPath.UrlString;
  position: number;

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode, position: number) {
    this.projectId = uiSourceCode.project().id();
    this.url = uiSourceCode.url();
    this.position = position;
  }

  matches(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return this.url === uiSourceCode.url() && this.projectId === uiSourceCode.project().id();
  }
}
