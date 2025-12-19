// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/adorners/adorners.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
const UIStrings = {
    /**
     * @description Title for the hidden issues row
     */
    hiddenIssues: 'Hidden issues',
    /**
     * @description Label for the button to unhide all hidden issues
     */
    unhideAll: 'Unhide all',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/HiddenIssuesRow.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const DEFAULT_VIEW = (input, _output, target) => {
    const stopPropagationForEnter = (event) => {
        if (event.key === 'Enter') {
            // Make sure we don't propagate 'Enter' key events to parents,
            // so that these get turned into 'click' events properly. If we
            // don't stop the propagation here, the 'Enter' key down event
            // will be consumed by the tree element and it'll be expanded
            // or collapsed instead of the "Unhide all" action being taken.
            event.stopImmediatePropagation();
        }
    };
    // clang-format off
    render(html `
  <div class="header">
    <devtools-adorner class="aggregated-issues-count" .name=${'countWrapper'}>
      <span>${input.count}</span>
    </devtools-adorner>
    <div class="title">${i18nString(UIStrings.hiddenIssues)}</div>
    <devtools-button class="unhide-all-issues-button"
                     jslog=${VisualLogging.action().track({ click: true }).context('issues.unhide-all-hiddes')}
                     @click=${input.onUnhideAllIssues}
                     @keydown=${stopPropagationForEnter}
                     .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}>${i18nString(UIStrings.unhideAll)}</devtools-button>
  </div>`, target);
    // clang-format on
};
export class HiddenIssuesRow extends UI.TreeOutline.TreeElement {
    #view;
    constructor(view = DEFAULT_VIEW) {
        super(undefined, true);
        this.#view = view;
        this.toggleOnClick = true;
        this.listItemElement.classList.add('issue-category', 'hidden-issues');
        this.childrenListElement.classList.add('hidden-issues-body');
        this.update(0);
    }
    update(count) {
        const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
        const onUnhideAllIssues = issuesManager.unhideAllIssues.bind(issuesManager);
        const input = {
            count,
            onUnhideAllIssues,
        };
        const output = undefined;
        this.#view(input, output, this.listItemElement);
    }
}
//# sourceMappingURL=HiddenIssuesRow.js.map