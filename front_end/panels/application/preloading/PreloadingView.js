// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/kit/kit.js';
import '../../../ui/legacy/legacy.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import { assertNotNullOrUndefined } from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import emptyWidgetStyles from '../../../ui/legacy/emptyWidget.css.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../../ui/lit/lit.js';
import * as SettingsUI from '../../../ui/settings/settings.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as PreloadingComponents from './components/components.js';
import * as PreloadingHelper from './helper/helper.js';
import preloadingViewStyles from './preloadingView.css.js';
import preloadingViewDropDownStyles from './preloadingViewDropDown.css.js';
const { live } = Directives;
const { widget, widgetRef } = UI.Widget;
const UIStrings = {
    /**
     * @description Tooltip for the filter by rule set dropdown in the speculative loads view.
     */
    filterFilterByRuleSet: 'Filter by rule set',
    /**
     * @description Dropdown text for filtering preloading attempts by rule set when no filter is applied.
     */
    filterAllPreloads: 'All speculative loads',
    /**
     * @description Dropdown subtitle for filtering preloading attempts by rule set when there are no rule sets on the page.
     */
    noRuleSets: 'no rule sets',
    /**
     * @description Status text in the rule sets table indicating the rule set is valid.
     */
    validityValid: 'Valid',
    /**
     * @description Status text in the rule sets table indicating the rule set is invalid.
     */
    validityInvalid: 'Invalid',
    /**
     * @description Status text in the rule sets table indicating some rules in the rule set are invalid and ignored.
     */
    validitySomeRulesInvalid: 'Some rules invalid',
    /**
     * @description Status text in the speculative loads table and details report indicating the preloading attempt is not yet triggered.
     */
    statusNotTriggered: 'Not triggered',
    /**
     * @description Status text in the speculative loads table and details report indicating the preloading attempt is eligible but pending.
     */
    statusPending: 'Pending',
    /**
     * @description Status text in the speculative loads table and details report indicating preloading is running.
     */
    statusRunning: 'Running',
    /**
     * @description Status text in the speculative loads table and details report indicating preloading finished and is ready for the next navigation.
     */
    statusReady: 'Ready',
    /**
     * @description Status text in the speculative loads table and details report indicating preloading was ready, then used.
     */
    statusSuccess: 'Success',
    /**
     * @description Status text in the speculative loads table and details report indicating preloading failed.
     */
    statusFailure: 'Failure',
    /**
     * @description Tooltip text for the button to pretty print the rule set source.
     */
    prettyPrint: 'Pretty print',
    /**
     * @description Empty state header in the speculation rules view when no rules are detected.
     */
    noRulesDetected: 'No rules detected',
    /**
     * @description Empty state description in the speculation rules view when no rules are detected.
     */
    rulesDescription: 'On this page you will see the speculation rules used to prefetch and prerender page navigations',
    /**
     * @description Empty state header in the speculative loads view when no speculation is detected.
     */
    noPrefetchAttempts: 'No speculation detected',
    /**
     * @description Empty state description in the speculative loads view when no speculation is detected.
     */
    prefetchDescription: 'On this page you will see details on speculative loads',
    /**
     * @description Link text to learn more about speculation rules.
     */
    learnMore: 'Learn more',
    /**
     * @description Tooltip text for the button to clear speculative loads.
     */
    clearSpeculativeLoads: 'Clear speculative loads',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/PreloadingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const SPECULATION_EXPLANATION_URL = 'https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules';
// Used for selector, indicating no filter is specified.
const AllRuleSetRootId = Symbol('AllRuleSetRootId');
class PreloadingUIUtils {
    static status(status) {
        // See content/public/browser/preloading.h PreloadingAttemptOutcome.
        switch (status) {
            case "NotTriggered" /* SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED */:
                return i18nString(UIStrings.statusNotTriggered);
            case "Pending" /* SDK.PreloadingModel.PreloadingStatus.PENDING */:
                return i18nString(UIStrings.statusPending);
            case "Running" /* SDK.PreloadingModel.PreloadingStatus.RUNNING */:
                return i18nString(UIStrings.statusRunning);
            case "Ready" /* SDK.PreloadingModel.PreloadingStatus.READY */:
                return i18nString(UIStrings.statusReady);
            case "Success" /* SDK.PreloadingModel.PreloadingStatus.SUCCESS */:
                return i18nString(UIStrings.statusSuccess);
            case "Failure" /* SDK.PreloadingModel.PreloadingStatus.FAILURE */:
                return i18nString(UIStrings.statusFailure);
            // NotSupported is used to handle unreachable case. For example,
            // there is no code path for
            // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
            // which is mapped to NotSupported. So, we regard it as an
            // internal error.
            case "NotSupported" /* SDK.PreloadingModel.PreloadingStatus.NOT_SUPPORTED */:
                return i18n.i18n.lockedString('Internal error');
        }
    }
    static preloadsStatusSummary(countsByStatus) {
        const LIST = [
            "NotTriggered" /* SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED */,
            "Pending" /* SDK.PreloadingModel.PreloadingStatus.PENDING */,
            "Running" /* SDK.PreloadingModel.PreloadingStatus.RUNNING */,
            "Ready" /* SDK.PreloadingModel.PreloadingStatus.READY */,
            "Success" /* SDK.PreloadingModel.PreloadingStatus.SUCCESS */,
            "Failure" /* SDK.PreloadingModel.PreloadingStatus.FAILURE */,
        ];
        return LIST.filter(status => (countsByStatus?.get(status) || 0) > 0)
            .map(status => (countsByStatus?.get(status) || 0) + ' ' + this.status(status))
            .join(', ')
            .toLocaleLowerCase();
    }
    // Summary of error of rule set shown in grid.
    static validity({ errorType }) {
        switch (errorType) {
            case undefined:
                return i18nString(UIStrings.validityValid);
            case "SourceIsNotJsonObject" /* Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject */:
            case "InvalidRulesetLevelTag" /* Protocol.Preload.RuleSetErrorType.InvalidRulesetLevelTag */:
                return i18nString(UIStrings.validityInvalid);
            case "InvalidRulesSkipped" /* Protocol.Preload.RuleSetErrorType.InvalidRulesSkipped */:
                return i18nString(UIStrings.validitySomeRulesInvalid);
        }
    }
    // Where a rule set came from, shown in grid.
    static location(ruleSet) {
        if (ruleSet.backendNodeId !== undefined) {
            return i18n.i18n.lockedString('<script>');
        }
        if (ruleSet.url !== undefined) {
            return ruleSet.url;
        }
        throw new Error('unreachable');
    }
    static processLocalId(id) {
        // RuleSetId is form of '<processId>.<processLocalId>'
        const index = id.indexOf('.');
        return index === -1 ? id : id.slice(index + 1);
    }
}
function pageURL() {
    return SDK.TargetManager.TargetManager.instance().scopeTarget()?.inspectedURL() ??
        Platform.DevToolsPath.EmptyUrlString;
}
function toPreloadingWarnings(event) {
    return {
        disabledByPreference: event.disabledByPreference,
        disabledByDataSaver: event.disabledByDataSaver,
        disabledByBatterySaver: event.disabledByBatterySaver,
        disabledByHoldbackPrefetchSpeculationRules: event.disabledByHoldbackPrefetchSpeculationRules,
        disabledByHoldbackPrerenderSpeculationRules: event.disabledByHoldbackPrerenderSpeculationRules,
    };
}
const RULE_SET_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
        <style>${emptyWidgetStyles}</style>
        <style>${preloadingViewStyles}</style>
        ${widget(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar, input.warnings)}
        <div class="empty-state">
          <span class="empty-state-header">${i18nString(UIStrings.noRulesDetected)}</span>
          <div class="empty-state-description">
            <span>${i18nString(UIStrings.rulesDescription)}</span>
            <devtools-link
              class="devtools-link"
              href=${SPECULATION_EXPLANATION_URL}
              jslogcontext="learn-more"
            >${i18nString(UIStrings.learnMore)}</devtools-link>
          </div>
        </div>
        <devtools-split-view sidebar-position="second" show=${input.ruleSet === null ? 'main' : 'both'}>
          <div slot="main">
            ${widget(PreloadingComponents.RuleSetGrid.RuleSetGrid, {
        data: { rows: input.rows, pageURL: input.pageURL },
        onSelect: input.onRuleSetSelected,
    })}
          </div>
          <div slot="sidebar" jslog=${VisualLogging.section('rule-set-details')}>
            ${widget(PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView, {
        ruleSet: input.ruleSet,
        shouldPrettyPrint: input.shouldPrettyPrint,
    })}
          </div>
        </devtools-split-view>
        <div class="pretty-print-button">
          <devtools-button
            .iconName=${'brackets'}
            .toggledIconName=${'brackets'}
            .toggled=${input.shouldPrettyPrint}
            .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
            .title=${i18nString(UIStrings.prettyPrint)}
            .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
            .size=${"REGULAR" /* Buttons.Button.Size.REGULAR */}
            .jslogContext=${'preloading-status-panel-pretty-print'}
            @click=${input.onPrettyPrintToggle}>
          </devtools-button>
        </div>
      `, target, { container: { classes: input.rows.length === 0 ? ['empty'] : [] } });
    // clang-format on
};
export class PreloadingRuleSetView extends UI.Widget.VBox {
    model;
    focusedRuleSetId = null;
    #view;
    #warnings;
    shouldPrettyPrint = Common.Settings.Settings.instance()
        .resolve(SettingsUI.SourcesSettings.autoPrettyPrintMinifiedSettingDescriptor)
        .get();
    #onRuleSetSelected = (id) => {
        this.focusedRuleSetId = id;
        this.requestUpdate();
    };
    #onPrettyPrintToggle = () => {
        this.shouldPrettyPrint = !this.shouldPrettyPrint;
        this.requestUpdate();
    };
    #onWarningsUpdated = (event) => {
        this.#warnings = toPreloadingWarnings(event.data);
        this.requestUpdate();
    };
    constructor(model, view = RULE_SET_DEFAULT_VIEW) {
        super({ useShadowDom: true });
        this.#view = view;
        this.model = model;
        SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    }
    wasShown() {
        super.wasShown();
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.PreloadingModel.PreloadingModel, "ModelUpdated" /* SDK.PreloadingModel.Events.MODEL_UPDATED */, this.requestUpdate, this, { scoped: true });
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.PreloadingModel.PreloadingModel, "WarningsUpdated" /* SDK.PreloadingModel.Events.WARNINGS_UPDATED */, this.#onWarningsUpdated, this, { scoped: true });
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.PreloadingModel.PreloadingModel, "ModelUpdated" /* SDK.PreloadingModel.Events.MODEL_UPDATED */, this.requestUpdate, this);
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.PreloadingModel.PreloadingModel, "WarningsUpdated" /* SDK.PreloadingModel.Events.WARNINGS_UPDATED */, this.#onWarningsUpdated, this);
    }
    onScopeChange() {
        const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
        assertNotNullOrUndefined(model);
        this.model = model;
        this.requestUpdate();
    }
    revealRuleSet(revealInfo) {
        this.focusedRuleSetId = revealInfo.ruleSetId;
        this.requestUpdate();
    }
    getRuleSet() {
        const id = this.focusedRuleSetId;
        return id === null ? null : this.model.getRuleSetById(id);
    }
    performUpdate() {
        const countsByRuleSetId = this.model.getPreloadCountsByRuleSetId();
        const rows = this.model.getAllRuleSets().map(({ id, value }) => {
            const countsByStatus = countsByRuleSetId.get(id) || new Map();
            return {
                ruleSet: value,
                preloadsStatusSummary: PreloadingUIUtils.preloadsStatusSummary(countsByStatus),
            };
        });
        const input = {
            warnings: this.#warnings,
            rows,
            pageURL: pageURL(),
            ruleSet: this.getRuleSet(),
            shouldPrettyPrint: this.shouldPrettyPrint,
            onRuleSetSelected: this.#onRuleSetSelected,
            onPrettyPrintToggle: this.#onPrettyPrintToggle,
        };
        this.#view(input, /* output= */ undefined, this.contentElement);
    }
}
/**
 * Pure filtering function for preloading grid rows.
 * Exported for testability.
 */
export function applyFilterText(filterText, rows) {
    const trimmedFilter = filterText.trim();
    if (trimmedFilter === '') {
        return rows;
    }
    const FILTER_KEYS = ['url', 'action', 'status'];
    const parser = new TextUtils.TextUtils.FilterParser([...FILTER_KEYS]);
    // The match is case-insensitive. We handle the matching with everything lower cased,
    // both keywords and values.
    const query = parser.parse(filterText.toLowerCase());
    // Drop the last term if it is an incomplete filter key (e.g., "action:" with no value).
    // FilterParser parses "action:" as plain text since KEY_VALUE_FILTER_REGEXP requires a value.
    // This lets users type "url:foo action:" and still see results for "url:foo".
    const lastTerm = query.at(-1);
    // If the parse result is empty, the query only contains spaces.
    if (!lastTerm) {
        return rows;
    }
    const isKeyWithNoValue = (lastTerm.key === undefined || lastTerm.key === null) && FILTER_KEYS.some(key => lastTerm.text === `${key}:`);
    if (isKeyWithNoValue) {
        query.pop();
    }
    if (query.length === 0) {
        return rows;
    }
    return rows.filter(row => {
        const attempt = row.pipeline.getOriginallyTriggered();
        const url = attempt.key.url.toLowerCase();
        const action = PreloadingComponents.PreloadingString
            .capitalizedAction(attempt.action)
            .toLowerCase();
        const status = PreloadingUIUtils.status(attempt.status).toLowerCase();
        // Each term must match (AND logic between terms)
        return query.every(term => {
            if (term.text === undefined || term.text === null || term.text === '') {
                return true;
            }
            const searchText = term.text.toLowerCase();
            // The query is lowercased before parsing, so keys are already normalized.
            const key = term.key;
            switch (key) {
                case 'url':
                    return url.includes(searchText);
                case 'action':
                    return action.includes(searchText);
                case 'status': {
                    // Support multiple status values separated by comma (e.g., "status:ready,success")
                    const statusValues = searchText.split(',');
                    return statusValues.some(v => status.includes(v));
                }
                case undefined:
                    // No key specified: search across all columns (URL, action, status)
                    return url.includes(searchText) || action.includes(searchText) || status.includes(searchText);
                default:
                    return false;
            }
        });
    });
}
const ATTEMPT_DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
        <style>${emptyWidgetStyles}</style>
        <style>${preloadingViewStyles}</style>
        ${widget(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar, input.warnings)}
        <devtools-toolbar class="preloading-toolbar" jslog=${VisualLogging.toolbar()}>
          ${input.ruleSetSelectorToolbarItem.element}
          <devtools-toolbar-input
            type="filter"
            .value=${live(input.filterText)}
            @change=${(e) => input.onFilterChanged(e.detail)}>
          </devtools-toolbar-input>
          <div class="toolbar-divider"></div>
          <devtools-button
            title=${i18nString(UIStrings.clearSpeculativeLoads)}
            aria-label=${i18nString(UIStrings.clearSpeculativeLoads)}
            .iconName=${'clear'}
            .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
            .jslogContext=${'clear-speculative-loads'}
            @click=${input.onClear}>
          </devtools-button>
        </devtools-toolbar>
        <div class="empty-state">
          <span class="empty-state-header">${i18nString(UIStrings.noPrefetchAttempts)}</span>
          <div class="empty-state-description">
            <span>${i18nString(UIStrings.prefetchDescription)}</span>
            <devtools-link
              class="devtools-link"
              href=${SPECULATION_EXPLANATION_URL}
              jslogcontext="learn-more"
            >${i18nString(UIStrings.learnMore)}</devtools-link>
          </div>
        </div>
        <devtools-split-view sidebar-position="second" ${widgetRef(UI.SplitWidget.SplitWidget, w => {
        output.doSplitWidgetLayout = () => w.doLayout();
    })}>
          <div slot="main" class="overflow-auto">
            ${widget(PreloadingComponents.PreloadingGrid.PreloadingGrid, {
        rows: input.rows,
        pageURL: input.pageURL,
        onSelect: input.onAttemptSelected,
    })}
          </div>
          <div slot="sidebar" class="overflow-auto">
            ${widget(PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView, {
        data: input.details,
    })}
          </div>
        </devtools-split-view>
      `, target, { container: { classes: input.isEmpty ? ['empty'] : [] } });
    // clang-format on
};
export class PreloadingAttemptView extends UI.Widget.VBox {
    model;
    // Note that we use id of (representative) preloading attempt while we show pipelines in grid.
    // This is because `NOT_TRIGGERED` preloading attempts don't have pipeline id and we can use it.
    focusedPreloadingAttemptId = null;
    #view;
    #viewOutput = {};
    #ruleSetSelector;
    #warnings;
    #filterText = '';
    #onFilterChanged = (filterText) => {
        this.#filterText = filterText;
        this.requestUpdate();
    };
    #onClear = () => {
        const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
        if (!model) {
            return;
        }
        model.reset();
        this.#filterText = '';
        this.#ruleSetSelector.select(null);
        this.requestUpdate();
    };
    #onAttemptSelected = ({ rowId }) => {
        this.focusedPreloadingAttemptId = rowId;
        this.requestUpdate();
    };
    #onWarningsUpdated = (event) => {
        this.#warnings = toPreloadingWarnings(event.data);
        this.requestUpdate();
    };
    constructor(model, view = ATTEMPT_DEFAULT_VIEW) {
        super({
            jslog: `${VisualLogging.pane('preloading-speculations')}`,
            useShadowDom: true,
        });
        this.#view = view;
        this.model = model;
        SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
        this.#ruleSetSelector = new PreloadingRuleSetSelector(() => this.requestUpdate());
    }
    wasShown() {
        super.wasShown();
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.PreloadingModel.PreloadingModel, "ModelUpdated" /* SDK.PreloadingModel.Events.MODEL_UPDATED */, this.requestUpdate, this, { scoped: true });
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.PreloadingModel.PreloadingModel, "WarningsUpdated" /* SDK.PreloadingModel.Events.WARNINGS_UPDATED */, this.#onWarningsUpdated, this, { scoped: true });
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.PreloadingModel.PreloadingModel, "ModelUpdated" /* SDK.PreloadingModel.Events.MODEL_UPDATED */, this.requestUpdate, this);
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.PreloadingModel.PreloadingModel, "WarningsUpdated" /* SDK.PreloadingModel.Events.WARNINGS_UPDATED */, this.#onWarningsUpdated, this);
    }
    onScopeChange() {
        const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
        assertNotNullOrUndefined(model);
        this.model = model;
        this.requestUpdate();
    }
    setFilter(filter) {
        let id = filter.ruleSetId;
        if (id !== null && this.model.getRuleSetById(id) === undefined) {
            id = null;
        }
        this.#ruleSetSelector.select(id);
        // Reset text filter when navigating from Rules view to clear any existing filter
        this.#filterText = '';
        this.requestUpdate();
    }
    getPreloadingDetailsData() {
        const id = this.focusedPreloadingAttemptId;
        const preloadingAttempt = id === null ? null : this.model.getPreloadingAttemptById(id);
        if (preloadingAttempt === null) {
            return null;
        }
        const pipeline = this.model.getPipeline(preloadingAttempt);
        const ruleSets = preloadingAttempt.ruleSetIds.map(id => this.model.getRuleSetById(id)).filter(x => x !== null);
        return {
            pipeline,
            ruleSets,
            pageURL: pageURL(),
        };
    }
    performUpdate() {
        // Update preloading grid
        const filteringRuleSetId = this.#ruleSetSelector.getSelected();
        const rows = this.model.getRepresentativePreloadingAttempts(filteringRuleSetId).map(({ id, value }) => {
            const attempt = value;
            const pipeline = this.model.getPipeline(attempt);
            const ruleSets = attempt.ruleSetIds.flatMap(id => {
                const ruleSet = this.model.getRuleSetById(id);
                return ruleSet === null ? [] : [ruleSet];
            });
            // Lookup status code from the network log for display in the grid.
            const statusCode = PreloadingHelper.PreloadingForward.preloadStatusCode(attempt);
            return {
                id,
                pipeline,
                ruleSets,
                statusCode,
            };
        });
        // Only show empty state when there are truly no speculations (not when filter has no matches)
        const isEmpty = rows.length === 0;
        const input = {
            warnings: this.#warnings,
            rows: applyFilterText(this.#filterText, rows),
            isEmpty,
            pageURL: pageURL(),
            details: this.getPreloadingDetailsData(),
            ruleSetSelectorToolbarItem: this.#ruleSetSelector.item(),
            filterText: this.#filterText,
            onFilterChanged: this.#onFilterChanged,
            onClear: this.#onClear,
            onAttemptSelected: this.#onAttemptSelected,
        };
        this.#view(input, this.#viewOutput, this.contentElement);
        // When this view starts empty, the split view gets laid out while hidden and collapses
        // its sidebar to 0. Re-layout once it becomes visible.
        if (!isEmpty) {
            this.#viewOutput.doSplitWidgetLayout?.();
        }
    }
    getRuleSetSelectorToolbarItemForTest() {
        return this.#ruleSetSelector.item();
    }
    selectRuleSetOnFilterForTest(id) {
        this.#ruleSetSelector.select(id);
    }
}
const SUMMARY_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
        ${widget(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar, input.warnings)}
        ${widget(PreloadingComponents.UsedPreloadingView.UsedPreloadingView, { data: input.usedPreloading })}
      `, target);
    // clang-format on
};
export class PreloadingSummaryView extends UI.Widget.VBox {
    model;
    #view;
    #warnings;
    #onWarningsUpdated = (event) => {
        this.#warnings = toPreloadingWarnings(event.data);
        this.requestUpdate();
    };
    constructor(model, view = SUMMARY_DEFAULT_VIEW) {
        super({
            jslog: `${VisualLogging.pane('speculative-loads')}`,
            useShadowDom: true,
        });
        this.#view = view;
        this.model = model;
        SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    }
    wasShown() {
        super.wasShown();
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.PreloadingModel.PreloadingModel, "ModelUpdated" /* SDK.PreloadingModel.Events.MODEL_UPDATED */, this.requestUpdate, this, { scoped: true });
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.PreloadingModel.PreloadingModel, "WarningsUpdated" /* SDK.PreloadingModel.Events.WARNINGS_UPDATED */, this.#onWarningsUpdated, this, { scoped: true });
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.PreloadingModel.PreloadingModel, "ModelUpdated" /* SDK.PreloadingModel.Events.MODEL_UPDATED */, this.requestUpdate, this);
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.PreloadingModel.PreloadingModel, "WarningsUpdated" /* SDK.PreloadingModel.Events.WARNINGS_UPDATED */, this.#onWarningsUpdated, this);
    }
    onScopeChange() {
        const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
        assertNotNullOrUndefined(model);
        this.model = model;
        this.requestUpdate();
    }
    performUpdate() {
        const input = {
            warnings: this.#warnings,
            usedPreloading: {
                pageURL: pageURL(),
                previousAttempts: this.model.getRepresentativePreloadingAttemptsOfPreviousPage().map(({ value }) => value),
                currentAttempts: this.model.getRepresentativePreloadingAttempts(null).map(({ value }) => value),
            },
        };
        this.#view(input, /* output= */ undefined, this.contentElement);
    }
}
class PreloadingRuleSetSelector {
    model;
    onSelectionChanged = () => { };
    toolbarItem;
    listModel;
    dropDown;
    constructor(onSelectionChanged) {
        const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
        assertNotNullOrUndefined(model);
        this.model = model;
        SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.PreloadingModel.PreloadingModel, "ModelUpdated" /* SDK.PreloadingModel.Events.MODEL_UPDATED */, this.onModelUpdated, this, { scoped: true });
        this.listModel = new UI.ListModel.ListModel();
        this.dropDown = new UI.SoftDropDown.SoftDropDown(this.listModel, this);
        this.dropDown.setRowHeight(36);
        this.dropDown.setPlaceholderText(i18nString(UIStrings.filterAllPreloads));
        this.toolbarItem = new UI.Toolbar.ToolbarItem(this.dropDown.element);
        this.toolbarItem.setTitle(i18nString(UIStrings.filterFilterByRuleSet));
        this.toolbarItem.element.classList.add('toolbar-has-dropdown');
        this.toolbarItem.element.setAttribute('jslog', `${VisualLogging.action('filter-by-rule-set').track({ click: true })}`);
        // Initializes `listModel` and `dropDown` using data of the model.
        this.onModelUpdated();
        // Prevents emitting onSelectionChanged on the first call of `this.onModelUpdated()` for initialization.
        this.onSelectionChanged = onSelectionChanged;
    }
    onScopeChange() {
        const model = SDK.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK.PreloadingModel.PreloadingModel);
        assertNotNullOrUndefined(model);
        this.model = model;
        this.onModelUpdated();
    }
    onModelUpdated() {
        const ids = this.model.getAllRuleSets().map(({ id }) => id);
        const items = [AllRuleSetRootId, ...ids];
        const selected = this.dropDown.getSelectedItem();
        // Use `AllRuleSetRootId` by default. For example, `selected` is null or has gone.
        const newSelected = (selected === null || !items.includes(selected)) ? AllRuleSetRootId : selected;
        this.listModel.replaceAll(items);
        this.dropDown.selectItem(newSelected);
        this.updateWidth(items);
    }
    // Updates the width for the DropDown element.
    updateWidth(items) {
        // Width set by `UI.SoftDropDown`.
        const DEFAULT_WIDTH = 315;
        const urlLengths = items.map(x => this.titleFor(x).length);
        const maxLength = Math.max(...urlLengths);
        const width = Math.min(maxLength * 6 + 16, DEFAULT_WIDTH);
        this.dropDown.setWidth(width);
    }
    // AllRuleSetRootId is used within the selector to indicate the root item. When interacting with PreloadingModel,
    // it should be translated to null.
    translateItemIdToRuleSetId(id) {
        if (id === AllRuleSetRootId) {
            return null;
        }
        return id;
    }
    getSelected() {
        const selectItem = this.dropDown.getSelectedItem();
        if (selectItem === null) {
            return null;
        }
        return this.translateItemIdToRuleSetId(selectItem);
    }
    select(id) {
        this.dropDown.selectItem(id);
    }
    // Method for UI.Toolbar.Provider
    item() {
        return this.toolbarItem;
    }
    // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
    titleFor(id) {
        const convertedId = this.translateItemIdToRuleSetId(id);
        if (convertedId === null) {
            return i18nString(UIStrings.filterAllPreloads);
        }
        const ruleSet = this.model.getRuleSetById(convertedId);
        if (ruleSet === null) {
            return i18n.i18n.lockedString('Internal error');
        }
        return PreloadingComponents.PreloadingString.ruleSetTagOrLocationShort(ruleSet, pageURL());
    }
    subtitleFor(id) {
        const convertedId = this.translateItemIdToRuleSetId(id);
        const countsByStatus = this.model.getPreloadCountsByRuleSetId().get(convertedId) ||
            new Map();
        return PreloadingUIUtils.preloadsStatusSummary(countsByStatus) || `(${i18nString(UIStrings.noRuleSets)})`;
    }
    // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
    createElementForItem(id) {
        const selectorElement = new PreloadingRuleSetSelectorElement(this.titleFor(id), this.subtitleFor(id));
        return selectorElement.contentElement;
    }
    // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
    isItemSelectable(_id) {
        return true;
    }
    // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
    itemSelected(_id) {
        this.onSelectionChanged();
    }
    // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
    highlightedItemChanged(_from, _to, _fromElement, _toElement) {
    }
}
const RULE_SET_SELECTOR_ELEMENT_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
        <style>${preloadingViewDropDownStyles}</style>
        <div class="title">${Platform.StringUtilities.trimEndWithMaxLength(input.title, 100)}</div>
        <div class="subtitle">${input.subtitle}</div>
      `, target);
    // clang-format on
};
class PreloadingRuleSetSelectorElement extends UI.Widget.Widget {
    #title;
    #subtitle;
    #view;
    constructor(title, subtitle, view = RULE_SET_SELECTOR_ELEMENT_DEFAULT_VIEW) {
        super({ useShadowDom: true });
        this.markAsExternallyManaged();
        this.#title = title;
        this.#subtitle = subtitle;
        this.#view = view;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({ title: this.#title, subtitle: this.#subtitle }, /* output= */ undefined, this.contentElement);
    }
}
//# sourceMappingURL=PreloadingView.js.map