// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as SplitView from '../../../ui/components/split_view/split_view.js';
// eslint-disable-next-line rulesdir/es_modules_import
import emptyWidgetStyles from '../../../ui/legacy/emptyWidget.css.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import * as PreloadingComponents from './components/components.js';
import type * as PreloadingHelper from './helper/helper.js';
import preloadingViewStyles from './preloadingView.css.js';
import preloadingViewDropDownStyles from './preloadingViewDropDown.css.js';

const UIStrings = {
  /**
   *@description DropDown title for filtering preloading attempts by rule set
   */
  filterFilterByRuleSet: 'Filter by rule set',
  /**
   *@description DropDown text for filtering preloading attempts by rule set: No filter
   */
  filterAllPreloads: 'All speculative loads',
  /**
   *@description Dropdown subtitle for filtering preloading attempts by rule set
   *             when there are no rule sets in the page.
   */
  noRuleSets: 'no rule sets',
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
   *@description Text to pretty print a file
   */
  prettyPrint: 'Pretty print',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/PreloadingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Used for selector, indicating no filter is specified.
const AllRuleSetRootId: symbol = Symbol('AllRuleSetRootId');

class PreloadingUIUtils {
  static status(status: SDK.PreloadingModel.PreloadingStatus): string {
    // See content/public/browser/preloading.h PreloadingAttemptOutcome.
    switch (status) {
      case SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED:
        return i18nString(UIStrings.statusNotTriggered);
      case SDK.PreloadingModel.PreloadingStatus.PENDING:
        return i18nString(UIStrings.statusPending);
      case SDK.PreloadingModel.PreloadingStatus.RUNNING:
        return i18nString(UIStrings.statusRunning);
      case SDK.PreloadingModel.PreloadingStatus.READY:
        return i18nString(UIStrings.statusReady);
      case SDK.PreloadingModel.PreloadingStatus.SUCCESS:
        return i18nString(UIStrings.statusSuccess);
      case SDK.PreloadingModel.PreloadingStatus.FAILURE:
        return i18nString(UIStrings.statusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case SDK.PreloadingModel.PreloadingStatus.NOT_SUPPORTED:
        return i18n.i18n.lockedString('Internal error');
    }
  }

  static preloadsStatusSummary(countsByStatus: Map<SDK.PreloadingModel.PreloadingStatus, number>): string {
    const LIST = [
      SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED,
      SDK.PreloadingModel.PreloadingStatus.PENDING,
      SDK.PreloadingModel.PreloadingStatus.RUNNING,
      SDK.PreloadingModel.PreloadingStatus.READY,
      SDK.PreloadingModel.PreloadingStatus.SUCCESS,
      SDK.PreloadingModel.PreloadingStatus.FAILURE,
    ];

    return LIST.filter(status => (countsByStatus?.get(status) || 0) > 0)
        .map(status => (countsByStatus?.get(status) || 0) + ' ' + this.status(status))
        .join(', ')
        .toLocaleLowerCase();
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

  static processLocalId(id: Protocol.Preload.RuleSetId): string {
    // RuleSetId is form of '<processId>.<processLocalId>'
    const index = id.indexOf('.');
    return index === -1 ? id : id.slice(index + 1);
  }

  // TODO(https://crbug.com/1410709): Move
  // front_end/panels/application/preloading/components/PreloadingString.ts
  // to
  // front_end/panels/application/preloading/helper/PreloadingString.ts
  // and use PreloadingString.ruleSetLocationShort.
  static ruleSetLocationShort(ruleSet: Protocol.Preload.RuleSet, pageURL: Platform.DevToolsPath.UrlString): string {
    const url = ruleSet.url === undefined ? pageURL : ruleSet.url as Platform.DevToolsPath.UrlString;
    return Bindings.ResourceUtils.displayNameForURL(url);
  }
}

function pageURL(): Platform.DevToolsPath.UrlString {
  return SDK.TargetManager.TargetManager.instance().scopeTarget()?.inspectedURL() ||
      ('' as Platform.DevToolsPath.UrlString);
}

export class PreloadingRuleSetView extends UI.Widget.VBox {
  private model: SDK.PreloadingModel.PreloadingModel;
  private focusedRuleSetId: Protocol.Preload.RuleSetId|null = null;
  private focusedPreloadingAttemptId: SDK.PreloadingModel.PreloadingAttemptId|null = null;

  private readonly warningsContainer: HTMLDivElement;
  private readonly warningsView = new PreloadingWarningsView();
  private readonly hsplit: SplitView.SplitView.SplitView;
  private readonly ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid();
  private readonly ruleSetDetails = new PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView();

  private shouldPrettyPrint = Common.Settings.Settings.instance().moduleSetting('auto-pretty-print-minified').get();

  constructor(model: SDK.PreloadingModel.PreloadingModel) {
    super(/* isWebComponent */ true, /* delegatesFocus */ false);

    this.model = model;
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.MODEL_UPDATED, this.render, this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.WARNINGS_UPDATED,
        this.warningsView.onWarningsUpdated, this.warningsView, {scoped: true});

    // this (VBox)
    //   +- warningsContainer
    //        +- PreloadingWarningsView
    //   +- hsplit
    //        +- leftContainer
    //             +- RuleSetGrid
    //        +- rightContainer
    //             +- RuleSetDetailsView
    //
    // - If an row of RuleSetGrid selected, RuleSetDetailsView shows details of it.
    // - If not, RuleSetDetailsView hides.

    this.warningsContainer = document.createElement('div');
    this.warningsContainer.classList.add('flex-none');
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);

    this.ruleSetGrid.addEventListener('cellfocused', this.onRuleSetsGridCellFocused.bind(this));

    const onPrettyPrintToggle = (): void => {
      this.shouldPrettyPrint = !this.shouldPrettyPrint;
      this.updateRuleSetDetails();
    };

    LitHtml.render(
        LitHtml.html`
        <${SplitView.SplitView.SplitView.litTagName} .horizontal=${
            true} style="--min-sidebar-size: max(100vh-200px, 0px)">
          <div slot="main" class="overflow-auto" style="height: 100%">
            ${this.ruleSetGrid}
          </div>
          <div slot="sidebar" class="overflow-auto" style="height: 100%"
          jslog=${VisualLogging.section('rule-set-details')}>
            ${this.ruleSetDetails}
          </div>
        </${SplitView.SplitView.SplitView.litTagName}>
        <div class="pretty-print-button" style="border-top: 1px solid var(--sys-color-divider)">
        <${Buttons.Button.Button.litTagName}
          .iconName=${'brackets'}
          .toggledIconName=${'brackets'}
          .toggled=${this.shouldPrettyPrint}
          .toggleType=${Buttons.Button.ToggleType.PRIMARY}
          .title=${i18nString(UIStrings.prettyPrint)}
          .variant=${Buttons.Button.Variant.ICON_TOGGLE}
          .size=${Buttons.Button.Size.SMALL}
          @click=${onPrettyPrintToggle}
          jslog=${VisualLogging.action().track({click: true}).context('preloading-status-panel-pretty-print')}>
        </${Buttons.Button.Button.litTagName}>
        </div>
        `,
        this.contentElement, {host: this});
    this.hsplit = this.contentElement.querySelector('devtools-split-view') as SplitView.SplitView.SplitView;
  }

  override wasShown(): void {
    super.wasShown();

    this.registerCSSFiles([emptyWidgetStyles, preloadingViewStyles]);

    this.warningsView.wasShown();

    this.render();
  }

  onScopeChange(): void {
    const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);
    this.model = model;
    this.render();
  }

  revealRuleSet(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): void {
    this.focusedRuleSetId = revealInfo.ruleSetId;
    this.render();
  }

  private updateRuleSetDetails(): void {
    const id = this.focusedRuleSetId;
    const ruleSet = id === null ? null : this.model.getRuleSetById(id);
    this.ruleSetDetails.shouldPrettyPrint = this.shouldPrettyPrint;
    this.ruleSetDetails.data = ruleSet;

    if (ruleSet === null) {
      this.hsplit.style.setProperty('--current-main-area-size', '100%');
    } else {
      this.hsplit.style.setProperty('--current-main-area-size', '60%');
    }
  }

  render(): void {
    // Update rule sets grid
    const countsByRuleSetId = this.model.getPreloadCountsByRuleSetId();
    const ruleSetRows = this.model.getAllRuleSets().map(({id, value}) => {
      const countsByStatus = countsByRuleSetId.get(id) || new Map<SDK.PreloadingModel.PreloadingStatus, number>();
      return {
        ruleSet: value,
        preloadsStatusSummary: PreloadingUIUtils.preloadsStatusSummary(countsByStatus),
      };
    });
    this.ruleSetGrid.update({rows: ruleSetRows, pageURL: pageURL()});

    this.updateRuleSetDetails();
  }

  private onRuleSetsGridCellFocused(event: Event): void {
    const focusedEvent = event as DataGrid.DataGridEvents.BodyCellFocusedEvent;
    this.focusedRuleSetId =
        focusedEvent.data.row.cells.find(cell => cell.columnId === 'id')?.value as Protocol.Preload.RuleSetId;
    this.render();
  }

  getInfobarContainerForTest(): HTMLElement {
    return this.warningsView.contentElement;
  }

  getRuleSetGridForTest(): PreloadingComponents.RuleSetGrid.RuleSetGrid {
    return this.ruleSetGrid;
  }

  getRuleSetDetailsForTest(): PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView {
    return this.ruleSetDetails;
  }
}

