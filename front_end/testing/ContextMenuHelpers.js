// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../ui/legacy/legacy.js';
export function getMenu(action) {
    const sandbox = sinon.createSandbox();
    const contextMenuShow = sandbox.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    action();
    sandbox.restore();
    return contextMenuShow.thisValues[0];
}
export function getMenuForToolbarButton(button) {
    return getMenu(() => {
        button.clicked(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
        }));
    });
}
export function findMenuItemWithLabel(section, label) {
    return section.items.find((item) => item.buildDescriptor().label === label);
}
export function getMenuItemLabels(section) {
    return section.items.map((item) => item.buildDescriptor().label);
}
export function getContextMenuForElement(element, target) {
    return getMenu(() => {
        const event = new MouseEvent('contextmenu', { bubbles: true });
        if (target) {
            sinon.stub(event, 'target').value(target);
        }
        element.dispatchEvent(event);
    });
}
export function getMenuForShiftClick(element) {
    return getMenu(() => {
        element.dispatchEvent(new MouseEvent('click', { shiftKey: true }));
    });
}
//# sourceMappingURL=ContextMenuHelpers.js.map