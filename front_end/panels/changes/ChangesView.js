// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as GreenDev from '../../models/greendev/greendev.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';
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
export const DEFAULT_VIEW = (input, _output, target) => {
    const onSidebar = (sidebar) => {
        sidebar.addEventListener("SelectedUISourceCodeChanged" /* Events.SELECTED_UI_SOURCE_CODE_CHANGED */, () => input.onSelect(sidebar.selectedUISourceCode()));
    };
    const hasCopyToPrompt = GreenDev.Prototypes.instance().isEnabled('copyToGemini');
    render(
    // clang-format off
    html `
      <style>${changesViewStyles}</style>
      <devtools-split-view direction=column>
        <div class=vbox slot="main">
          <devtools-widget
            ?hidden=${input.workspaceDiff.modifiedUISourceCodes().length > 0}
            .widgetConfig=${UI.Widget.widgetConfig(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noChanges),
        text: i18nString(UIStrings.changesViewDescription),
        link: CHANGES_VIEW_URL,
    })}>
          </devtools-widget>
          <div class=diff-container role=tabpanel ?hidden=${input.workspaceDiff.modifiedUISourceCodes().length === 0}>
            <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(CombinedDiffView.CombinedDiffView, {
        selectedFileUrl: input.selectedSourceCode?.url(),
        workspaceDiff: input.workspaceDiff
    })}></devtools-widget>
          </div>
          ${hasCopyToPrompt ? html `
            <devtools-widget class="copy-to-prompt"
              .widgetConfig=${UI.Widget.widgetConfig(PanelsCommon.CopyChangesToPrompt, {
        workspaceDiff: input.workspaceDiff,
        patchAgentCSSChange: null,
    })}
            ></devtools-widget>
          ` : Lit.nothing}
        </div>
        <devtools-widget
          slot="sidebar"
          .widgetConfig=${UI.Widget.widgetConfig(ChangesSidebar, {
        workspaceDiff: input.workspaceDiff
    })}
          ${UI.Widget.widgetRef(ChangesSidebar, onSidebar)}>
        </devtools-widget>
      </devtools-split-view>`, 
    // clang-format on
    target);
};
export class ChangesView extends UI.Widget.VBox {
    #workspaceDiff;
    #selectedUISourceCode = null;
    #view;
    constructor(target, view = DEFAULT_VIEW) {
        super(target, {
            jslog: `${VisualLogging.panel('changes').track({ resize: true })}`,
            useShadowDom: true,
        });
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