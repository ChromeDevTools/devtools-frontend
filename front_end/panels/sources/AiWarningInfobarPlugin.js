// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Plugin } from './Plugin.js';
const UIStrings = {
    /**
     * @description Infobar text announcing that the file contents have been changed by AI
     */
    aiContentWarning: 'This file contains AI-generated content',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/AiWarningInfobarPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AiWarningInfobarPlugin extends Plugin {
    #editor = undefined;
    #aiWarningInfobar = null;
    constructor(uiSourceCode) {
        super(uiSourceCode);
        this.uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.#onWorkingCopyCommitted, this);
    }
    dispose() {
        this.#aiWarningInfobar?.dispose();
        this.#aiWarningInfobar = null;
        this.uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.#onWorkingCopyCommitted, this);
        super.dispose();
    }
    static accepts(uiSourceCode) {
        return uiSourceCode.contentType().hasScripts() || uiSourceCode.contentType().hasStyleSheets();
    }
    editorInitialized(editor) {
        this.#editor = editor;
        if (this.uiSourceCode.containsAiChanges()) {
            this.#showAiWarningInfobar();
        }
    }
    #onWorkingCopyCommitted() {
        if (!this.uiSourceCode.containsAiChanges()) {
            this.#aiWarningInfobar?.dispose();
            this.#aiWarningInfobar = null;
        }
    }
    #showAiWarningInfobar() {
        const infobar = new UI.Infobar.Infobar("warning" /* UI.Infobar.Type.WARNING */, i18nString(UIStrings.aiContentWarning), undefined, undefined, 'contains-ai-content-warning');
        this.#aiWarningInfobar = infobar;
        infobar.setCloseCallback(() => this.removeInfobar(this.#aiWarningInfobar));
        this.attachInfobar(this.#aiWarningInfobar);
    }
    attachInfobar(bar) {
        if (this.#editor) {
            this.#editor.dispatch({ effects: SourceFrame.SourceFrame.addSourceFrameInfobar.of({ element: bar.element }) });
        }
    }
    removeInfobar(bar) {
        if (this.#editor && bar) {
            this.#editor.dispatch({ effects: SourceFrame.SourceFrame.removeSourceFrameInfobar.of({ element: bar.element }) });
        }
    }
}
//# sourceMappingURL=AiWarningInfobarPlugin.js.map