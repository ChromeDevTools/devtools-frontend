// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';

import {type ResourcesPanel} from './ResourcesPanel.js';

export class ApplicationPanelTreeElement extends UI.TreeOutline.TreeElement {
  protected readonly resourcesPanel: ResourcesPanel;

  constructor(resourcesPanel: ResourcesPanel, title: string, expandable: boolean) {
    super(title, expandable);
    this.resourcesPanel = resourcesPanel;
    UI.ARIAUtils.setAccessibleName(this.listItemElement, title);
    this.listItemElement.tabIndex = -1;
  }

  deselect(): void {
    super.deselect();
    this.listItemElement.tabIndex = -1;
  }

  get itemURL(): Platform.DevToolsPath.UrlString {
    throw new Error('Unimplemented Method');
  }

  onselect(selectedByUser: boolean|undefined): boolean {
    if (!selectedByUser) {
      return false;
    }

    const path: Platform.DevToolsPath.UrlString[] = [];
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

  showView(view: UI.Widget.Widget|null): void {
    this.resourcesPanel.showView(view);
  }
}

export class ExpandableApplicationPanelTreeElement extends ApplicationPanelTreeElement {
  protected readonly expandedSetting: Common.Settings.Setting<boolean>;
  protected readonly categoryName: string;
  protected categoryLink: Platform.DevToolsPath.UrlString|null;

  constructor(resourcesPanel: ResourcesPanel, categoryName: string, settingsKey: string, settingsDefault = false) {
    super(resourcesPanel, categoryName, false);
    this.expandedSetting =
        Common.Settings.Settings.instance().createSetting('resources' + settingsKey + 'Expanded', settingsDefault);
    this.categoryName = categoryName;
    this.categoryLink = null;
  }

  get itemURL(): Platform.DevToolsPath.UrlString {
    return 'category://' + this.categoryName as Platform.DevToolsPath.UrlString;
  }

  setLink(link: Platform.DevToolsPath.UrlString): void {
    this.categoryLink = link;
  }

  onselect(selectedByUser: boolean|undefined): boolean {
    super.onselect(selectedByUser);
    this.resourcesPanel.showCategoryView(this.categoryName, this.categoryLink);
    return false;
  }

  onattach(): void {
    super.onattach();
    if (this.expandedSetting.get()) {
      this.expand();
    }
  }

  onexpand(): void {
    this.expandedSetting.set(true);
  }

  oncollapse(): void {
    this.expandedSetting.set(false);
  }
}
