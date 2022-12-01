// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {type ResourcesPanel} from './ResourcesPanel.js';
import {SharedStorageItemsView} from './SharedStorageItemsView.js';
import {type SharedStorageForOrigin} from './SharedStorageModel.js';

export class SharedStorageTreeElement extends ApplicationPanelTreeElement {
  view!: SharedStorageItemsView;

  constructor(resourcesPanel: ResourcesPanel, sharedStorage: SharedStorageForOrigin) {
    super(resourcesPanel, sharedStorage.securityOrigin, false);
  }

  static async createElement(resourcesPanel: ResourcesPanel, sharedStorage: SharedStorageForOrigin):
      Promise<SharedStorageTreeElement> {
    const treeElement = new SharedStorageTreeElement(resourcesPanel, sharedStorage);
    treeElement.view = await SharedStorageItemsView.createView(sharedStorage);
    return treeElement;
  }

  get itemURL(): Platform.DevToolsPath.UrlString {
    return 'shared-storage://' as Platform.DevToolsPath.UrlString;
  }

  onselect(selectedByUser: boolean|undefined): boolean {
    super.onselect(selectedByUser);
    this.resourcesPanel.showView(this.view);
    return false;
  }
}
