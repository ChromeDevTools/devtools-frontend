// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Platform from '../../core/platform/platform.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {type ResourcesPanel} from './ResourcesPanel.js';
import type * as PreloadingHelper from './preloading/helper/helper.js';

import {PreloadingRuleSetView, PreloadingAttemptView, PreloadingResultView} from './preloading/PreloadingView.js';

const UIStrings = {
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  speculationRules: 'Rules',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  preloads: 'Speculations',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  thisPage: 'This page',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/PreloadingTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

type M = SDK.PreloadingModel.PreloadingModel;

export class PreloadingTreeElement<V extends PreloadingRuleSetView|PreloadingAttemptView|PreloadingResultView> extends
    ApplicationPanelTreeElement {
  private model?: M;
  private ctorV: {new(model: M): V};
  private view?: V;
  private path: Platform.DevToolsPath.UrlString;
  #selectedInternal: boolean;

  static newForPreloadingRuleSetView(resourcesPanel: ResourcesPanel): PreloadingTreeElement<PreloadingRuleSetView> {
    return new PreloadingTreeElement(
        resourcesPanel, PreloadingRuleSetView, 'rule-set', i18nString(UIStrings.speculationRules));
  }

  static newForPreloadingAttemptView(resourcesPanel: ResourcesPanel): PreloadingTreeElement<PreloadingAttemptView> {
    return new PreloadingTreeElement(resourcesPanel, PreloadingAttemptView, 'attempt', i18nString(UIStrings.preloads));
  }

  static newForPreloadingResultView(resourcesPanel: ResourcesPanel): PreloadingTreeElement<PreloadingResultView> {
    return new PreloadingTreeElement(resourcesPanel, PreloadingResultView, 'result', i18nString(UIStrings.thisPage));
  }

  constructor(resourcesPanel: ResourcesPanel, ctorV: {new(model: M): V}, path: string, title: string) {
    super(resourcesPanel, title, false);

    this.ctorV = ctorV;
    this.path = 'preloading://{path}' as Platform.DevToolsPath.UrlString;

    const icon = UI.Icon.Icon.create('arrow-up-down', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    this.#selectedInternal = false;

    // TODO(https://crbug.com/1384419): Set link
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return this.path;
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

  revealRuleSet(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): void {
    if (!this.view || !(this.view instanceof PreloadingRuleSetView)) {
      throw new Error('unreachable');
    }

    this.view.revealRuleSet(revealInfo);
  }

  setFilter(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): void {
    if (!this.view || !(this.view instanceof PreloadingAttemptView)) {
      throw new Error('unreachable');
    }

    this.view.setFilter(filter);
  }
}