export class PreloadingAttemptView extends UI.Widget.VBox {
  private model: SDK.PreloadingModel.PreloadingModel;
  private focusedPreloadingAttemptId: SDK.PreloadingModel.PreloadingAttemptId|null = null;

  private readonly warningsContainer: HTMLDivElement;
  private readonly warningsView = new PreloadingWarningsView();
  private readonly preloadingGrid = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  private readonly preloadingDetails =
      new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView();
  private readonly ruleSetSelector: PreloadingRuleSetSelector;

  constructor(model: SDK.PreloadingModel.PreloadingModel) {
    super(/* isWebComponent */ true, /* delegatesFocus */ false);

    this.element.setAttribute('jslog', `${VisualLogging.pane('preloading-speculations')}`);
    this.model = model;
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.MODEL_UPDATED, this.render, this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.WARNINGS_UPDATED,
        this.warningsView.onWarningsUpdated, this.warningsView, {scoped: true});

    // this (VBox)
    //   +- warningsContainer
    //        +- PreloadingWarningsView
    //   +- VBox
    //        +- toolbar (filtering)
    //        +- hsplit
    //             +- leftContainer
    //                  +- PreloadingGrid
    //             +- rightContainer
    //                  +- PreloadingDetailsReportView
    //
    // - If an row of PreloadingGrid selected, PreloadingDetailsReportView shows details of it.
    // - If not, PreloadingDetailsReportView shows some messages.

