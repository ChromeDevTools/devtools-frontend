// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Protocol from '../../../generated/protocol.js';
import * as SDK from '../../../core/sdk/sdk.js';

import * as PreloadingComponents from './components/components.js';

// eslint-disable-next-line rulesdir/es_modules_import
import emptyWidgetStyles from '../../../ui/legacy/emptyWidget.css.js';
import preloadingViewStyles from './preloadingView.css.js';

const UIStrings = {
  /**
   *@description Text in grid: Rule set is valid
   */
  validityValid: 'Valid',
  /**
   *@description Text in grid and details: Preloading attempt is eligible but pending.
   */
  statusPending: 'Pending',
  /**
   *@description Text in grid and details: Preloading is running.
   */
  statusRunning: 'Running',
  /**
   *@description Text in grid and details: Preloading finished and the result is ready for the next navigation.
   */
  statusReady: 'Ready',
  /**
   *@description Text in grid and details: Ready, then used.
   */
  statusSuccess: 'Success',
  /**
   *@description Text in grid and details: Preloading failed.
   */
  statusFailure: 'Failure',
  /**
   *@description Title in infobar
   */
  warningTitlePreloadingDisabledByFeatureFlag: 'Preloading was disabled, but is force-enabled now',
  /**
   *@description Detail in infobar
   */
  warningDetailPreloadingDisabledByFeatureFlag:
      'Preloading is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.',
  /**
   *@description Title in infobar
   */
  warningTitlePrerenderingDisabledByFeatureFlag: 'Prerendering was disabled, but is force-enabled now',
  /**
   *@description Detail in infobar
   */
  warningDetailPrerenderingDisabledByFeatureFlag:
      'Prerendering is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/PreloadingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class PreloadingUIUtils {
  static action({key}: SDK.PreloadingModel.PreloadingAttempt): string {
    // Use "prefetch"/"prerender" as is in SpeculationRules.
    switch (key.action) {
      case SDK.PreloadingModel.SpeculationAction.Prefetch:
        return i18n.i18n.lockedString('prefetch');
      case SDK.PreloadingModel.SpeculationAction.Prerender:
        return i18n.i18n.lockedString('prerender');
    }
  }

  static status({status}: SDK.PreloadingModel.PreloadingAttempt): string {
    // See content/public/browser/preloading.h PreloadingAttemptOutcome.
    switch (status) {
      case Protocol.Preload.PreloadingStatus.Pending:
        return i18nString(UIStrings.statusPending);
      case Protocol.Preload.PreloadingStatus.Running:
        return i18nString(UIStrings.statusRunning);
      case Protocol.Preload.PreloadingStatus.Ready:
        return i18nString(UIStrings.statusReady);
      case Protocol.Preload.PreloadingStatus.Success:
        return i18nString(UIStrings.statusSuccess);
      case Protocol.Preload.PreloadingStatus.Failure:
        return i18nString(UIStrings.statusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case Protocol.Preload.PreloadingStatus.NotSupported:
        return i18n.i18n.lockedString('Internal error');
    }
  }
}

interface FeatureFlags {
  preloadingHoldback: boolean|null;
  prerender2Holdback: boolean|null;
}

export class PreloadingView extends UI.Widget.VBox {
  private readonly model: SDK.PreloadingModel.PreloadingModel;
  // TODO(https://crbug.com/1384419): Remove PrerenderingModel.
  private readonly prerenderingModel: SDK.PrerenderingModel.PrerenderingModel;
  private focusedRuleSetId: Protocol.Preload.RuleSetId|null = null;
  private focusedPreloadingAttemptId: SDK.PreloadingModel.PreloadingAttemptId|null = null;

  private readonly infobarContainer: HTMLDivElement;
  private readonly hsplit: UI.SplitWidget.SplitWidget;
  private readonly vsplitRuleSets: UI.SplitWidget.SplitWidget;
  private readonly ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid();
  private readonly ruleSetDetails = new PreloadingComponents.RuleSetDetailsReportView.RuleSetDetailsReportView();
  private readonly preloadingGrid = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  private readonly preloadingDetails =
      new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView();
  private readonly featureFlagWarningsPromise: Promise<void>;

  constructor(model: SDK.PreloadingModel.PreloadingModel, prerenderingModel: SDK.PrerenderingModel.PrerenderingModel) {
    super(/* isWebComponent */ true, /* delegatesFocus */ false);

    this.model = model;
    this.model.addEventListener(SDK.PreloadingModel.Events.ModelUpdated, this.onModelUpdated, this);

    this.prerenderingModel = prerenderingModel;
    this.prerenderingModel.addEventListener(
        SDK.PrerenderingModel.Events.PrerenderingAttemptStarted, this.onModelUpdated, this);
    this.prerenderingModel.addEventListener(
        SDK.PrerenderingModel.Events.PrerenderingAttemptUpdated, this.onModelUpdated, this);
    this.prerenderingModel.addEventListener(
        SDK.PrerenderingModel.Events.PrerenderingAttemptsRemoved, this.onModelUpdated, this);

    // this (VBox)
    //   +- infobarContainer
    //   +- hsplit
    //        +- vsplitRuleSets
    //             +- topContainer
    //                  +- RuleSetGrid
    //             +- bottomContainer
    //                  +- RuleSetDetailsReportView
    //        +- vsplitPreloadingAttempts
    //             +- topContainer
    //                  +- PreloadingGrid
    //             +- bottomContainer
    //                  +- PreloadingDetailsReportView
    //
    // - If an row of RuleSetGrid selected, RuleSetDetailsReportView shows details of it.
    // - If not, RuleSetDetailsReportView hides.
    //
    // - If an row of PreloadingGrid selected, PreloadingDetailsReportView shows details of it.
    // - If not, PreloadingDetailsReportView shows some messages.

    this.infobarContainer = document.createElement('div');
    this.infobarContainer.classList.add('flex-none');
    this.contentElement.insertBefore(this.infobarContainer, this.contentElement.firstChild);

    this.ruleSetGrid.addEventListener('cellfocused', this.onRuleSetsGridCellFocused.bind(this));
    this.vsplitRuleSets = this.makeVsplit(this.ruleSetGrid, this.ruleSetDetails);

    this.preloadingGrid.addEventListener('cellfocused', this.onPreloadingGridCellFocused.bind(this));
    const vsplitPreloadingAttempts = this.makeVsplit(this.preloadingGrid, this.preloadingDetails);

    this.hsplit = new UI.SplitWidget.SplitWidget(
        /* isVertical */ false,
        /* secondIsSidebar */ false,
        /* settingName */ undefined,
        /* defaultSidebarWidth */ undefined,
        /* defaultSidebarHeight */ 200,
        /* constraintsInDip */ undefined,
    );
    this.hsplit.setSidebarWidget(this.vsplitRuleSets);
    this.hsplit.setMainWidget(vsplitPreloadingAttempts);

    this.featureFlagWarningsPromise = this.getFeatureFlags().then(x => this.onGetFeatureFlags(x));
  }

  private makeVsplit(left: HTMLElement, right: HTMLElement): UI.SplitWidget.SplitWidget {
    const leftContainer = new UI.Widget.VBox();
    leftContainer.setMinimumSize(0, 40);
    leftContainer.contentElement.appendChild(left);

    const rightContainer = new UI.Widget.VBox();
    rightContainer.setMinimumSize(0, 80);
    rightContainer.contentElement.appendChild(right);

    const vsplit = new UI.SplitWidget.SplitWidget(
        /* isVertical */ true,
        /* secondIsSidebar */ true,
        /* settingName */ undefined,
        /* defaultSidebarWidth */ 400,
        /* defaultSidebarHeight */ undefined,
        /* constraintsInDip */ undefined,
    );
    vsplit.setMainWidget(leftContainer);
    vsplit.setSidebarWidget(rightContainer);

    return vsplit;
  }

  wasShown(): void {
    super.wasShown();

    this.registerCSSFiles([emptyWidgetStyles, preloadingViewStyles]);

    this.hsplit.show(this.contentElement);

    this.onModelUpdated();
  }

  // `cellfocused` events only emitted focus modified. So, we can't
  // catch the case focused cell is clicked. Currently, we need
  //
  // 1. Click a cell and focus.
  // 2. Click out of rows.
  // 3. Click the last cell.
  //
  // to hide the details.
  //
  // TODO(https://crbug.com/1384419): Consider to add `cellclicked` event.
  private updateRuleSetDetails(): void {
    const id = this.focusedRuleSetId;
    const ruleSet = id === null ? null : this.model.getRuleSetById(id);
    this.ruleSetDetails.data = ruleSet;

    if (ruleSet === null) {
      this.vsplitRuleSets.hideSidebar();
    } else {
      this.vsplitRuleSets.showBoth();
    }
  }

  private updatePreloadingDetails(): void {
    const id = this.focusedPreloadingAttemptId;
    this.preloadingDetails.data = id === null ? null : this.model.getPreloadingAttemptById(id);
  }

  private onModelUpdated(): void {
    // Update rule sets grid
    //
    // Currently, all rule sets that appear in DevTools are valid.
    // TODO(https://crbug.com/1384419): Add property `validity` to the CDP.
    const ruleSetRows = this.model.getAllRuleSets().map(({id}) => ({
                                                          id,
                                                          validity: i18nString(UIStrings.validityValid),
                                                        }));
    this.ruleSetGrid.update(ruleSetRows);

    this.updateRuleSetDetails();

    // Update preloaidng grid
    const preloadingAttemptRows = this.model.getAllPreloadingAttempts().map(({id, value}) => ({
                                                                              id,
                                                                              action: PreloadingUIUtils.action(value),
                                                                              url: value.key.url,
                                                                              status: PreloadingUIUtils.status(value),
                                                                            }));
    this.preloadingGrid.update(preloadingAttemptRows);

    this.updatePreloadingDetails();
  }

  private onRuleSetsGridCellFocused(event: Event): void {
    const focusedEvent = event as DataGrid.DataGridEvents.BodyCellFocusedEvent;
    const id = focusedEvent.data.row.cells.find(cell => cell.columnId === 'id')?.value as Protocol.Preload.RuleSetId;
    if (this.focusedRuleSetId === id) {
      // Toggle details
      this.focusedRuleSetId = null;
    } else {
      this.focusedRuleSetId = id;
    }
    this.updateRuleSetDetails();
  }

  private onPreloadingGridCellFocused(event: Event): void {
    const focusedEvent = event as DataGrid.DataGridEvents.BodyCellFocusedEvent;
    this.focusedPreloadingAttemptId = focusedEvent.data.row.cells.find(cell => cell.columnId === 'id')?.value as
        SDK.PreloadingModel.PreloadingAttemptId;
    this.updatePreloadingDetails();
  }

  async getFeatureFlags(): Promise<FeatureFlags> {
    const preloadingHoldbackPromise = this.model.target().systemInfo().invoke_getFeatureState({
      featureState: 'PreloadingHoldback',
    });
    const prerender2HoldbackPromise = this.model.target().systemInfo().invoke_getFeatureState({
      featureState: 'PrerenderHoldback',
    });
    return {
      preloadingHoldback: (await preloadingHoldbackPromise).featureEnabled ?? null,
      prerender2Holdback: (await prerender2HoldbackPromise).featureEnabled ?? null,
    };
  }

  // Shows warnings if features are disabled by feature flags.
  private onGetFeatureFlags(flags: FeatureFlags): void {
    if (flags.preloadingHoldback === true) {
      this.showInfobar(
          i18nString(UIStrings.warningTitlePreloadingDisabledByFeatureFlag),
          i18nString(UIStrings.warningDetailPreloadingDisabledByFeatureFlag));
    }

    if (flags.prerender2Holdback === true) {
      this.showInfobar(
          i18nString(UIStrings.warningTitlePrerenderingDisabledByFeatureFlag),
          i18nString(UIStrings.warningDetailPrerenderingDisabledByFeatureFlag));
    }
  }

  private showInfobar(titleText: string, detailsText: string): void {
    const infobar = new UI.Infobar.Infobar(
        UI.Infobar.Type.Warning, /* text */ titleText, /* actions? */ undefined, /* disableSetting? */ undefined);
    infobar.setParentView(this);
    infobar.createDetailsRowMessage(detailsText);
    this.infobarContainer.appendChild(infobar.element);
  }

  getInfobarContainerForTest(): HTMLDivElement {
    return this.infobarContainer;
  }

  getRuleSetGridForTest(): PreloadingComponents.RuleSetGrid.RuleSetGrid {
    return this.ruleSetGrid;
  }

  getPreloadingGridForTest(): PreloadingComponents.PreloadingGrid.PreloadingGrid {
    return this.preloadingGrid;
  }

  getPreloadingDetailsForTest(): PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView {
    return this.preloadingDetails;
  }

  getFeatureFlagWarningsPromiseForTest(): Promise<void> {
    return this.featureFlagWarningsPromise;
  }
}
