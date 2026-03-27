// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import { createIcon } from '../../ui/kit/kit.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import { WebMCPView } from './WebMCPView.js';
export class WebMCPTreeElement extends ApplicationPanelTreeElement {
    #view;
    constructor(storagePanel) {
        super(storagePanel, 'WebMCP', false, 'web-mcp');
        const icon = createIcon('document');
        this.setLeadingIcons([icon]);
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
        Host.userMetrics.panelShown('web-mcp');
        return false;
    }
}
//# sourceMappingURL=WebMCPTreeElement.js.map