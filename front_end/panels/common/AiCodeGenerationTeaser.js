// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import styles from './aiCodeGenerationTeaser.css.js';
const UIStringsNotTranslate = {
    /**
     * @description Text for teaser to generate code.
     */
    ctrlItoGenerateCode: 'ctrl-i to generate code',
    /**
     * @description Text for teaser to generate code in Mac.
     */
    cmdItoGenerateCode: 'cmd-i to generate code',
    /**
     * Text for teaser when generating suggestion.
     */
    generating: 'Generating... (esc to cancel)',
    /**
     * Text for teaser for discoverability.
     */
    writeACommentToGenerateCode: 'Write a comment to generate code',
};
const lockedString = i18n.i18n.lockedString;
const PROMOTION_ID = 'ai-code-generation';
export var AiCodeGenerationTeaserDisplayState;
(function (AiCodeGenerationTeaserDisplayState) {
    AiCodeGenerationTeaserDisplayState["TRIGGER"] = "trigger";
    AiCodeGenerationTeaserDisplayState["DISCOVERY"] = "discovery";
    AiCodeGenerationTeaserDisplayState["LOADING"] = "loading";
})(AiCodeGenerationTeaserDisplayState || (AiCodeGenerationTeaserDisplayState = {}));
export const DEFAULT_VIEW = (input, _output, target) => {
    let teaserLabel;
    switch (input.displayState) {
        case AiCodeGenerationTeaserDisplayState.DISCOVERY: {
            const newBadge = UI.UIUtils.maybeCreateNewBadge(PROMOTION_ID);
            teaserLabel = newBadge ?
                html `${lockedString(UIStringsNotTranslate.writeACommentToGenerateCode)}&nbsp;${newBadge}` :
                nothing;
            break;
        }
        case AiCodeGenerationTeaserDisplayState.LOADING: {
            teaserLabel = html `${lockedString(UIStringsNotTranslate.generating)}`;
            break;
        }
        case AiCodeGenerationTeaserDisplayState.TRIGGER: {
            const toGenerateCode = Host.Platform.isMac() ? lockedString(UIStringsNotTranslate.cmdItoGenerateCode) :
                lockedString(UIStringsNotTranslate.ctrlItoGenerateCode);
            teaserLabel = html `${toGenerateCode}`;
            break;
        }
    }
    // clang-format off
    render(html `
          <style>${styles}</style>
          <style>@scope to (devtools-widget > *) { ${UI.inspectorCommonStyles} }</style>
          <div class="ai-code-generation-teaser">
            &nbsp;${teaserLabel}
          </div>
        `, target);
    // clang-format on
};
// TODO(b/448063927): Add "Dont show again" for discovery teaser.
export class AiCodeGenerationTeaser extends UI.Widget.Widget {
    #view;
    #displayState = AiCodeGenerationTeaserDisplayState.TRIGGER;
    constructor(view) {
        super();
        this.markAsExternallyManaged();
        this.#view = view ?? DEFAULT_VIEW;
        this.requestUpdate();
    }
    performUpdate() {
        const output = {};
        this.#view({
            displayState: this.#displayState,
        }, output, this.contentElement);
    }
    get displayState() {
        return this.#displayState;
    }
    set displayState(displayState) {
        if (displayState === this.#displayState) {
            return;
        }
        this.#displayState = displayState;
        this.requestUpdate();
    }
}
//# sourceMappingURL=AiCodeGenerationTeaser.js.map