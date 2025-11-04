// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Formatter from '../../models/formatter/formatter.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { registerEditorAction, } from './SourcesView.js';
const UIStrings = {
    /**
     * @description Title of the format button in the Sources panel
     * @example {file name} PH1
     */
    formatS: 'Format {PH1}',
    /**
     * @description Tooltip text that appears when hovering over the largeicon pretty print button in the Inplace Formatter Editor Action of the Sources panel
     */
    format: 'Format',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/InplaceFormatterEditorAction.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let inplaceFormatterEditorActionInstance;
export class InplaceFormatterEditorAction {
    button;
    sourcesView;
    uiSourceCodeTitleChangedEvent = null;
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!inplaceFormatterEditorActionInstance || forceNew) {
            inplaceFormatterEditorActionInstance = new InplaceFormatterEditorAction();
        }
        return inplaceFormatterEditorActionInstance;
    }
    editorSelected(event) {
        const uiSourceCode = event.data;
        this.updateButton(uiSourceCode);
    }
    editorClosed(event) {
        const { wasSelected } = event.data;
        if (wasSelected) {
            this.updateButton(null);
        }
    }
    updateButton(uiSourceCode) {
        if (this.uiSourceCodeTitleChangedEvent) {
            Common.EventTarget.removeEventListeners([this.uiSourceCodeTitleChangedEvent]);
        }
        this.uiSourceCodeTitleChangedEvent = uiSourceCode ?
            uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, event => this.updateButton(event.data), this) :
            null;
        const isFormattable = this.isFormattable(uiSourceCode);
        this.button.element.classList.toggle('hidden', !isFormattable);
        if (uiSourceCode && isFormattable) {
            this.button.setTitle(i18nString(UIStrings.formatS, { PH1: uiSourceCode.name() }));
        }
    }
    getOrCreateButton(sourcesView) {
        if (this.button) {
            return this.button;
        }
        this.sourcesView = sourcesView;
        this.sourcesView.addEventListener("EditorSelected" /* Events.EDITOR_SELECTED */, this.editorSelected.bind(this));
        this.sourcesView.addEventListener("EditorClosed" /* Events.EDITOR_CLOSED */, this.editorClosed.bind(this));
        this.button = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.format), 'brackets');
        this.button.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.formatSourceInPlace, this);
        this.updateButton(sourcesView.currentUISourceCode());
        return this.button;
    }
    isFormattable(uiSourceCode) {
        if (!uiSourceCode) {
            return false;
        }
        if (uiSourceCode.project().canSetFileContent()) {
            return true;
        }
        if (Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode) !== null) {
            return true;
        }
        return false;
    }
    formatSourceInPlace() {
        const sourceFrame = this.sourcesView.currentSourceFrame();
        if (!sourceFrame) {
            return;
        }
        const uiSourceCode = sourceFrame.uiSourceCode();
        if (!this.isFormattable(uiSourceCode)) {
            return;
        }
        if (uiSourceCode.isDirty()) {
            void this.contentLoaded(uiSourceCode, sourceFrame, uiSourceCode.workingCopy());
        }
        else {
            void uiSourceCode.requestContentData()
                .then(contentDataOrError => TextUtils.ContentData.ContentData.textOr(contentDataOrError, ''))
                .then(content => {
                void this.contentLoaded(uiSourceCode, sourceFrame, content);
            });
        }
    }
    async contentLoaded(uiSourceCode, sourceFrame, content) {
        const { formattedContent, formattedMapping } = await Formatter.ScriptFormatter.format(uiSourceCode.contentType(), sourceFrame.contentType, content);
        if (uiSourceCode.workingCopy() === formattedContent) {
            return;
        }
        const selection = sourceFrame.textEditor.toLineColumn(sourceFrame.textEditor.state.selection.main.head);
        const [lineNumber, columnNumber] = formattedMapping.originalToFormatted(selection.lineNumber, selection.columnNumber);
        uiSourceCode.setWorkingCopy(formattedContent);
        this.sourcesView.showSourceLocation(uiSourceCode, { lineNumber, columnNumber });
    }
}
registerEditorAction(InplaceFormatterEditorAction.instance);
//# sourceMappingURL=InplaceFormatterEditorAction.js.map