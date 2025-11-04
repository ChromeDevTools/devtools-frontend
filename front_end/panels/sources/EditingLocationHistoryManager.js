// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Workspace from '../../models/workspace/workspace.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
export const HistoryDepth = 20;
export class EditingLocationHistoryManager {
    sourcesView;
    entries = [];
    current = -1;
    revealing = false;
    constructor(sourcesView) {
        this.sourcesView = sourcesView;
    }
    trackSourceFrameCursorJumps(sourceFrame) {
        sourceFrame.addEventListener("EditorUpdate" /* SourceFrame.SourceFrame.Events.EDITOR_UPDATE */, event => this.onEditorUpdate(event.data, sourceFrame));
    }
    onEditorUpdate(update, sourceFrame) {
        if (update.docChanged) {
            this.mapEntriesFor(sourceFrame.uiSourceCode(), update.changes);
        }
        const prevPos = update.startState.selection.main;
        const newPos = update.state.selection.main;
        const isJump = !this.revealing && prevPos.anchor !== newPos.anchor && update.transactions.some(tr => {
            return Boolean(tr.isUserEvent('select.pointer') || tr.isUserEvent('select.reveal') || tr.isUserEvent('select.search'));
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
    updateCurrentState(uiSourceCode, position) {
        if (!this.revealing) {
            const top = this.current >= 0 ? this.entries[this.current] : null;
            if (top?.matches(uiSourceCode)) {
                top.position = position;
            }
        }
    }
    mapEntriesFor(uiSourceCode, change) {
        for (const entry of this.entries) {
            if (entry.matches(uiSourceCode)) {
                entry.position = change.mapPos(entry.position);
            }
        }
    }
    reveal(entry) {
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCode(entry.projectId, entry.url);
        if (uiSourceCode) {
            this.revealing = true;
            this.sourcesView.showSourceLocation(uiSourceCode, entry.position, false, true);
            this.revealing = false;
        }
    }
    rollback() {
        if (this.current > 0) {
            this.current--;
            this.reveal(this.entries[this.current]);
        }
    }
    rollover() {
        if (this.current < this.entries.length - 1) {
            this.current++;
            this.reveal(this.entries[this.current]);
        }
    }
    removeHistoryForSourceCode(uiSourceCode) {
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
    projectId;
    url;
    position;
    constructor(uiSourceCode, position) {
        this.projectId = uiSourceCode.project().id();
        this.url = uiSourceCode.url();
        this.position = position;
    }
    matches(uiSourceCode) {
        return this.url === uiSourceCode.url() && this.projectId === uiSourceCode.project().id();
    }
}
//# sourceMappingURL=EditingLocationHistoryManager.js.map