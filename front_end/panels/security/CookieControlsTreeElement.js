// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import { SecurityPanelSidebarTreeElement } from './SecurityPanelSidebarTreeElement.js';
export class CookieControlsTreeElement extends SecurityPanelSidebarTreeElement {
    constructor(title, jslogContext) {
        super(title, false, jslogContext);
        this.setLeadingIcons([IconButton.Icon.create('gear', 'cookie-icon')]);
    }
    get elemId() {
        return 'controls';
    }
    showElement() {
        this.listItemElement.dispatchEvent(new CustomEvent('showFlagControls', { bubbles: true, composed: true }));
    }
}
//# sourceMappingURL=CookieControlsTreeElement.js.map