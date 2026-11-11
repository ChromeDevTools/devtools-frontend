// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import {createIcon} from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import type {ResourcesPanel} from './ResourcesPanel.js';
import {WebMCPView} from './WebMCPView.js';

export class WebMCPTreeElement extends ApplicationPanelTreeElement {
  #view?: WebMCPView;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18n.i18n.lockedString('WebMCP'), false, 'web-mcp');
    const icon = createIcon('document');
    this.setLeadingIcons([icon]);
    const newBadge = UI.UIUtils.maybeCreateNewBadge('web-mcp');
    if (newBadge) {
      this.setTrailingIcons([newBadge]);
    }
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'webMcp://' as Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.#view) {
      this.#view = new WebMCPView();
    }
    this.showView(this.#view);
    UI.UIUserMetrics.UIUserMetrics.instance().panelShown('web-mcp');
    return false;
  }
}
