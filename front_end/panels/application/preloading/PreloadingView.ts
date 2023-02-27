// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import type * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as SDK from '../../../core/sdk/sdk.js';

import * as PreloadingComponents from './components/components.js';

// eslint-disable-next-line rulesdir/es_modules_import
import emptyWidgetStyles from '../../../ui/legacy/emptyWidget.css.js';
import preloadingViewStyles from './preloadingView.css.js';

type WithId<I, V> = SDK.PreloadingModel.WithId<I, V>;
type PreloadingId = SDK.PrerenderingModel.PreloadingId;
type PrerenderingAttempt = SDK.PrerenderingModel.PrerenderingAttempt;
type PrerenderingAttemptWithId = SDK.PrerenderingModel.PrerenderingAttemptWithId;

const UIStrings = {
  /**
   *@description Text to clear content
   */
  clearNotOngoing: 'Clear not ongoing',
  /**
   *@description Text in grid: Rule set is valid
   */
  validityValid: 'Valid',
  /**
   *@description Text in grid and details
   */
  statusPrerendering: 'Prerendering',
  /**
   *@description Text in grid and details
   */
  statusActivated: 'Activated',
  /**
   *@description Text in grid and details
   */
  statusDiscarded: 'Discarded',
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

class PrerenderingUIUtils {
  static trigger(x: PrerenderingAttempt): string {
    switch (x.trigger.kind) {
      case 'PrerenderingTriggerSpecRules':
        return i18n.i18n.lockedString('Speculation Rules');
      case 'PrerenderingTriggerDUI':
        return i18n.i18n.lockedString('Direct User Input');
      case 'PrerenderingTriggerDSE':
        return i18n.i18n.lockedString('Default Search Engine');
      case 'PrerenderingTriggerOpaque':
        return i18n.i18n.lockedString('Opaque');
    }
  }

  static status(x: PrerenderingAttempt): string {
    switch (x.status) {
      case SDK.PrerenderingModel.PrerenderingStatus.Prerendering:
        return i18nString(UIStrings.statusPrerendering);
      case SDK.PrerenderingModel.PrerenderingStatus.Activated:
        return i18nString(UIStrings.statusActivated);
      case SDK.PrerenderingModel.PrerenderingStatus.Discarded:
        return i18nString(UIStrings.statusDiscarded);
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
  private focused: PreloadingId|null = null;

  private readonly infobarContainer: HTMLDivElement;
  private readonly toolbar: UI.Toolbar.Toolbar;
  private readonly hsplit: UI.SplitWidget.SplitWidget;
  private readonly vsplitRuleSets: UI.SplitWidget.SplitWidget;
  private readonly ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid();
  private ruleSetDetails = new PreloadingComponents.RuleSetDetailsReportView.RuleSetDetailsReportView();
  private readonly grid = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  private details = new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView();
  private readonly featureFlagWarningsPromise: Promise<void>;

  constructor(model: SDK.PreloadingModel.PreloadingModel, prerenderingModel: SDK.PrerenderingModel.PrerenderingModel) {
    super(/* isWebComponent */ true, /* delegatesFocus */ false);

    this.model = model;
    this.model.addEventListener(SDK.PreloadingModel.Events.RuleSetsModified, this.onModelUpdated, this);

    this.prerenderingModel = prerenderingModel;
    this.prerenderingModel.addEventListener(
        SDK.PrerenderingModel.Events.PrerenderingAttemptStarted, this.onModelUpdated, this);
    this.prerenderingModel.addEventListener(
        SDK.PrerenderingModel.Events.PrerenderingAttemptUpdated, this.onModelUpdated, this);
    this.prerenderingModel.addEventListener(
        SDK.PrerenderingModel.Events.PrerenderingAttemptsRemoved, this.onModelUpdated, this);

    // this (VBox)
    //   +- infobarContainer
    //   +- toolbar (| [clear] |)
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

    this.toolbar = new UI.Toolbar.Toolbar('preloading-toolbar', this.contentElement);

    const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearNotOngoing), 'largeicon-clear');
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.onClearNotOngoing, this);
    this.toolbar.appendToolbarItem(clearButton);

    this.toolbar.appendSeparator();

    this.ruleSetGrid.addEventListener('cellfocused', this.onRuleSetsGridCellFocused.bind(this));
    this.vsplitRuleSets = this.makeVsplit(this.ruleSetGrid, this.ruleSetDetails);

    this.grid.addEventListener('cellfocused', this.onCellFocused.bind(this));
    const vsplitPreloadingAttempts = this.makeVsplit(this.grid, this.details);

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

  private updateDetails(): void {
    this.details.data = this.focused === null ? null : this.prerenderingModel.getById(this.focused);
  }

  private onModelUpdated(): void {
    // Update rule sets grid
    //
    // Currently, all rule sets that appear in DevTools are valid.
    // TODO(https://crbug.com/1384419): Add property `validity` to the CDP.
    const ruleSetsRows = this.model.getAllRuleSets().map(
        ({id}: WithId<Protocol.Preload.RuleSetId, Protocol.Preload.RuleSet>):
            PreloadingComponents.RuleSetGrid.RuleSetGridRow => ({
          id,
          validity: i18nString(UIStrings.validityValid),
        }));
    this.ruleSetGrid.update(ruleSetsRows);

    this.updateRuleSetDetails();

    // Update grid
    const rows = this.prerenderingModel.getAll().map(
        ({id, attempt}: PrerenderingAttemptWithId): PreloadingComponents.PreloadingGrid.PreloadingGridRow => {
          return {
            id,
            startedAt: new Date(attempt.startedAt).toLocaleString(),
            type: i18n.i18n.lockedString('Prerendering'),
            trigger: PrerenderingUIUtils.trigger(attempt),
            url: attempt.url,
            status: PrerenderingUIUtils.status(attempt),
          };
        });
    this.grid.update(rows);

    this.updateDetails();
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

  private onCellFocused(event: Event): void {
    const focusedEvent = event as DataGrid.DataGridEvents.BodyCellFocusedEvent;
    this.focused = focusedEvent.data.row.cells.find(cell => cell.columnId === 'id')?.value as PreloadingId;
    this.updateDetails();
  }

  private onClearNotOngoing(): void {
    this.prerenderingModel.clearNotOngoing();
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

  getRuleSetsGridForTest(): PreloadingComponents.RuleSetGrid.RuleSetGrid {
    return this.ruleSetGrid;
  }

  getGridForTest(): PreloadingComponents.PreloadingGrid.PreloadingGrid {
    return this.grid;
  }

  getDetailsForTest(): PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView {
    return this.details;
  }

  getFeatureFlagWarningsPromiseForTest(): Promise<void> {
    return this.featureFlagWarningsPromise;
  }
}