    this.warningsContainer = document.createElement('div');
    this.warningsContainer.classList.add('flex-none');
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);

    const vbox = new UI.Widget.VBox();

    const toolbar = new UI.Toolbar.Toolbar('preloading-toolbar', vbox.contentElement);
    toolbar.element.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    this.ruleSetSelector = new PreloadingRuleSetSelector(() => this.render());
    toolbar.appendToolbarItem(this.ruleSetSelector.item());

    this.preloadingGrid.addEventListener('cellfocused', this.onPreloadingGridCellFocused.bind(this));
    LitHtml.render(
        LitHtml.html`
        <${SplitView.SplitView.SplitView.litTagName} .horizontal=${true} style="--min-sidebar-size: 0px">
          <div slot="main" class="overflow-auto" style="height: 100%">
            ${this.preloadingGrid}
          </div>
          <div slot="sidebar" class="overflow-auto" style="height: 100%">
            ${this.preloadingDetails}
          </div>
        </${SplitView.SplitView.SplitView.litTagName}>`,
        vbox.contentElement, {host: this});

    vbox.show(this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();

    this.registerCSSFiles([emptyWidgetStyles, preloadingViewStyles]);

    this.warningsView.wasShown();

    this.render();
  }

  onScopeChange(): void {
    const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);
    this.model = model;
    this.render();
  }

  setFilter(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): void {
    let id: Protocol.Preload.RuleSetId|null = filter.ruleSetId;
    if (id !== null && this.model.getRuleSetById(id) === undefined) {
      id = null;
    }

    this.ruleSetSelector.select(id);
  }

  private updatePreloadingDetails(): void {
    const id = this.focusedPreloadingAttemptId;
    const preloadingAttempt = id === null ? null : this.model.getPreloadingAttemptById(id);
    if (preloadingAttempt === null) {
      this.preloadingDetails.data = null;
    } else {
      const ruleSets = preloadingAttempt.ruleSetIds.map(id => this.model.getRuleSetById(id)).filter(x => x !== null) as
          Protocol.Preload.RuleSet[];
      this.preloadingDetails.data = {
        preloadingAttempt,
        ruleSets,
        pageURL: pageURL(),
      };
    }
  }

  render(): void {
    // Update preloaidng grid
    const filteringRuleSetId = this.ruleSetSelector.getSelected();
    const rows = this.model.getPreloadingAttempts(filteringRuleSetId).map(({id, value}) => {
      const attempt = value;
      const ruleSets = attempt.ruleSetIds.flatMap(id => {
        const ruleSet = this.model.getRuleSetById(id);
        return ruleSet === null ? [] : [ruleSet];
      });
      return {
        id,
        attempt,
        ruleSets,
      };
    });
    this.preloadingGrid.update({rows, pageURL: pageURL()});

    this.updatePreloadingDetails();
  }

  private onPreloadingGridCellFocused(event: Event): void {
    const focusedEvent = event as DataGrid.DataGridEvents.BodyCellFocusedEvent;
    this.focusedPreloadingAttemptId = focusedEvent.data.row.cells.find(cell => cell.columnId === 'id')?.value as
        SDK.PreloadingModel.PreloadingAttemptId;
    this.render();
  }

  getRuleSetSelectorToolbarItemForTest(): UI.Toolbar.ToolbarItem {
    return this.ruleSetSelector.item();
  }

  getPreloadingGridForTest(): PreloadingComponents.PreloadingGrid.PreloadingGrid {
    return this.preloadingGrid;
  }

  getPreloadingDetailsForTest(): PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView {
    return this.preloadingDetails;
  }

  selectRuleSetOnFilterForTest(id: Protocol.Preload.RuleSetId|null): void {
    this.ruleSetSelector.select(id);
  }
}

