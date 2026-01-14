// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import '../../../ui/legacy/legacy.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
// eslint-disable-next-line @devtools/es-modules-import
import emptyWidgetStyles from '../../../ui/legacy/emptyWidget.css.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import * as PreloadingComponents from './components/components.js';
import {ruleSetTagOrLocationShort} from './components/PreloadingString.js';
import type * as PreloadingHelper from './helper/helper.js';
import preloadingViewStyles from './preloadingView.css.js';
import preloadingViewDropDownStyles from './preloadingViewDropDown.css.js';

const {createRef, ref} = Directives;

const UIStrings = {
  /**
   * @description DropDown title for filtering preloading attempts by rule set
   */
  filterFilterByRuleSet: 'Filter by rule set',
  /**
   * @description DropDown text for filtering preloading attempts by rule set: No filter
   */
  filterAllPreloads: 'All speculative loads',
  /**
   * @description Dropdown subtitle for filtering preloading attempts by rule set
   *             when there are no rule sets in the page.
   */
  noRuleSets: 'no rule sets',
  /**
   * @description Text in grid: Rule set is valid
   */
  validityValid: 'Valid',
  /**
   * @description Text in grid: Rule set must be a valid JSON object
   */
  validityInvalid: 'Invalid',
  /**
   * @description Text in grid: Rule set contains invalid rules and they are ignored
   */
  validitySomeRulesInvalid: 'Some rules invalid',
  /**
   * @description Text in grid and details: Preloading attempt is not yet triggered.
   */
  statusNotTriggered: 'Not triggered',
  /**
   * @description Text in grid and details: Preloading attempt is eligible but pending.
   */
  statusPending: 'Pending',
  /**
   * @description Text in grid and details: Preloading is running.
   */
  statusRunning: 'Running',
  /**
   * @description Text in grid and details: Preloading finished and the result is ready for the next navigation.
   */
  statusReady: 'Ready',
  /**
   * @description Text in grid and details: Ready, then used.
   */
  statusSuccess: 'Success',
  /**
   * @description Text in grid and details: Preloading failed.
   */
  statusFailure: 'Failure',
  /**
   * @description Text to pretty print a file
   */
  prettyPrint: 'Pretty print',
  /**
   * @description Placeholder text if there are no rules to show. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  noRulesDetected: 'No rules detected',
  /**
   * @description Placeholder text if there are no rules to show. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  rulesDescription: 'On this page you will see the speculation rules used to prefetch and prerender page navigations.',
  /**
   * @description Placeholder text if there are no speculation attempts for prefetching or prerendering urls. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  noPrefetchAttempts: 'No speculation detected',
  /**
   * @description Placeholder text if there are no speculation attempts for prefetching or prerendering urls. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  prefetchDescription: 'On this page you will see details on speculative loads.',
  /**
   * @description Text for a learn more link
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/PreloadingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const SPECULATION_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules' as
    Platform.DevToolsPath.UrlString;

// Used for selector, indicating no filter is specified.
const AllRuleSetRootId = Symbol('AllRuleSetRootId');

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
      case Protocol.Preload.RuleSetErrorType.InvalidRulesetLevelTag:
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

    throw new Error('unreachable');
  }

  static processLocalId(id: Protocol.Preload.RuleSetId): string {
    // RuleSetId is form of '<processId>.<processLocalId>'
    const index = id.indexOf('.');
    return index === -1 ? id : id.slice(index + 1);
  }
}

function pageURL(): Platform.DevToolsPath.UrlString {
  return SDK.TargetManager.TargetManager.instance().scopeTarget()?.inspectedURL() ||
      ('' as Platform.DevToolsPath.UrlString);
}

export class PreloadingRuleSetView extends UI.Widget.VBox {
  private model: SDK.PreloadingModel.PreloadingModel;
  private focusedRuleSetId: Protocol.Preload.RuleSetId|null = null;

  private readonly warningsContainer: HTMLDivElement;
  private readonly warningsView = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar();
  private readonly hsplit: HTMLElement;
  private readonly ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid();
  private readonly ruleSetGridContainerRef = createRef<HTMLDivElement>();
  private readonly ruleSetDetailsRef:
      Directives.Ref<UI.Widget.WidgetElement<PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView>>;

  private shouldPrettyPrint = Common.Settings.Settings.instance().moduleSetting('auto-pretty-print-minified').get();

  constructor(model: SDK.PreloadingModel.PreloadingModel) {
    super({useShadowDom: true});
    this.registerRequiredCSS(emptyWidgetStyles, preloadingViewStyles);

    this.model = model;
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.MODEL_UPDATED, this.render, this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.WARNINGS_UPDATED, e => {
          Object.assign(this.warningsView, e.data);
        }, this, {scoped: true});

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

    this.ruleSetGrid.addEventListener(
        PreloadingComponents.RuleSetGrid.Events.SELECT, this.onRuleSetsGridCellFocused, this);
    this.ruleSetDetailsRef =
        createRef<UI.Widget.WidgetElement<PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView>>();
    const onPrettyPrintToggle = (): void => {
      this.shouldPrettyPrint = !this.shouldPrettyPrint;
      this.updateRuleSetDetails();
    };

    // clang-format off
    render(
        html`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString(UIStrings.noRulesDetected)}</span>
          <div class="empty-state-description">
            <span>${i18nString(UIStrings.rulesDescription)}</span>
            <x-link
              class="x-link devtools-link"
              href=${SPECULATION_EXPLANATION_URL}
              jslog=${VisualLogging.link().track({click: true, keydown:'Enter|Space'}).context('learn-more')}
            >${i18nString(UIStrings.learnMore)}</x-link>
          </div>
        </div>
        <devtools-split-view sidebar-position="second">
          <div slot="main" ${ref(this.ruleSetGridContainerRef)}>
          </div>
          <div slot="sidebar" jslog=${VisualLogging.section('rule-set-details')}>
            <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView, {
              ruleSet: this.getRuleSet(),
              shouldPrettyPrint: this.shouldPrettyPrint,
            })} ${ref(this.ruleSetDetailsRef)}></devtools-widget>
          </div>
        </devtools-split-view>
        <div class="pretty-print-button" style="border-top: 1px solid var(--sys-color-divider)">
        <devtools-button
          .iconName=${'brackets'}
          .toggledIconName=${'brackets'}
          .toggled=${this.shouldPrettyPrint}
          .toggleType=${Buttons.Button.ToggleType.PRIMARY}
          .title=${i18nString(UIStrings.prettyPrint)}
          .variant=${Buttons.Button.Variant.ICON_TOGGLE}
          .size=${Buttons.Button.Size.REGULAR}
          @click=${onPrettyPrintToggle}
          jslog=${VisualLogging.action().track({click: true}).context('preloading-status-panel-pretty-print')}></devtools-button>
        </div>`,
        this.contentElement, {host: this});
    // clang-format on
    this.hsplit = this.contentElement.querySelector('devtools-split-view') as HTMLElement;
  }

  override wasShown(): void {
    super.wasShown();

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
    const ruleSet = this.getRuleSet();
    const widget = this.ruleSetDetailsRef.value?.getWidget();
    if (widget) {
      widget.shouldPrettyPrint = this.shouldPrettyPrint;
      widget.ruleSet = ruleSet;
    }

    if (ruleSet === null) {
      this.hsplit.setAttribute('sidebar-visibility', 'hidden');
    } else {
      this.hsplit.removeAttribute('sidebar-visibility');
    }
  }

  private getRuleSet(): Protocol.Preload.RuleSet|null {
    const id = this.focusedRuleSetId;
    return id === null ? null : this.model.getRuleSetById(id);
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
    this.ruleSetGrid.data = {rows: ruleSetRows, pageURL: pageURL()};
    this.contentElement.classList.toggle('empty', ruleSetRows.length === 0);
    this.updateRuleSetDetails();

    const container = this.ruleSetGridContainerRef.value;
    if (container && this.ruleSetGrid.element.parentElement !== container) {
      this.ruleSetGrid.show(container);
    }
  }

  private onRuleSetsGridCellFocused(event: Common.EventTarget.EventTargetEvent<Protocol.Preload.RuleSetId>): void {
    this.focusedRuleSetId = event.data;
    this.render();
  }

  getInfobarContainerForTest(): HTMLElement {
    return this.warningsView.contentElement;
  }

  getRuleSetGridForTest(): PreloadingComponents.RuleSetGrid.RuleSetGrid {
    return this.ruleSetGrid;
  }
}

export class PreloadingAttemptView extends UI.Widget.VBox {
  private model: SDK.PreloadingModel.PreloadingModel;
  // Note that we use id of (representative) preloading attempt while we show pipelines in grid.
  // This is because `NOT_TRIGGERED` preloading attempts don't have pipeline id and we can use it.
  private focusedPreloadingAttemptId: SDK.PreloadingModel.PreloadingAttemptId|null = null;

  private readonly warningsContainer: HTMLDivElement;
  private readonly warningsView = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar();
  private readonly preloadingGrid = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  private readonly preloadingDetails =
      new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView();
  private readonly ruleSetSelector: PreloadingRuleSetSelector;

  constructor(model: SDK.PreloadingModel.PreloadingModel) {
    super({
      jslog: `${VisualLogging.pane('preloading-speculations')}`,
      useShadowDom: true,
    });
    this.registerRequiredCSS(emptyWidgetStyles, preloadingViewStyles);

    this.model = model;
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.MODEL_UPDATED, this.render, this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.WARNINGS_UPDATED, e => {
          Object.assign(this.warningsView, e.data);
        }, this, {scoped: true});

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

    const toolbar = vbox.contentElement.createChild('devtools-toolbar', 'preloading-toolbar');
    toolbar.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    this.ruleSetSelector = new PreloadingRuleSetSelector(() => this.render());
    toolbar.appendToolbarItem(this.ruleSetSelector.item());

    this.preloadingGrid.onSelect = this.onPreloadingGridCellFocused.bind(this);

    const preloadingGridContainer = document.createElement('div');
    preloadingGridContainer.className = 'preloading-grid-widget-container';
    preloadingGridContainer.style = 'height: 100%';
    this.preloadingGrid.show(preloadingGridContainer, null, true);

    render(
        html`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString(UIStrings.noPrefetchAttempts)}</span>
          <div class="empty-state-description">
            <span>${i18nString(UIStrings.prefetchDescription)}</span>
            <x-link
              class="x-link devtools-link"
              href=${SPECULATION_EXPLANATION_URL}
              jslog=${VisualLogging.link().track({click: true, keydown: 'Enter|Space'}).context('learn-more')}
            >${i18nString(UIStrings.learnMore)}</x-link>
          </div>
        </div>
        <devtools-split-view sidebar-position="second">
          <div slot="main" class="overflow-auto" style="height: 100%">
            ${preloadingGridContainer}
          </div>
          <div slot="sidebar" class="overflow-auto" style="height: 100%">
            ${this.preloadingDetails}
          </div>
        </devtools-split-view>`,
        vbox.contentElement, {host: this});

    vbox.show(this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();

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
      const pipeline = this.model.getPipeline(preloadingAttempt);
      const ruleSets = preloadingAttempt.ruleSetIds.map(id => this.model.getRuleSetById(id)).filter(x => x !== null);
      this.preloadingDetails.data = {
        pipeline,
        ruleSets,
        pageURL: pageURL(),
      };
    }
  }

  render(): void {
    // Update preloading grid
    const filteringRuleSetId = this.ruleSetSelector.getSelected();
    const rows = this.model.getRepresentativePreloadingAttempts(filteringRuleSetId).map(({id, value}) => {
      const attempt = value;
      const pipeline = this.model.getPipeline(attempt);
      const ruleSets = attempt.ruleSetIds.flatMap(id => {
        const ruleSet = this.model.getRuleSetById(id);
        return ruleSet === null ? [] : [ruleSet];
      });
      return {
        id,
        pipeline,
        ruleSets,
      };
    });
    this.preloadingGrid.rows = rows;
    this.preloadingGrid.pageURL = pageURL();
    this.contentElement.classList.toggle('empty', rows.length === 0);

    this.updatePreloadingDetails();
  }

  private onPreloadingGridCellFocused({rowId}: {rowId: string}): void {
    this.focusedPreloadingAttemptId = rowId;
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
  private readonly warningsView = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar();
  private readonly usedPreloading = new PreloadingComponents.UsedPreloadingView.UsedPreloadingView();

  constructor(model: SDK.PreloadingModel.PreloadingModel) {
    super({
      jslog: `${VisualLogging.pane('speculative-loads')}`,
      useShadowDom: true,
    });
    this.registerRequiredCSS(emptyWidgetStyles, preloadingViewStyles);

    this.model = model;
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.MODEL_UPDATED, this.render, this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.PreloadingModel.PreloadingModel, SDK.PreloadingModel.Events.WARNINGS_UPDATED, e => {
          Object.assign(this.warningsView, e.data);
        }, this, {scoped: true});

    this.warningsContainer = document.createElement('div');
    this.warningsContainer.classList.add('flex-none');
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);

    this.usedPreloading.show(this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();

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
      previousAttempts: this.model.getRepresentativePreloadingAttemptsOfPreviousPage().map(({value}) => value),
      currentAttempts: this.model.getRepresentativePreloadingAttempts(null).map(({value}) => value),
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
    const items = [AllRuleSetRootId, ...ids] as [typeof AllRuleSetRootId, ...Protocol.Preload.RuleSetId[]];
    const selected = this.dropDown.getSelectedItem();
    // Use `AllRuleSetRootId` by default. For example, `selected` is null or has gone.
    const newSelected = (selected === null || !items.includes(selected)) ? AllRuleSetRootId : selected;
    this.listModel.replaceAll(items);
    this.dropDown.selectItem(newSelected);
    this.updateWidth(items);
  }

  // Updates the width for the DropDown element.
  private updateWidth(items: Array<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>): void {
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

    return ruleSetTagOrLocationShort(ruleSet, pageURL());
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
    const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(element, {cssFile: preloadingViewDropDownStyles});
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
