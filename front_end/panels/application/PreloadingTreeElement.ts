// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Platform from '../../core/platform/platform.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {type ResourcesPanel} from './ResourcesPanel.js';

import {PreloadingView} from './preloading/PreloadingView.js';

const UIStrings = {
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  prefetchingAndPrerendering: 'Prefetching & Prerendering',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/PreloadingTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class PreloadingTreeElement extends ApplicationPanelTreeElement {
  private model?: SDK.PrerenderingModel.PrerenderingModel;
  private view?: PreloadingView;
  #selectedInternal: boolean;

  constructor(resourcesPanel: ResourcesPanel) {
    super(resourcesPanel, i18nString(UIStrings.prefetchingAndPrerendering), false);

    const icon = UI.Icon.Icon.create('mediumicon-fetch', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    this.#selectedInternal = false;

    // TODO(https://crbug.com/1384419): Set link
  }

  get itemURL(): Platform.DevToolsPath.UrlString {
    return 'preloading://' as Platform.DevToolsPath.UrlString;
  }

  initialize(model: SDK.PrerenderingModel.PrerenderingModel): void {
    this.model = model;
    // Show the view if the model was initialized after selection.
    if (this.#selectedInternal && !this.view) {
      this.onselect(false);
    }
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.#selectedInternal = true;

    if (!this.model) {
      return false;
    }

    if (!this.view) {
      this.view = new PreloadingView(this.model);
    }

    this.showView(this.view);
    // TODO(https://crbug.com/1384419): Report metrics when the panel shown.

    return false;
  }
}
