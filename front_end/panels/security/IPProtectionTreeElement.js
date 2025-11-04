// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import { SecurityPanelSidebarTreeElement } from './SecurityPanelSidebarTreeElement.js';
export class IPProtectionTreeElement extends SecurityPanelSidebarTreeElement {
    constructor(title, jslogContext) {
        super(title, false, jslogContext);
        this.setLeadingIcons([IconButton.Icon.create('shield', 'shield-icon')]);
    }
    get elemId() {
        return 'protection';
    }
    showElement() {
        this.listItemElement.dispatchEvent(new CustomEvent('showIPProtection', { bubbles: true, composed: true }));
    }
}
//# sourceMappingURL=IPProtectionTreeElement.js.map