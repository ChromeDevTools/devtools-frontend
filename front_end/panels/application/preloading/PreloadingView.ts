// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as DataGrid from '../../../ui/components/data_grid/data_grid.js';

import * as Common from '../../../core/common/common.js';
import * as ChromeLink from '../../../ui/components/chrome_link/chrome_link.js';
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
   *@description Checkbox: If rule set is selected in rule set grid, filters preloading attempts in preloading attempts grid.
   */
  checkboxFilterBySelectedRuleSet: 'Filter by selected rule set',
  /**
   *@description Text in grid: Rule set is valid
   */
  validityValid: 'Valid',
  /**
   *@description Text in grid: Rule set must be a valid JSON object
   */
  validityInvalid: 'Invalid',
  /**
   *@description Text in grid: Rule set contains invalid rules and they are ignored
   */
  validitySomeRulesInvalid: 'Some rules invalid',
  /**
   *@description Text in grid and details: Preloading attempt is not yet triggered.
   */
  statusNotTriggered: 'Not triggered',
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
  /**
   *@description Title of preloading state disabled warning in infobar
   */
  warningTitlePreloadingStateDisabled: 'Preloading is disabled',
  /**
   *@description Detail of preloading state disabled warning in infobar
   *@example {chrome://settings/preloading} PH1
   *@example {chrome://extensions} PH2
   */
  warningDetailPreloadingStateDisabled:
      'Preloading is disabled because of user settings or an extension. Go to {PH1} to learn more, or go to {PH2} to disable the extension.',
  /**
   *@description Detail in infobar when preloading is disabled by data saver.
   */
  warningDetailPreloadingDisabledByDatasaver:
      'Preloading is disabled because of the operating system\'s Data Saver mode.',
  /**
   *@description Detail in infobar when preloading is disabled by data saver.
   */
  warningDetailPreloadingDisabledByBatterysaver:
      'Preloading is disabled because of the operating system\'s Battery Saver mode.',
  /**
   *@description Text of Preload pages settings
   */
  preloadingPageSettings: 'Preload pages settings',
  /**
   *@description Text of Extension settings
   */
  extensionSettings: 'Extensions settings',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/PreloadingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class PreloadingUIUtils {
  static action({key}: SDK.PreloadingModel.PreloadingAttempt): string {
    // Use "prefetch"/"prerender" as is in SpeculationRules.
    switch (key.action) {
      case Protocol.Preload.SpeculationAction.Prefetch:
        return i18n.i18n.lockedString('prefetch');
      case Protocol.Preload.SpeculationAction.Prerender:
        return i18n.i18n.lockedString('prerender');
    }
  }

  static status({status}: SDK.PreloadingModel.PreloadingAttempt): string {
    // See content/public/browser/preloading.h PreloadingAttemptOutcome.
    switch (status) {
      case SDK.PreloadingModel.PreloadingStatus.NotTriggered:
        return i18nString(UIStrings.statusNotTriggered);
      case SDK.PreloadingModel.PreloadingStatus.Pending:
        return i18nString(UIStrings.statusPending);
      case SDK.PreloadingModel.PreloadingStatus.Running:
        return i18nString(UIStrings.statusRunning);
      case SDK.PreloadingModel.PreloadingStatus.Ready:
        return i18nString(UIStrings.statusReady);
      case SDK.PreloadingModel.PreloadingStatus.Success:
        return i18nString(UIStrings.statusSuccess);
      case SDK.PreloadingModel.PreloadingStatus.Failure:
        return i18nString(UIStrings.statusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case SDK.PreloadingModel.PreloadingStatus.NotSupported:
        return i18n.i18n.lockedString('Internal error');
    }
  }

  // Summary of error of rule set shown in grid.
  static validity({errorType}: Protocol.Preload.RuleSet): string {
    switch (errorType) {
      case undefined:
        return i18nString(UIStrings.validityValid);
      case Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject:
        return i18nString(UIStrings.validityInvalid);
      case Protocol.Preload.RuleSetErrorType.InvalidRulesSkipped:
        return i18nString(UIStrings.validitySomeRulesInvalid);
    }
  }

  // Where a rule set came from, shown in grid.
  static location(ruleSet: Protocol.Preload.RuleSet): string {
    if (ruleSet.backendNodeId !== undefined) {
      return i18n.i18n.lockedString('<script>');
    }

    if (ruleSet.url !== undefined) {
      return ruleSet.url;
    }

    throw Error('unreachable');
  }
}

// Holds PreloadingModel of current context
//
// There can be multiple Targets and PreloadingModels and they switch as
// time goes. For example:
//
// - Prerendering started and a user switched context with
//   ExecutionContextSelector. This switching is bidirectional.
// - Prerendered page is activated. This switching is unidirectional.
//
// Context switching is managed by scoped target. This class handles
// switching events and holds PreloadingModel of current context.
//
// Note that switching at the timing of activation triggers handing over
// from the old model to the new model. See
// PreloadingMoedl.onPrimaryPageChanged.
class PreloadingModelProxy implements SDK.TargetManager.SDKModelObserver<SDK.PreloadingModel.PreloadingModel> {
  model: SDK.PreloadingModel.PreloadingModel;
  private readonly view: PreloadingView|PreloadingResultView;
  private readonly warningsView: PreloadingWarningsView;

  constructor(
      model: SDK.PreloadingModel.PreloadingModel, view: PreloadingView|PreloadingResultView,
      warningsView: PreloadingWarningsView) {
    this.view = view;
    this.warningsView = warningsView;

    this.model = model;
    this.model.addEventListener(SDK.PreloadingModel.Events.ModelUpdated, this.view.render, this.view);
    this.model.addEventListener(
        SDK.PreloadingModel.Events.WarningsUpdated, this.warningsView.onWarningsUpdated, this.warningsView);
  }

  initialize(): void {
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.PreloadingModel.PreloadingModel, this, {scoped: true});
  }

  modelAdded(model: SDK.PreloadingModel.PreloadingModel): void {
    // Ignore models/targets of non-outermost frames like iframe/FencedFrames.
    if (model.target().outermostTarget() !== model.target()) {
      return;
    }

    this.model.removeEventListener(SDK.PreloadingModel.Events.ModelUpdated, this.view.render, this.view);
    this.model.removeEventListener(
        SDK.PreloadingModel.Events.WarningsUpdated, this.warningsView.onWarningsUpdated, this.warningsView);
    this.model = model;
    this.model.addEventListener(SDK.PreloadingModel.Events.ModelUpdated, this.view.render, this.view);
    this.model.addEventListener(
        SDK.PreloadingModel.Events.WarningsUpdated, this.warningsView.onWarningsUpdated, this.warningsView);

    this.view.render();
  }

  modelRemoved(model: SDK.PreloadingModel.PreloadingModel): void {
    model.removeEventListener(SDK.PreloadingModel.Events.ModelUpdated, this.view.render, this.view);
    model.removeEventListener(
        SDK.PreloadingModel.Events.WarningsUpdated, this.warningsView.onWarningsUpdated, this.warningsView);
  }
}

