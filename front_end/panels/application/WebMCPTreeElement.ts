// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import {createIcon} from '../../ui/kit/kit.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import type {ResourcesPanel} from './ResourcesPanel.js';
import {WebMCPView} from './WebMCPView.js';

export class WebMCPTreeElement extends ApplicationPanelTreeElement {
  #view?: WebMCPView;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, 'WebMCP', false, 'web-mcp');
    const icon = createIcon('document');
    this.setLeadingIcons([icon]);
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
    Host.userMetrics.panelShown('web-mcp');
    return false;
  }
}
