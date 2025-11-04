// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import * as ApplicationComponents from './components/components.js';
const UIStrings = {
    /**
     * @description Hover text for an info icon in the Private State Token panel.
     * Previously known as 'Trust Tokens'.
     */
    trustTokens: 'Private state tokens',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/TrustTokensTreeElement.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TrustTokensTreeElement extends ApplicationPanelTreeElement {
    view;
    constructor(storagePanel) {
        super(storagePanel, i18nString(UIStrings.trustTokens), false, 'private-state-tokens');
        const icon = IconButton.Icon.create('database');
        this.setLeadingIcons([icon]);
    }
    get itemURL() {
        return 'trustTokens://';
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        if (!this.view) {
            this.view = LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.Widget, new ApplicationComponents.TrustTokensView.TrustTokensView(), 'trust-tokens');
        }
        this.showView(this.view);
        Host.userMetrics.panelShown('trust-tokens');
        return false;
    }
}
//# sourceMappingURL=TrustTokensTreeElement.js.map