export class PreloadingView extends UI.Widget.VBox {
  private readonly modelProxy: PreloadingModelProxy;
  private focusedRuleSetId: Protocol.Preload.RuleSetId|null = null;
  private focusedPreloadingAttemptId: SDK.PreloadingModel.PreloadingAttemptId|null = null;
  private checkboxFilterBySelectedRuleSet: UI.Toolbar.ToolbarCheckbox;

  private readonly warningsContainer: HTMLDivElement;
  private readonly warningsView = new PreloadingWarningsView();
  private readonly hsplit: UI.SplitWidget.SplitWidget;
  private readonly vsplitRuleSets: UI.SplitWidget.SplitWidget;
  private readonly ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid();
  private readonly ruleSetDetails = new PreloadingComponents.RuleSetDetailsReportView.RuleSetDetailsReportView();
  private readonly preloadingGrid = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  private readonly preloadingDetails =
      new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView();

  constructor(model: SDK.PreloadingModel.PreloadingModel) {
    super(/* isWebComponent */ true, /* delegatesFocus */ false);

    this.modelProxy = new PreloadingModelProxy(model, this, this.warningsView);

    // this (VBox)
    //   +- warningsContainer
    //        +- PreloadingWarningsView
    //   +- hsplit
    //        +- vsplitRuleSets
    //             +- leftContainer
    //                  +- RuleSetGrid
    //             +- rightContainer
    //                  +- RuleSetDetailsReportView
    //        +- VBox
    //             +- toolbar (filtering)
    //             +- vsplitPreloadingAttempts
    //                  +- leftContainer
    //                       +- PreloadingGrid
    //                  +- rightContainer
    //                       +- PreloadingDetailsReportView
    //
    // - If an row of RuleSetGrid selected, RuleSetDetailsReportView shows details of it.
    // - If not, RuleSetDetailsReportView hides.
    //
    // - If an row of PreloadingGrid selected, PreloadingDetailsReportView shows details of it.
    // - If not, PreloadingDetailsReportView shows some messages.

    this.warningsContainer = document.createElement('div');
    this.warningsContainer.classList.add('flex-none');
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);

