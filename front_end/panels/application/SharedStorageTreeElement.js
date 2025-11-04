// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import { SharedStorageItemsView } from './SharedStorageItemsView.js';
export class SharedStorageTreeElement extends ApplicationPanelTreeElement {
    view;
    constructor(resourcesPanel, sharedStorage) {
        super(resourcesPanel, sharedStorage.securityOrigin, false, 'shared-storage-instance');
    }
    static async createElement(resourcesPanel, sharedStorage) {
        const treeElement = new SharedStorageTreeElement(resourcesPanel, sharedStorage);
        treeElement.view = await SharedStorageItemsView.createView(sharedStorage);
        treeElement.view.element.setAttribute('jslog', `${VisualLogging.pane('shared-storage-data')}`);
        return treeElement;
    }
    get itemURL() {
        return 'shared-storage://';
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        this.resourcesPanel.showView(this.view);
        return false;
    }
}
//# sourceMappingURL=SharedStorageTreeElement.js.map