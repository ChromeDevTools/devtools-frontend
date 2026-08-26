// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { html, render } from '../lit/lit.js';
import targetCrashedScreenStyles from './targetCrashedScreen.css.js';
import { VBox } from './Widget.js';
const UIStrings = {
    /**
     * @description Message shown when the inspected page crashes and DevTools is disconnected.
     */
    devtoolsWasDisconnectedFromThe: 'DevTools was disconnected from the page.',
    /**
     * @description Message explaining that DevTools will reconnect once the page is reloaded.
     */
    oncePageIsReloadedDevtoolsWill: 'Once page is reloaded, DevTools will automatically reconnect.',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/TargetCrashedScreen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${targetCrashedScreenStyles}</style>
    <div class="message">${i18nString(UIStrings.devtoolsWasDisconnectedFromThe)}</div>
    <div class="message">${i18nString(UIStrings.oncePageIsReloadedDevtoolsWill)}</div>`, target);
    // clang-format on
};
export class TargetCrashedScreen extends VBox {
    hideCallback;
    constructor(hideCallback, view = DEFAULT_VIEW) {
        super({ useShadowDom: true });
        view({}, {}, this.contentElement);
        this.hideCallback = hideCallback;
    }
    willHide() {
        super.willHide();
        this.hideCallback.call(null);
    }
}
//# sourceMappingURL=TargetCrashedScreen.js.map