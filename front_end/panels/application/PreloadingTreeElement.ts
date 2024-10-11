// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';

import {ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import type * as PreloadingHelper from './preloading/helper/helper.js';
import {PreloadingAttemptView, PreloadingRuleSetView, PreloadingSummaryView} from './preloading/PreloadingView.js';
import type {ResourcesPanel} from './ResourcesPanel.js';

const UIStrings = {
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  speculativeLoads: 'Speculative loads',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  rules: 'Rules',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  speculations: 'Speculations',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/PreloadingTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class PreloadingTreeElementBase<View extends PreloadingRuleSetView|PreloadingAttemptView> extends
    ApplicationPanelTreeElement {
  #model?: SDK.PreloadingModel.PreloadingModel;
  #viewConstructor: {new(model: SDK.PreloadingModel.PreloadingModel): View};
  protected view?: View;
  #path: Platform.DevToolsPath.UrlString;
  #selectedInternal: boolean;

  constructor(
      panel: ResourcesPanel, viewConstructor: {new(model: SDK.PreloadingModel.PreloadingModel): View},
      path: Platform.DevToolsPath.UrlString, title: string) {
    super(panel, title, false, 'speculative-loads');

    this.#viewConstructor = viewConstructor;
    this.#path = path;

    const icon = IconButton.Icon.create('arrow-up-down');
    this.setLeadingIcons([icon]);
    this.#selectedInternal = false;

    // TODO(https://crbug.com/1384419): Set link
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return this.#path;
  }

  initialize(model: SDK.PreloadingModel.PreloadingModel): void {
    this.#model = model;

    // Show the view if the model was initialized after selection.
    if (this.#selectedInternal && !this.view) {
      this.onselect(false);
    }
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.#selectedInternal = true;

    if (!this.#model) {
      return false;
    }

    if (!this.view) {
      this.view = new this.#viewConstructor(this.#model);
    }

    this.showView(this.view);

    return false;
  }
}

export class PreloadingSummaryTreeElement extends ExpandableApplicationPanelTreeElement {
  #model?: SDK.PreloadingModel.PreloadingModel;
  #view?: PreloadingSummaryView;
  #selectedInternal: boolean;

  #ruleSet: PreloadingRuleSetTreeElement|null = null;
  #attempt: PreloadingAttemptTreeElement|null = null;

  constructor(panel: ResourcesPanel) {
    super(panel, i18nString(UIStrings.speculativeLoads), 'preloading');

    const icon = IconButton.Icon.create('arrow-up-down');
    this.setLeadingIcons([icon]);
    this.#selectedInternal = false;

    // TODO(https://crbug.com/1384419): Set link
  }

  // Note that
  //
  // - TreeElement.ensureSelection assumes TreeElement.treeOutline initalized.
  // - TreeElement.treeOutline is propagated in TreeElement.appendChild.
  //
  // So, `this.constructChildren` should be called just after `parent.appendChild(this)`
  // to enrich children with TreeElement.selectionElementInternal correctly.
  constructChildren(panel: ResourcesPanel): void {
    this.#ruleSet = new PreloadingRuleSetTreeElement(panel);
    this.#attempt = new PreloadingAttemptTreeElement(panel);
    this.appendChild(this.#ruleSet);
    this.appendChild(this.#attempt);
  }

  initialize(model: SDK.PreloadingModel.PreloadingModel): void {
    if (this.#ruleSet === null || this.#attempt === null) {
      throw new Error('unreachable');
    }

    this.#model = model;
    this.#ruleSet.initialize(model);
    this.#attempt.initialize(model);

    // Show the view if the model was initialized after selection.
    if (this.#selectedInternal && !this.#view) {
      this.onselect(false);
    }
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.#selectedInternal = true;

    if (!this.#model) {
      return false;
    }

    if (!this.#view) {
      this.#view = new PreloadingSummaryView(this.#model);
    }

    this.showView(this.#view);

    return false;
  }

  expandAndRevealRuleSet(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): void {
    if (this.#ruleSet === null) {
      throw new Error('unreachable');
    }

    this.expand();
    this.#ruleSet.revealRuleSet(revealInfo);
  }

  expandAndRevealAttempts(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): void {
    if (this.#attempt === null) {
      throw new Error('unreachable');
    }

    this.expand();
    this.#attempt.revealAttempts(filter);
  }
}

export class PreloadingRuleSetTreeElement extends PreloadingTreeElementBase<PreloadingRuleSetView> {
  constructor(panel: ResourcesPanel) {
    super(
        panel, PreloadingRuleSetView, 'preloading://rule-set' as Platform.DevToolsPath.UrlString,
        i18nString(UIStrings.rules));
  }

  revealRuleSet(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): void {
    this.select();

    if (this.view === undefined) {
      return;
    }

    this.view?.revealRuleSet(revealInfo);
  }
}

class PreloadingAttemptTreeElement extends PreloadingTreeElementBase<PreloadingAttemptView> {
  constructor(panel: ResourcesPanel) {
    super(
        panel, PreloadingAttemptView, 'preloading://attempt' as Platform.DevToolsPath.UrlString,
        i18nString(UIStrings.speculations));
  }

  revealAttempts(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): void {
    this.select();
    this.view?.setFilter(filter);
  }
}