    this.ruleSetGrid.addEventListener('cellfocused', this.onRuleSetsGridCellFocused.bind(this));
    this.vsplitRuleSets = this.makeVsplit(this.ruleSetGrid, this.ruleSetDetails);

    const preloadingAttempts = new UI.Widget.VBox();

    const toolbar = new UI.Toolbar.Toolbar('preloading-toolbar', preloadingAttempts.contentElement);
    this.checkboxFilterBySelectedRuleSet = new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.checkboxFilterBySelectedRuleSet), /* tooltip? */ undefined, this.render.bind(this));
    this.checkboxFilterBySelectedRuleSet.setChecked(true);
    toolbar.appendToolbarItem(this.checkboxFilterBySelectedRuleSet);

    this.preloadingGrid.addEventListener('cellfocused', this.onPreloadingGridCellFocused.bind(this));
    const vsplitPreloadingAttempts = this.makeVsplit(this.preloadingGrid, this.preloadingDetails);
    vsplitPreloadingAttempts.show(preloadingAttempts.contentElement);

    this.hsplit = new UI.SplitWidget.SplitWidget(
        /* isVertical */ false,
        /* secondIsSidebar */ false,
        /* settingName */ undefined,
        /* defaultSidebarWidth */ undefined,
        /* defaultSidebarHeight */ 200,
        /* constraintsInDip */ undefined,
    );
    this.hsplit.setSidebarWidget(this.vsplitRuleSets);
    this.hsplit.setMainWidget(preloadingAttempts);
  }

  private makeVsplit(left: HTMLElement, right: HTMLElement): UI.SplitWidget.SplitWidget {
    const leftContainer = new UI.Widget.VBox();
    leftContainer.setMinimumSize(0, 40);
    leftContainer.contentElement.classList.add('overflow-auto');
    leftContainer.contentElement.appendChild(left);

    const rightContainer = new UI.Widget.VBox();
    rightContainer.setMinimumSize(0, 80);
    rightContainer.contentElement.classList.add('overflow-auto');
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

  override wasShown(): void {
    super.wasShown();

    this.registerCSSFiles([emptyWidgetStyles, preloadingViewStyles]);

    this.hsplit.show(this.contentElement);

    // Lazily initialize PreloadingModelProxy because this triggers a chain
    //
    //    PreloadingModelProxy.initialize()
    // -> TargetManager.observeModels()
    // -> PreloadingModelProxy.modelAdded()
    // -> PreloadingView.render()
    //
    // , and PreloadingView.onModelAdded() requires all members are
    // initialized. So, here is the best timing.
    this.modelProxy.initialize();
  }

  private updateRuleSetDetails(): void {
    const id = this.focusedRuleSetId;
    const ruleSet = id === null ? null : this.modelProxy.model.getRuleSetById(id);
    this.ruleSetDetails.data = ruleSet;

    if (ruleSet === null) {
      this.vsplitRuleSets.hideSidebar();
    } else {
      this.vsplitRuleSets.showBoth();
    }
  }

  private updatePreloadingDetails(): void {
    const id = this.focusedPreloadingAttemptId;
    const preloadingAttempt = id === null ? null : this.modelProxy.model.getPreloadingAttemptById(id);
    if (preloadingAttempt === null) {
      this.preloadingDetails.data = null;
    } else {
      const ruleSets =
          preloadingAttempt.ruleSetIds.map(id => this.modelProxy.model.getRuleSetById(id)).filter(x => x !== null) as
          Protocol.Preload.RuleSet[];
      this.preloadingDetails.data = {
        preloadingAttempt,
        ruleSets,
      };
    }
  }

  render(): void {
    // Update rule sets grid
    //
    // Currently, all rule sets that appear in DevTools are valid.
    // TODO(https://crbug.com/1384419): Add property `validity` to the CDP.
    const ruleSetRows = this.modelProxy.model.getAllRuleSets().map(({id, value}) => ({
                                                                     id,
                                                                     validity: PreloadingUIUtils.validity(value),
                                                                     location: PreloadingUIUtils.location(value),
                                                                   }));
    this.ruleSetGrid.update(ruleSetRows);

    this.updateRuleSetDetails();

    // Update preloaidng grid
    const filteringRuleSetId = this.checkboxFilterBySelectedRuleSet.checked() ? this.focusedRuleSetId : null;
    const url = SDK.TargetManager.TargetManager.instance().inspectedURL();
    const securityOrigin = url ? (new Common.ParsedURL.ParsedURL(url)).securityOrigin() : null;
    const preloadingAttemptRows = this.modelProxy.model.getPreloadingAttempts(filteringRuleSetId).map(({id, value}) => {
      // Shorten URL if a preloading attempt is same-origin.
      const orig = value.key.url;
      const url = securityOrigin && orig.startsWith(securityOrigin) ? orig.slice(securityOrigin.length) : orig;

      return {
        id,
        url,
        action: PreloadingUIUtils.action(value),
        status: PreloadingUIUtils.status(value),
      };
    });
    this.preloadingGrid.update(preloadingAttemptRows);

    this.updatePreloadingDetails();
  }

  private onRuleSetsGridCellFocused(event: Event): void {
    const focusedEvent = event as DataGrid.DataGridEvents.BodyCellFocusedEvent;
    this.focusedRuleSetId =
        focusedEvent.data.row.cells.find(cell => cell.columnId === 'id')?.value as Protocol.Preload.RuleSetId;
    this.render();
  }

  private onPreloadingGridCellFocused(event: Event): void {
    const focusedEvent = event as DataGrid.DataGridEvents.BodyCellFocusedEvent;
    this.focusedPreloadingAttemptId = focusedEvent.data.row.cells.find(cell => cell.columnId === 'id')?.value as
        SDK.PreloadingModel.PreloadingAttemptId;
    this.render();
  }

  getInfobarContainerForTest(): HTMLDivElement {
    return this.warningsView.contentElement;
  }

  getRuleSetGridForTest(): PreloadingComponents.RuleSetGrid.RuleSetGrid {
    return this.ruleSetGrid;
  }

  getRuleSetDetailsForTest(): PreloadingComponents.RuleSetDetailsReportView.RuleSetDetailsReportView {
    return this.ruleSetDetails;
  }

  getPreloadingGridForTest(): PreloadingComponents.PreloadingGrid.PreloadingGrid {
    return this.preloadingGrid;
  }

  getPreloadingDetailsForTest(): PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView {
    return this.preloadingDetails;
  }

  setCheckboxFilterBySelectedRuleSetForTest(checked: boolean): void {
    this.checkboxFilterBySelectedRuleSet.setChecked(checked);
    this.render();
  }
}

