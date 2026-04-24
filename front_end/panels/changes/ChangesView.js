// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ChangesSidebar } from './ChangesSidebar.js';
import changesViewStyles from './changesView.css.js';
import * as CombinedDiffView from './CombinedDiffView.js';
const CHANGES_VIEW_URL = 'https://developer.chrome.com/docs/devtools/changes';
const UIStrings = {
    /**
     * @description Text in Changes View of the Changes tab if no change has been made so far.
     */
    noChanges: 'No changes yet',
    /**
     * @description Text in Changes View of the Changes tab to explain the Changes panel.
     */
    changesViewDescription: 'On this page you can track code changes made within DevTools.',
};
const str_ = i18n.i18n.registerUIStrings('panels/changes/ChangesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html } = Lit;
const { widget } = UI.Widget;
export const DEFAULT_VIEW = (input, _output, target) => {
    render(
    // clang-format off
    html `
      <style>${changesViewStyles}</style>
      <devtools-split-view direction=column>
        <div class=vbox slot="main">
          <devtools-widget
            ?hidden=${input.workspaceDiff.modifiedUISourceCodes().length > 0}
            ${widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noChanges),
        text: i18nString(UIStrings.changesViewDescription),
        link: CHANGES_VIEW_URL,
    })}>
          </devtools-widget>
          <div class=diff-container role=tabpanel ?hidden=${input.workspaceDiff.modifiedUISourceCodes().length === 0}>
            ${widget(CombinedDiffView.CombinedDiffView, {
        selectedFileUrl: input.selectedSourceCode?.url(),
        workspaceDiff: input.workspaceDiff
    })}
          </div>
        </div>
        <devtools-widget slot="sidebar" ${widget(ChangesSidebar, { workspaceDiff: input.workspaceDiff })}
          @SelectedUISourceCodeChanged=${(e) => {
        const sidebar = UI.Widget.Widget.get(e.target);
        input.onSelect(sidebar.selectedUISourceCode());
    }}>
        </devtools-widget>
      </devtools-split-view>`, 
    // clang-format on
    target, { container: { attributes: { jslog: `${VisualLogging.panel('changes').track({ resize: true })}` } } });
};
export class ChangesView extends UI.Widget.VBox {
    #workspaceDiff;
    #selectedUISourceCode = null;
    #view;
    constructor(target, view = DEFAULT_VIEW) {
        super(target, { useShadowDom: 'pure' });
        this.#workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
        this.#view = view;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            workspaceDiff: this.#workspaceDiff,
            selectedSourceCode: this.#selectedUISourceCode,
            onSelect: sourceCode => {
                this.#selectedUISourceCode = sourceCode;
                this.requestUpdate();
            },
        }, {}, this.contentElement);
    }
    wasShown() {
        UI.Context.Context.instance().setFlavor(ChangesView, this);
        super.wasShown();
        this.requestUpdate();
        this.#workspaceDiff.addEventListener("ModifiedStatusChanged" /* WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED */, this.requestUpdate, this);
    }
    willHide() {
        super.willHide();
        UI.Context.Context.instance().setFlavor(ChangesView, null);
        this.#workspaceDiff.removeEventListener("ModifiedStatusChanged" /* WorkspaceDiff.WorkspaceDiff.Events.MODIFIED_STATUS_CHANGED */, this.requestUpdate, this);
    }
}
//# sourceMappingURL=ChangesView.js.map