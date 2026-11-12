// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { createIcon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import { WebMCPView } from './WebMCPView.js';
export class WebMCPTreeElement extends ApplicationPanelTreeElement {
    #view;
    constructor(storagePanel) {
        super(storagePanel, i18n.i18n.lockedString('WebMCP'), false, 'web-mcp');
        const icon = createIcon('document');
        this.setLeadingIcons([icon]);
        const newBadge = UI.UIUtils.maybeCreateNewBadge('web-mcp');
        if (newBadge) {
            this.setTrailingIcons([newBadge]);
        }
    }
    get itemURL() {
        return 'webMcp://';
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        if (!this.#view) {
            this.#view = new WebMCPView();
        }
        this.showView(this.#view);
        UI.UIUserMetrics.UIUserMetrics.instance().panelShown('web-mcp');
        return false;
    }
}
//# sourceMappingURL=WebMCPTreeElement.js.map