export class PreloadingResultView extends UI.Widget.VBox {
  private readonly modelProxy: PreloadingModelProxy;

  private readonly warningsContainer: HTMLDivElement;
  private readonly warningsView = new PreloadingWarningsView();
  private readonly usedPreloading = new PreloadingComponents.UsedPreloadingView.UsedPreloadingView();

  constructor(model: SDK.PreloadingModel.PreloadingModel) {
    super(/* isWebComponent */ true, /* delegatesFocus */ false);

    this.modelProxy = new PreloadingModelProxy(model, this, this.warningsView);

    this.warningsContainer = document.createElement('div');
    this.warningsContainer.classList.add('flex-none');
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);

    const usedPreloadingContainer = new UI.Widget.VBox();
    usedPreloadingContainer.contentElement.appendChild(this.usedPreloading);
    usedPreloadingContainer.show(this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();

    this.registerCSSFiles([emptyWidgetStyles, preloadingViewStyles]);

    // Lazily initialize PreloadingModelProxy because this triggers a chain
    //
    //    PreloadingModelProxy.initialize()
    // -> TargetManager.observeModels()
    // -> PreloadingModelProxy.modelAdded()
    // -> PreloadingResultView.render()
    //
    // , and PreloadingView.onModelAdded() requires all members are
    // initialized. So, here is the best timing.
    this.modelProxy.initialize();
  }