export class PreloadingSummaryView extends UI.Widget.VBox {
  private model: SDK.PreloadingModel.PreloadingModel;

  private readonly warningsContainer: HTMLDivElement;
  private readonly warningsView = new PreloadingWarningsView();
  private readonly usedPreloading = new PreloadingComponents.UsedPreloadingView.UsedPreloadingView();

  constructor(model: SDK.PreloadingModel.PreloadingModel) {
    super(/* isWebComponent */ true, /* delegatesFocus */ false);

    this.element.setAttribute('jslog', `${VisualLogging.pane('speculative-loads')}`);
    this.model = model;
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.MODEL_UPDATED, this.render, this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.WARNINGS_UPDATED,
        this.warningsView.onWarningsUpdated, this.warningsView, {scoped: true});

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

    this.warningsView.wasShown();

    this.render();
  }

  onScopeChange(): void {
    const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);
    this.model = model;
    this.render();
  }

  render(): void {
    this.usedPreloading.data = {
      pageURL: SDK.TargetManager.TargetManager.instance().scopeTarget()?.inspectedURL() ||
          ('' as Platform.DevToolsPath.UrlString),
      previousAttempts: this.model.getPreloadingAttemptsOfPreviousPage().map(({value}) => value),
      currentAttempts: this.model.getPreloadingAttempts(null).map(({value}) => value),
    };
  }

  getUsedPreloadingForTest(): PreloadingComponents.UsedPreloadingView.UsedPreloadingView {
    return this.usedPreloading;
  }
}

