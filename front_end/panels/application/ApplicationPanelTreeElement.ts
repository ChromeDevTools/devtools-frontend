// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {ResourcesPanel} from './ResourcesPanel.js';

export class ApplicationPanelTreeElement extends UI.TreeOutline.TreeElement {
  protected readonly resourcesPanel: ResourcesPanel;

  constructor(resourcesPanel: ResourcesPanel, title: string, expandable: boolean, jslogContext: string) {
    super(title, expandable, jslogContext);
    this.resourcesPanel = resourcesPanel;
    UI.ARIAUtils.setLabel(this.listItemElement, title);
    this.listItemElement.tabIndex = -1;
  }

  override deselect(): void {
    super.deselect();
    this.listItemElement.tabIndex = -1;
  }

  get itemURL(): Platform.DevToolsPath.UrlString {
    throw new Error('Unimplemented Method');
  }

  override onselect(selectedByUser: boolean|undefined): boolean {
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

  // These strings are used for the empty state in each top most tree element
  // in the Application Panel.
  protected emptyCategoryHeadline: string;
  protected categoryDescription: string;

  constructor(
      resourcesPanel: ResourcesPanel, categoryName: string, emptyCategoryHeadline: string, categoryDescription: string,
      settingsKey: string, settingsDefault = false) {
    super(resourcesPanel, categoryName, false, settingsKey);
    this.expandedSetting =
        Common.Settings.Settings.instance().createSetting('resources-' + settingsKey + '-expanded', settingsDefault);
    this.categoryName = categoryName;
    this.categoryLink = null;
    this.emptyCategoryHeadline = emptyCategoryHeadline;
    this.categoryDescription = categoryDescription;
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'category://' + this.categoryName as Platform.DevToolsPath.UrlString;
  }

  setLink(link: Platform.DevToolsPath.UrlString): void {
    this.categoryLink = link;
  }

  override onselect(selectedByUser: boolean|undefined): boolean {
    super.onselect(selectedByUser);
    this.updateCategoryView();
    return false;
  }

  private updateCategoryView(): void {
    const headline = this.childCount() === 0 ? this.emptyCategoryHeadline : this.categoryName;
    this.resourcesPanel.showCategoryView(this.categoryName, headline, this.categoryDescription, this.categoryLink);
  }

  override appendChild(
      child: UI.TreeOutline.TreeElement,
      comparator?: ((arg0: UI.TreeOutline.TreeElement, arg1: UI.TreeOutline.TreeElement) => number)|undefined): void {
    super.appendChild(child, comparator);
    // Only update if relevant (changing from 0 to 1 child).
    if (this.selected && this.childCount() === 1) {
      this.updateCategoryView();
    }
  }

  override removeChild(child: UI.TreeOutline.TreeElement): void {
    super.removeChild(child);
    // Only update if relevant (changing to 0 children).
    if (this.selected && this.childCount() === 0) {
      this.updateCategoryView();
    }
  }

  override onattach(): void {
    super.onattach();
    if (this.expandedSetting.get()) {
      this.expand();
    }
  }

  override onexpand(): void {
    this.expandedSetting.set(true);
  }

  override oncollapse(): void {
    this.expandedSetting.set(false);
  }
}
