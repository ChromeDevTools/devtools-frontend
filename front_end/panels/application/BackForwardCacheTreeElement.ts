// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import * as ApplicationComponents from './components/components.js';
import type {ResourcesPanel} from './ResourcesPanel.js';

const UIStrings = {
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  backForwardCache: 'Back/forward cache',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/BackForwardCacheTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class BackForwardCacheTreeElement extends ApplicationPanelTreeElement {
  private view?: ApplicationComponents.BackForwardCacheView.BackForwardCacheView;

  constructor(resourcesPanel: ResourcesPanel) {
    super(resourcesPanel, i18nString(UIStrings.backForwardCache), false, 'bfcache');
    const icon = IconButton.Icon.createIcon('database');
    this.setLeadingIcons([icon]);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'bfcache://' as Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ApplicationComponents.BackForwardCacheView.BackForwardCacheView();
    }
    this.showView(this.view);
    Host.userMetrics.panelShown('back-forward-cache');

    return false;
  }
}