class PreloadingRuleSetSelector implements
    UI.Toolbar.Provider, UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId> {
  private model: SDK.PreloadingModel.PreloadingModel;
  private readonly onSelectionChanged: () => void = () => {};

  private readonly toolbarItem: UI.Toolbar.ToolbarItem;

  private readonly listModel: UI.ListModel.ListModel<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>;
  private readonly dropDown: UI.SoftDropDown.SoftDropDown<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>;

  constructor(onSelectionChanged: () => void) {
    const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);
    this.model = model;
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.MODEL_UPDATED, this.onModelUpdated, this,
        {scoped: true});

    this.listModel = new UI.ListModel.ListModel();

    this.dropDown = new UI.SoftDropDown.SoftDropDown(this.listModel, this);
    this.dropDown.setRowHeight(36);
    this.dropDown.setPlaceholderText(i18nString(UIStrings.filterAllPreloads));

    this.toolbarItem = new UI.Toolbar.ToolbarItem(this.dropDown.element);
    this.toolbarItem.setTitle(i18nString(UIStrings.filterFilterByRuleSet));
    this.toolbarItem.element.classList.add('toolbar-has-dropdown');
    this.toolbarItem.element.setAttribute(
        'jslog', `${VisualLogging.action('filter-by-rule-set').track({click: true})}`);

    // Initializes `listModel` and `dropDown` using data of the model.
    this.onModelUpdated();

    // Prevents emitting onSelectionChanged on the first call of `this.onModelUpdated()` for initialization.
    this.onSelectionChanged = onSelectionChanged;
  }

  private onScopeChange(): void {
    const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);
    this.model = model;
    this.onModelUpdated();
  }

  private onModelUpdated(): void {
    const ids = this.model.getAllRuleSets().map(({id}) => id);
    const items = [AllRuleSetRootId, ...ids];
    const selected = this.dropDown.getSelectedItem();
    this.listModel.replaceAll(items);
    if (selected === null) {
      this.dropDown.selectItem(AllRuleSetRootId);
    } else {
      this.dropDown.selectItem(selected);
    }
    this.updateWidth(items);
  }

  // Updates the width for the DropDown element.
  private updateWidth(items: (Protocol.Preload.RuleSetId|typeof AllRuleSetRootId)[]): void {
    // Width set by `UI.SoftDropDown`.
    const DEFAULT_WIDTH = 315;
    const urlLengths = items.map(x => this.titleFor(x).length);
    const maxLength = Math.max(...urlLengths);
    const width = Math.min(maxLength * 6 + 16, DEFAULT_WIDTH);
    this.dropDown.setWidth(width);
  }

  // AllRuleSetRootId is used within the selector to indicate the root item. When interacting with PreloadingModel,
  // it should be translated to null.
  private translateItemIdToRuleSetId(id: Protocol.Preload.RuleSetId|typeof AllRuleSetRootId): Protocol.Preload.RuleSetId
      |null {
    if (id === AllRuleSetRootId) {
      return null;
    }
    return id as Protocol.Preload.RuleSetId;
  }

  getSelected(): Protocol.Preload.RuleSetId|null {
    const selectItem = this.dropDown.getSelectedItem();
    if (selectItem === null) {
      return null;
    }
    return this.translateItemIdToRuleSetId(selectItem);
  }

  select(id: Protocol.Preload.RuleSetId|null): void {
    this.dropDown.selectItem(id);
  }

  // Method for UI.Toolbar.Provider
  item(): UI.Toolbar.ToolbarItem {
    return this.toolbarItem;
  }

  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  titleFor(id: Protocol.Preload.RuleSetId|typeof AllRuleSetRootId): string {
    const convertedId = this.translateItemIdToRuleSetId(id);
    if (convertedId === null) {
      return i18nString(UIStrings.filterAllPreloads);
    }
    const ruleSet = this.model.getRuleSetById(convertedId);
    if (ruleSet === null) {
      return i18n.i18n.lockedString('Internal error');
    }
    return PreloadingUIUtils.ruleSetLocationShort(ruleSet, pageURL());
  }

  subtitleFor(id: Protocol.Preload.RuleSetId|typeof AllRuleSetRootId): string {
    const convertedId = this.translateItemIdToRuleSetId(id);
    const countsByStatus = this.model.getPreloadCountsByRuleSetId().get(convertedId) ||
        new Map<SDK.PreloadingModel.PreloadingStatus, number>();
    return PreloadingUIUtils.preloadsStatusSummary(countsByStatus) || `(${i18nString(UIStrings.noRuleSets)})`;
  }

  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  createElementForItem(id: Protocol.Preload.RuleSetId|typeof AllRuleSetRootId): Element {
    const element = document.createElement('div');
    const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(
        element, {cssFile: [preloadingViewDropDownStyles], delegatesFocus: undefined});
    const title = shadowRoot.createChild('div', 'title');
    UI.UIUtils.createTextChild(title, Platform.StringUtilities.trimEndWithMaxLength(this.titleFor(id), 100));
    const subTitle = shadowRoot.createChild('div', 'subtitle');
    UI.UIUtils.createTextChild(subTitle, this.subtitleFor(id));
    return element;
  }

  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  isItemSelectable(_id: Protocol.Preload.RuleSetId|typeof AllRuleSetRootId): boolean {
    return true;
  }

  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  itemSelected(_id: Protocol.Preload.RuleSetId|typeof AllRuleSetRootId): void {
    this.onSelectionChanged();
  }

  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  highlightedItemChanged(
      _from: Protocol.Preload.RuleSetId|typeof AllRuleSetRootId,
      _to: Protocol.Preload.RuleSetId|typeof AllRuleSetRootId, _fromElement: Element|null,
      _toElement: Element|null): void {
  }
}

export class PreloadingWarningsView extends UI.Widget.VBox {
  private readonly infobar = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar();

  constructor() {
    super(/* isWebComponent */ false, /* delegatesFocus */ false);
  }

  override wasShown(): void {
    super.wasShown();

    this.registerCSSFiles([emptyWidgetStyles]);

    this.contentElement.append(this.infobar);
  }

  onWarningsUpdated(args: Common.EventTarget.EventTargetEvent<Protocol.Preload.PreloadEnabledStateUpdatedEvent>): void {
    this.infobar.data = args.data;
  }
}
