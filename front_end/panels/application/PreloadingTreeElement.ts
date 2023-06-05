// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Platform from '../../core/platform/platform.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {type ResourcesPanel} from './ResourcesPanel.js';

import {PreloadingView, PreloadingResultView} from './preloading/PreloadingView.js';

const UIStrings = {
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  prefetchingAndPrerendering: 'Prefetching & Prerendering',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  thisPage: 'This Page',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/PreloadingTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type M = SDK.PreloadingModel.PreloadingModel;

export class PreloadingTreeElement<V extends PreloadingView|PreloadingResultView> extends ApplicationPanelTreeElement {
  private model?: M;
  private ctorV: {new(model: M): V};
  private view?: V;
  #selectedInternal: boolean;

  // TODO(https://crbug.com/1410709): Split this view into "SpeculationRules" and "Preload".
  static newForPreloadingView(resourcesPanel: ResourcesPanel): PreloadingTreeElement<PreloadingView> {
    return new PreloadingTreeElement(resourcesPanel, PreloadingView, i18nString(UIStrings.prefetchingAndPrerendering));
  }

  static newForPreloadingResultView(resourcesPanel: ResourcesPanel): PreloadingTreeElement<PreloadingResultView> {
    return new PreloadingTreeElement(resourcesPanel, PreloadingResultView, i18nString(UIStrings.thisPage));
  }

  constructor(resourcesPanel: ResourcesPanel, ctorV: {new(model: M): V}, title: string) {
    super(resourcesPanel, title, false);

    this.ctorV = ctorV;

    const icon = UI.Icon.Icon.create('arrow-up-down', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    this.#selectedInternal = false;

    // TODO(https://crbug.com/1384419): Set link
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'preloading://' as Platform.DevToolsPath.UrlString;
  }

  initialize(model: SDK.PreloadingModel.PreloadingModel): void {
    this.model = model;

    // Show the view if the model was initialized after selection.
    if (this.#selectedInternal && !this.view) {
      this.onselect(false);
    }
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.#selectedInternal = true;

    if (!this.model) {
      return false;
    }

    if (!this.view) {
      this.view = new this.ctorV(this.model);
    }

    this.showView(this.view);
    // TODO(https://crbug.com/1384419): Report metrics when the panel shown.

    return false;
  }
}
