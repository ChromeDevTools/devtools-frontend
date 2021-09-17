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

import * as Common from '../../core/common/common.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';

import type {SourcesView} from './SourcesView.js';
import type {UISourceCodeFrame} from './UISourceCodeFrame.js';

export class EditingLocationHistoryManager {
  private readonly sourcesView: SourcesView;
  private readonly historyManager: Common.SimpleHistoryManager.SimpleHistoryManager;
  private readonly currentSourceFrameCallback: () => UISourceCodeFrame | null;
  constructor(sourcesView: SourcesView, currentSourceFrameCallback: () => UISourceCodeFrame | null) {
    this.sourcesView = sourcesView;
    this.historyManager = new Common.SimpleHistoryManager.SimpleHistoryManager(HistoryDepth);
    this.currentSourceFrameCallback = currentSourceFrameCallback;
  }

  trackSourceFrameCursorJumps(sourceFrame: UISourceCodeFrame): void {
    sourceFrame.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.JumpHappened, this.onJumpHappened.bind(this));
  }

  private onJumpHappened(event: Common.EventTarget.EventTargetEvent<SourceFrame.SourcesTextEditor.JumpHappenedEvent>):
      void {
    const {from, to} = event.data;
    if (from) {
      this.updateActiveState(from);
    }
    if (to) {
      this.pushActiveState(to);
    }
  }

  rollback(): void {
    this.historyManager.rollback();
  }

  rollover(): void {
    this.historyManager.rollover();
  }

  updateCurrentState(): void {
    const sourceFrame = this.currentSourceFrameCallback();
    if (!sourceFrame) {
      return;
    }
    this.updateActiveState(sourceFrame.textEditor.selection());
  }

  pushNewState(): void {
    const sourceFrame = this.currentSourceFrameCallback();
    if (!sourceFrame) {
      return;
    }
    this.pushActiveState(sourceFrame.textEditor.selection());
  }

  private updateActiveState(selection: TextUtils.TextRange.TextRange): void {
    const active = (this.historyManager.active() as EditingLocationHistoryEntry | null);
    if (!active) {
      return;
    }
    const sourceFrame = this.currentSourceFrameCallback();
    if (!sourceFrame) {
      return;
    }
    const entry = new EditingLocationHistoryEntry(this.sourcesView, this, sourceFrame, selection);
    active.merge(entry);
  }

  private pushActiveState(selection: TextUtils.TextRange.TextRange): void {
    const sourceFrame = this.currentSourceFrameCallback();
    if (!sourceFrame) {
      return;
    }
    const entry = new EditingLocationHistoryEntry(this.sourcesView, this, sourceFrame, selection);
    this.historyManager.push(entry);
  }

  removeHistoryForSourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.historyManager.filterOut(entry => {
      const historyEntry = (entry as EditingLocationHistoryEntry);
      return historyEntry.projectId === uiSourceCode.project().id() && historyEntry.url === uiSourceCode.url();
    });
  }
}

export const HistoryDepth = 20;

export class EditingLocationHistoryEntry implements Common.SimpleHistoryManager.HistoryEntry {
  private readonly sourcesView: SourcesView;
  private readonly editingLocationManager: EditingLocationHistoryManager;
  readonly projectId: string;
  readonly url: string;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private positionHandle: any;

  constructor(
      sourcesView: SourcesView, editingLocationManager: EditingLocationHistoryManager, sourceFrame: UISourceCodeFrame,
      selection: TextUtils.TextRange.TextRange) {
    this.sourcesView = sourcesView;
    this.editingLocationManager = editingLocationManager;
    const uiSourceCode = sourceFrame.uiSourceCode();
    this.projectId = uiSourceCode.project().id();
    this.url = uiSourceCode.url();

    const position = this.positionFromSelection(selection);
    this.positionHandle = sourceFrame.textEditor.textEditorPositionHandle(position.lineNumber, position.columnNumber);
  }

  merge(entry: EditingLocationHistoryEntry): void {
    if (this.projectId !== entry.projectId || this.url !== entry.url) {
      return;
    }
    this.positionHandle = entry.positionHandle;
  }

  private positionFromSelection(selection: TextUtils.TextRange.TextRange): {
    lineNumber: number,
    columnNumber: number,
  } {
    return {lineNumber: selection.endLine, columnNumber: selection.endColumn};
  }

  valid(): boolean {
    const position = this.positionHandle.resolve();
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCode(this.projectId, this.url);
    return Boolean(position && uiSourceCode);
  }

  reveal(): void {
    const position = this.positionHandle.resolve();
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCode(this.projectId, this.url);
    if (!position || !uiSourceCode) {
      return;
    }

    this.editingLocationManager.updateCurrentState();
    this.sourcesView.showSourceLocation(uiSourceCode, position.lineNumber, position.columnNumber);
  }
}
