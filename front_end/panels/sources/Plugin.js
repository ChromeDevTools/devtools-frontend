// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export var Events;
(function (Events) {
    /**
     * Fired when the items returned by `leftToolbarItems()` or `rightToolbarItems()`
     * have changed and the toolbar needs to query them again.
     */
    Events["TOOLBAR_ITEMS_CHANGED"] = "ToolbarItemsChanged";
})(Events || (Events = {}));
export class Plugin extends Common.ObjectWrapper.ObjectWrapper {
    uiSourceCode;
    constructor(uiSourceCode, _transformer) {
        super();
        this.uiSourceCode = uiSourceCode;
    }
    static accepts(_uiSourceCode) {
        return false;
    }
    willHide() {
    }
    rightToolbarItems() {
        return [];
    }
    /**
     *
     * TODO(szuend): It is OK to asyncify this function (similar to {rightToolbarItems}),
     *               but it is currently not strictly necessary.
     */
    leftToolbarItems() {
        return [];
    }
    populateLineGutterContextMenu(_contextMenu, _lineNumber) {
    }
    populateTextAreaContextMenu(_contextMenu, _lineNumber, _columnNumber) {
    }
    decorationChanged(_type, _editor) {
    }
    editorExtension() {
        return [];
    }
    editorInitialized(_editor) {
    }
    dispose() {
    }
}
//# sourceMappingURL=Plugin.js.map