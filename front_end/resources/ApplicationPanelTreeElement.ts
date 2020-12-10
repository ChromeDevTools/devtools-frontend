// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';

import {ResourcesPanel} from './ResourcesPanel.js';

export class ApplicationPanelTreeElement extends UI.TreeOutline.TreeElement {
  protected readonly resourcesPanel: ResourcesPanel;

  constructor(storagePanel: ResourcesPanel, title: string, expandable: boolean) {
    super(title, expandable);
    this.resourcesPanel = storagePanel;
    UI.ARIAUtils.setAccessibleName(this.listItemElement, title);
  }

  get itemURL(): string {
    throw new Error('Unimplemented Method');
  }

  onselect(selectedByUser: boolean|undefined): boolean {
    if (!selectedByUser) {
      return false;
    }

    const path: string[] = [];
    for (let el: UI.TreeOutline.TreeElement|null = this; el; el = el.parent) {
      const url = el instanceof ApplicationPanelTreeElement && el.itemURL;
      if (!url) {
        break;
      }
      path.push(url);
    }
    this.resourcesPanel.setLastSelectedItemPath(path);

    return false;
  }

  showView(view: UI.Widget.Widget|null) {
    this.resourcesPanel.showView(view);
  }
}
