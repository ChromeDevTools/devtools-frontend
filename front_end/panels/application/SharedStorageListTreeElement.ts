// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';

import type * as Platform from '../../core/platform/platform.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {type ResourcesPanel} from './ResourcesPanel.js';
import {SharedStorageEventsView} from './SharedStorageEventsView.js';

const UIStrings = {
  /**
   *@description Text in SharedStorage Category View of the Application panel
   */
  sharedStorage: 'Shared Storage',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/SharedStorageListTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SharedStorageListTreeElement extends ApplicationPanelTreeElement {
  readonly #expandedSetting: Common.Settings.Setting<boolean>;
  readonly view: SharedStorageEventsView;

  constructor(resourcesPanel: ResourcesPanel, expandedSettingsDefault = false) {
    super(resourcesPanel, i18nString(UIStrings.sharedStorage), false);
    this.#expandedSetting =
        Common.Settings.Settings.instance().createSetting('resourcesSharedStorageExpanded', expandedSettingsDefault);
    const sharedStorageIcon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([sharedStorageIcon]);
    this.view = new SharedStorageEventsView();
  }

  get itemURL(): Platform.DevToolsPath.UrlString {
    return 'shared-storage://' as Platform.DevToolsPath.UrlString;
  }

  onselect(selectedByUser: boolean|undefined): boolean {
    super.onselect(selectedByUser);
    this.resourcesPanel.showView(this.view);
    return false;
  }

  onattach(): void {
    super.onattach();
    if (this.#expandedSetting.get()) {
      this.expand();
    }
  }

  onexpand(): void {
    this.#expandedSetting.set(true);
  }

  oncollapse(): void {
    this.#expandedSetting.set(false);
  }

  addEvent(event: Protocol.Storage.SharedStorageAccessedEvent): void {
    this.view.addEvent(event);
  }
}
