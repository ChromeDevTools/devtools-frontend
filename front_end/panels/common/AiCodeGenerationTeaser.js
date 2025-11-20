// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
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
};
const lockedString = i18n.i18n.lockedString;
export const DEFAULT_VIEW = (input, _output, target) => {
    const toGenerateCode = Host.Platform.isMac() ? lockedString(UIStringsNotTranslate.cmdItoGenerateCode) :
        lockedString(UIStringsNotTranslate.ctrlItoGenerateCode);
    const teaserLabel = input.loading ? lockedString(UIStringsNotTranslate.generating) : toGenerateCode;
    // clang-format off
    render(html `
          <div class="ai-code-generation-teaser">
            &nbsp;${teaserLabel}
          </div>
        `, target);
    // clang-format on
};
export class AiCodeGenerationTeaser extends UI.Widget.Widget {
    #view;
    #loading = false;
    constructor(view) {
        super();
        this.markAsExternallyManaged();
        this.#view = view ?? DEFAULT_VIEW;
        this.requestUpdate();
    }
    performUpdate() {
        const output = {};
        this.#view({
            loading: this.#loading,
        }, output, this.contentElement);
    }
    get loading() {
        return this.#loading;
    }
    set loading(loading) {
        if (loading === this.#loading) {
            return;
        }
        this.#loading = loading;
        this.requestUpdate();
    }
}
//# sourceMappingURL=AiCodeGenerationTeaser.js.map