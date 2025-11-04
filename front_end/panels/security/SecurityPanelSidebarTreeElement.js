// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
export class SecurityPanelSidebarTreeElement extends UI.TreeOutline.TreeElement {
    constructor(title = '', expandable = false, jslogContext) {
        super(title, expandable, jslogContext);
        UI.ARIAUtils.setLabel(this.listItemElement, title);
    }
    get elemId() {
        // default landing spot for the security panel
        return 'overview';
    }
    showElement() {
        throw new Error('Unimplemented Method');
    }
    onselect(selectedByUser) {
        if (selectedByUser) {
            const id = this.elemId;
            this.listItemElement.dispatchEvent(new CustomEvent('update-sidebar-selection', { bubbles: true, composed: true, detail: { id } }));
            this.showElement();
        }
        return false;
    }
}
//# sourceMappingURL=SecurityPanelSidebarTreeElement.js.map