  render(): void {
    this.usedPreloading.data = this.modelProxy.model.getPreloadingAttemptsOfPreviousPage().map(({value}) => value);
  }

  getUsedPreloadingForTest(): PreloadingComponents.UsedPreloadingView.UsedPreloadingView {
    return this.usedPreloading;
  }
}

export class PreloadingWarningsView extends UI.Widget.VBox {
  constructor() {
    super(/* isWebComponent */ false, /* delegatesFocus */ false);
  }

  onWarningsUpdated(event: Common.EventTarget.EventTargetEvent<SDK.PreloadingModel.PreloadWarnings>): void {
    // TODO(crbug.com/1384419): Add more information in PreloadEnabledState from
    // backend to distinguish the details of the reasons why preloading is
    // disabled.
    function createDisabledMessages(warnings: SDK.PreloadingModel.PreloadWarnings): HTMLDivElement|null {
      const detailsMessage = document.createElement('div');
      let shouldShowWarning = false;

      if (warnings.disabledByPreference) {
        const preloadingSettingLink = new ChromeLink.ChromeLink.ChromeLink();
        preloadingSettingLink.href = 'chrome://settings/cookies';
        preloadingSettingLink.textContent = i18nString(UIStrings.preloadingPageSettings);
        const extensionSettingLink = new ChromeLink.ChromeLink.ChromeLink();
        extensionSettingLink.href = 'chrome://extensions';
        extensionSettingLink.textContent = i18nString(UIStrings.extensionSettings);
        detailsMessage.appendChild(i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.warningDetailPreloadingStateDisabled,
            {PH1: preloadingSettingLink, PH2: extensionSettingLink}));
        shouldShowWarning = true;
      }

      if (warnings.disabledByDataSaver) {
        const element = document.createElement('div');
        element.append(i18nString(UIStrings.warningDetailPreloadingDisabledByDatasaver));
        detailsMessage.appendChild(element);
        shouldShowWarning = true;
      }

      if (warnings.disabledByBatterySaver) {
        const element = document.createElement('div');
        element.append(i18nString(UIStrings.warningDetailPreloadingDisabledByBatterysaver));
        detailsMessage.appendChild(element);
        shouldShowWarning = true;
      }

      return shouldShowWarning ? detailsMessage : null;
    }

    const warnings = event.data;
    const detailsMessage = createDisabledMessages(warnings);
    if (detailsMessage !== null) {
      this.showInfobar(i18nString(UIStrings.warningTitlePreloadingStateDisabled), detailsMessage);
    } else {
      if (warnings.featureFlagPreloadingHoldback) {
        this.showInfobar(
            i18nString(UIStrings.warningTitlePreloadingDisabledByFeatureFlag),
            i18nString(UIStrings.warningDetailPreloadingDisabledByFeatureFlag));
      }

      if (warnings.featureFlagPrerender2Holdback) {
        this.showInfobar(
            i18nString(UIStrings.warningTitlePrerenderingDisabledByFeatureFlag),
            i18nString(UIStrings.warningDetailPrerenderingDisabledByFeatureFlag));
      }
    }
  }

  private showInfobar(titleText: string, detailsMessage: string|Element): void {
    const infobar = new UI.Infobar.Infobar(
        UI.Infobar.Type.Warning, /* text */ titleText, /* actions? */ undefined, /* disableSetting? */ undefined);
    infobar.setParentView(this);
    infobar.createDetailsRowMessage(detailsMessage);
    this.contentElement.appendChild(infobar.element);
  }
}
