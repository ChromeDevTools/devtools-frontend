// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import {createIcon} from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import type {ResourcesPanel} from './ResourcesPanel.js';
import {WebMCPView} from './WebMCPView.js';

export class WebMCPTreeElement extends ApplicationPanelTreeElement {
  #view?: WebMCPView;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, 'WebMCP', false, 'web-mcp');
    const icon = createIcon('document');
    this.setLeadingIcons([icon]);
    const newBadge = UI.UIUtils.maybeCreateNewBadge('web-mcp');
    if (newBadge) {
      const fragment = document.createDocumentFragment();
      // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
      render(html`<div class="trailing-icons icons-container">${newBadge}</div>`, fragment);
      this.listItemElement.appendChild(fragment);
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
