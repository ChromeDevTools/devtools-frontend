// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Snippets from '../snippets/snippets.js';
import changesSidebarStyles from './changesSidebar.css.js';
const UIStrings = {
    /**
     * @description Name of an item from source map
     * @example {compile.html} PH1
     */
    sFromSourceMap: '{PH1} (from source map)',
};
const str_ = i18n.i18n.registerUIStrings('panels/changes/ChangesSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html, Directives: { ref } } = Lit;
export const DEFAULT_VIEW = (input, output, target) => {
    const tooltip = (uiSourceCode) => uiSourceCode.contentType().isFromSourceMap() ?
        i18nString(UIStrings.sFromSourceMap, { PH1: uiSourceCode.displayName() }) :
        uiSourceCode.url();
    const icon = (uiSourceCode) => Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode) ? 'snippet' : 'document';
    const configElements = new WeakMap();
    const onSelect = (e) => input.onSelect(configElements.get(e.detail) ?? null);
    render(
    // clang-format off
    html `<devtools-tree
             @selected=${onSelect}
             navigation-variant
             hide-overflow .template=${html `
               <ul role="tree">
                 ${input.sourceCodes.values().map(uiSourceCode => html `
                   <li
                     role="treeitem"
                     ${ref(e => e instanceof HTMLLIElement && configElements.set(e, uiSourceCode))}
                     ?selected=${uiSourceCode === input.selectedSourceCode}>
                       <style>${changesSidebarStyles}</style>
                       <div class=${'navigator-' + uiSourceCode.contentType().name() + '-tree-item'}>
                         <devtools-icon name=${icon(uiSourceCode)}></devtools-icon>
                         <span title=${tooltip(uiSourceCode)}>
                           <span ?hidden=${!uiSourceCode.isDirty()}>*</span>
                           ${uiSourceCode.displayName()}
                         </span>
                       </div>
                   </li>`)}
               </ul>`}></devtools-tree>`, 
    // clang-format on
    target);
};
export class ChangesSidebar extends Common.ObjectWrapper.eventMixin(UI.Widget.Widget) {
    #workspaceDiff = null;
    #view;
    #sourceCodes = new Set();
    #selectedUISourceCode = null;
    constructor(target, view = DEFAULT_VIEW) {
        super(target, { jslog: `${VisualLogging.pane('sidebar').track({ resize: true })}` });
        this.#view = view;
    }
    set workspaceDiff(workspaceDiff) {
        if (this.#workspaceDiff) {
            this.#workspaceDiff.modifiedUISourceCodes().forEach(this.#removeUISourceCode.bind(this));
            this.#workspaceDiff.removeEventListener("ModifiedStatusChanged" /* WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED */, this.uiSourceCodeModifiedStatusChanged, this);
        }
        this.#workspaceDiff = workspaceDiff;
        this.#workspaceDiff.modifiedUISourceCodes().forEach(this.#addUISourceCode.bind(this));
        this.#workspaceDiff.addEventListener("ModifiedStatusChanged" /* WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED */, this.uiSourceCodeModifiedStatusChanged, this);
        this.requestUpdate();
    }
    selectedUISourceCode() {
        return this.#selectedUISourceCode;
    }
    performUpdate() {
        const input = {
            onSelect: uiSourceCode => this.#selectionChanged(uiSourceCode),
            sourceCodes: this.#sourceCodes,
            selectedSourceCode: this.#selectedUISourceCode
        };
        this.#view(input, {}, this.contentElement);
    }
    #selectionChanged(selectedUISourceCode) {
        this.#selectedUISourceCode = selectedUISourceCode;
        this.dispatchEventToListeners("SelectedUISourceCodeChanged" /* Events.SELECTED_UI_SOURCE_CODE_CHANGED */);
        this.requestUpdate();
    }
    #addUISourceCode(uiSourceCode) {
        this.#sourceCodes.add(uiSourceCode);
        uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.requestUpdate, this);
        uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.requestUpdate, this);
        uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.requestUpdate, this);
        this.requestUpdate();
    }
    #removeUISourceCode(uiSourceCode) {
        uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.requestUpdate, this);
        uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.requestUpdate, this);
        uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.requestUpdate, this);
        if (uiSourceCode === this.#selectedUISourceCode) {
            let newSelection;
            for (const sourceCode of this.#sourceCodes.values()) {
                if (sourceCode === uiSourceCode) {
                    break;
                }
                newSelection = sourceCode;
            }
            this.#sourceCodes.delete(uiSourceCode);
            this.#selectionChanged(newSelection ?? this.#sourceCodes.values().next().value ?? null);
        }
        else {
            this.#sourceCodes.delete(uiSourceCode);
        }
        this.requestUpdate();
    }
    uiSourceCodeModifiedStatusChanged(event) {
        const { isModified, uiSourceCode } = event.data;
        if (isModified) {
            this.#addUISourceCode(uiSourceCode);
        }
        else {
            this.#removeUISourceCode(uiSourceCode);
        }
        this.requestUpdate();
    }
}
//# sourceMappingURL=ChangesSidebar.js.map