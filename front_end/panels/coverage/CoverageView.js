// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, i18nTemplate as unboundI18nTemplate, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { CoverageDecorationManager } from './CoverageDecorationManager.js';
import { CoverageListView } from './CoverageListView.js';
import { CoverageModel, Events, SourceURLCoverageInfo, } from './CoverageModel.js';
import coverageViewStyles from './coverageView.css.js';
const UIStrings = {
    /**
     * @description Tooltip in Coverage List View of the Coverage tab for selecting JavaScript coverage mode
     */
    chooseCoverageGranularityPer: 'Choose coverage granularity: Per function has low overhead, per block has significant overhead.',
    /**
     * @description Text in Coverage List View of the Coverage tab
     */
    perFunction: 'Per function',
    /**
     * @description Text in Coverage List View of the Coverage tab
     */
    perBlock: 'Per block',
    /**
     * @description Text in Coverage View of the Coverage tab
     */
    filterByUrl: 'Filter by URL',
    /**
     * @description Label for the type filter in the Coverage Panel
     */
    filterCoverageByType: 'Filter coverage by type',
    /**
     * @description Text for everything
     */
    all: 'All',
    /**
     * @description Text that appears on a button for the css resource type filter.
     */
    css: 'CSS',
    /**
     * @description Text in Timeline Tree View of the Performance panel
     */
    javascript: 'JavaScript',
    /**
     * @description Tooltip text that appears on the setting when hovering over it in Coverage View of the Coverage tab
     */
    includeExtensionContentScripts: 'Include extension content scripts',
    /**
     * @description Title for a type of source files
     */
    contentScripts: 'Content scripts',
    /**
     * @description Message in Coverage View of the Coverage tab
     */
    noCoverageData: 'No coverage data',
    /**
     * @description Message in Coverage View of the Coverage tab
     */
    reloadPage: 'Reload page',
    /**
     * @description Message in Coverage View of the Coverage tab
     */
    startRecording: 'Start recording',
    /**
     * @description Message in Coverage View of the Coverage tab
     * @example {Reload page} PH1
     */
    clickTheReloadButtonSToReloadAnd: 'Click the "{PH1}" button to reload and start capturing coverage.',
    /**
     * @description Message in Coverage View of the Coverage tab
     * @example {Start recording} PH1
     */
    clickTheRecordButtonSToStart: 'Click the "{PH1}" button to start capturing coverage.',
    /**
     * @description Message in the Coverage View explaining that DevTools could not capture coverage.
     */
    bfcacheNoCapture: 'Could not capture coverage info because the page was served from the back/forward cache.',
    /**
     * @description  Message in the Coverage View explaining that DevTools could not capture coverage.
     */
    activationNoCapture: 'Could not capture coverage info because the page was prerendered in the background.',
    /**
     * @description  Message in the Coverage View prompting the user to reload the page.
     * @example {reload button icon} PH1
     */
    reloadPrompt: 'Click the reload button {PH1} to reload and get coverage.',
    /**
     * @description Footer message in Coverage View of the Coverage tab
     * @example {300k used, 600k unused} PH1
     * @example {500k used, 800k unused} PH2
     */
    filteredSTotalS: 'Filtered: {PH1}  Total: {PH2}',
    /**
     * @description Footer message in Coverage View of the Coverage tab
     * @example {1.5 MB} PH1
     * @example {2.1 MB} PH2
     * @example {71%} PH3
     * @example {29%} PH4
     */
    sOfSSUsedSoFarSUnused: '{PH1} of {PH2} ({PH3}%) used so far, {PH4} unused.',
};
const str_ = i18n.i18n.registerUIStrings('panels/coverage/CoverageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = unboundI18nTemplate.bind(undefined, str_);
const { ref } = Directives;
const { bindToAction, bindToSetting } = UI.UIUtils;
const { widgetConfig } = UI.Widget;
let coverageViewInstance;
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
      <style>${coverageViewStyles}</style>
      <div class="coverage-toolbar-container" jslog=${VisualLogging.toolbar()} role="toolbar">
        <devtools-toolbar class="coverage-toolbar" role="presentation" wrappable>
          <select title=${i18nString(UIStrings.chooseCoverageGranularityPer)}
              aria-label=${i18nString(UIStrings.chooseCoverageGranularityPer)}
              jslog=${VisualLogging.dropDown('coverage-type').track({ change: true })}
              @change=${(event) => input.onCoverageTypeChanged(event.target.selectedIndex)}
              .selectedIndex=${input.coverageType}
              ?disabled=${input.recording}>
            <option value=${2 /* CoverageType.JAVA_SCRIPT */ | 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */}
                    jslog=${VisualLogging.item(`${2 /* CoverageType.JAVA_SCRIPT */ | 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */}`).track({ click: true })}>
                 ${i18nString(UIStrings.perFunction)}
            </option>
            <option value=${2 /* CoverageType.JAVA_SCRIPT */}
                    jslog=${VisualLogging.item(`${2 /* CoverageType.JAVA_SCRIPT */}`).track({ click: true })}>
              ${i18nString(UIStrings.perBlock)}
            </option>
          </select>
          <devtools-button ${bindToAction(input.supportsRecordOnReload && !input.recording ?
        'coverage.start-with-reload' : 'coverage.toggle-recording')}>
          </devtools-button>
          <devtools-button ${bindToAction('coverage.clear')}></devtools-button>
          <div class="toolbar-divider"></div>
          <devtools-button ${bindToAction('coverage.export')}></devtools-button>
          <div class="toolbar-divider"></div>
          <devtools-toolbar-input type="filter" placeholder=${i18nString(UIStrings.filterByUrl)}
              ?disabled=${!Boolean(input.coverageInfo)}
               @change=${(e) => input.onFilterChanged(e.detail)}
               style="flex-grow:1; flex-shrink:1">
          </devtools-toolbar-input>
          <div class="toolbar-divider"></div>
          <select title=${i18nString(UIStrings.filterCoverageByType)}
              aria-label=${i18nString(UIStrings.filterCoverageByType)}
              jslog=${VisualLogging.dropDown('coverage-by-type').track({ change: true })}
              ?disabled=${!Boolean(input.coverageInfo)}
              @change=${(event) => input.onTypeFilterChanged(Number(event.target.selectedOptions[0]?.value))}>
            <option value="" jslog=${VisualLogging.item('').track({ click: true })}
                    .selected=${input.typeFilter === null}>${i18nString(UIStrings.all)}</option>
            <option value=${1 /* CoverageType.CSS */}
                    jslog=${VisualLogging.item(`${1 /* CoverageType.CSS */}`).track({ click: true })}
                    .selected=${input.typeFilter === 1 /* CoverageType.CSS */}>
              ${i18nString(UIStrings.css)}
            </option>
            <option value=${2 /* CoverageType.JAVA_SCRIPT */ | 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */}
                   jslog=${VisualLogging.item(`${2 /* CoverageType.JAVA_SCRIPT */ | 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */}`).track({ click: true })}
                   .selected=${(input.typeFilter !== null && Boolean(input.typeFilter & (2 /* CoverageType.JAVA_SCRIPT */ | 4 /* CoverageType.JAVA_SCRIPT_PER_FUNCTION */)))}>
              ${i18nString(UIStrings.javascript)}
            </option>
          </select>
          <div class="toolbar-divider"></div>
          <devtools-checkbox title=${i18nString(UIStrings.includeExtensionContentScripts)}
              ${bindToSetting(input.showContentScriptsSetting)}
              ?disabled=${!Boolean(input.coverageInfo)}>
            ${i18nString(UIStrings.contentScripts)}
          </devtools-checkbox>
        </devtools-toolbar>
      </div>
      <div class="coverage-results">
        ${input.needsReload ?
        renderReloadPromptPage(input.needsReload === 'bfcache-page' ?
            i18nString(UIStrings.bfcacheNoCapture) : i18nString(UIStrings.activationNoCapture), input.needsReload)
        : input.coverageInfo ? html `
          <devtools-widget autofocus class="results" .widgetConfig=${widgetConfig(CoverageListView, {
            coverageInfo: input.coverageInfo,
            highlightRegExp: input.textFilter,
            selectedUrl: input.selectedUrl,
        })}
            ${ref(e => { if (e instanceof HTMLElement) {
            output.focusResults = () => { e.focus(); };
        } })}>`
            : renderLandingPage(input.supportsRecordOnReload)}
      </div>
      <div class="coverage-toolbar-summary">
        <div class="coverage-message">
            ${input.statusMessage}
        </div>
    </div>`, target);
    // clang-format on
};
function renderLandingPage(supportsRecordOnReload) {
    if (supportsRecordOnReload) {
        // clang-format off
        return html `
      <devtools-widget .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
            header: i18nString(UIStrings.noCoverageData),
            link: 'https://developer.chrome.com/docs/devtools/coverage',
            text: i18nString(UIStrings.clickTheReloadButtonSToReloadAnd, { PH1: i18nString(UIStrings.reloadPage) }),
        })}>
        <devtools-button ${bindToAction('coverage.start-with-reload')}
                          .variant=${"tonal" /* Buttons.Button.Variant.TONAL */} .iconName=${undefined}>
          ${i18nString(UIStrings.reloadPage)}
        </devtools-button>
      </devtools-widget>`;
        // clang-format on
    }
    // clang-format off
    return html `
    <devtools-widget .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noCoverageData),
        link: 'https://developer.chrome.com/docs/devtools/coverage',
        text: i18nString(UIStrings.clickTheRecordButtonSToStart, { PH1: i18nString(UIStrings.startRecording) }),
    })}>
      <devtools-button ${bindToAction('coverage.toggle-recording')}
                       .variant=${"tonal" /* Buttons.Button.Variant.TONAL */} .iconName=${undefined}>
        ${i18nString(UIStrings.startRecording)}
      </devtools-button>
    </devtools-widget>`;
    // clang-format on
}
function renderReloadPromptPage(message, className) {
    // clang-format off
    return html `
    <div class="widget vbox ${className}">
      <div class="message">${message}</div>
      <span class="message">
        ${i18nTemplate(UIStrings.reloadPrompt, { PH1: html `
          <devtools-button class="inline-button" ${bindToAction('inspector-main.reload')}></devtools-button>` })}
      </span>
    </div>`;
    // clang-format on
}
export class CoverageView extends UI.Widget.VBox {
    #model;
    #decorationManager;
    #coverageTypeComboBoxSetting;
    #toggleRecordAction;
    #clearAction;
    #exportAction;
    #textFilter;
    #typeFilter;
    #showContentScriptsSetting;
    #view;
    #supportsRecordOnReload;
    #needsReload = null;
    #statusMessage = '';
    #output = { focusResults: () => { } };
    #coverageInfo = null;
    #selectedUrl = null;
    constructor(view = DEFAULT_VIEW) {
        super({
            jslog: `${VisualLogging.panel('coverage').track({ resize: true })}`,
            useShadowDom: true,
            delegatesFocus: true,
        });
        this.registerRequiredCSS(coverageViewStyles);
        this.#view = view;
        this.#model = null;
        this.#decorationManager = null;
        this.#coverageTypeComboBoxSetting =
            Common.Settings.Settings.instance().createSetting('coverage-view-coverage-type', 0);
        this.#toggleRecordAction = UI.ActionRegistry.ActionRegistry.instance().getAction('coverage.toggle-recording');
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        this.#supportsRecordOnReload = Boolean(mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel));
        this.#clearAction = UI.ActionRegistry.ActionRegistry.instance().getAction('coverage.clear');
        this.#clearAction.setEnabled(false);
        this.#exportAction = UI.ActionRegistry.ActionRegistry.instance().getAction('coverage.export');
        this.#exportAction.setEnabled(false);
        this.#textFilter = null;
        this.#typeFilter = null;
        this.#showContentScriptsSetting = Common.Settings.Settings.instance().createSetting('show-content-scripts', false);
        this.#showContentScriptsSetting.addChangeListener(this.#onFilterChanged, this);
        this.requestUpdate();
    }
    performUpdate() {
        const input = {
            coverageType: this.#coverageTypeComboBoxSetting.get(),
            recording: this.#toggleRecordAction.toggled(),
            supportsRecordOnReload: this.#supportsRecordOnReload,
            typeFilter: this.#typeFilter,
            showContentScriptsSetting: this.#showContentScriptsSetting,
            needsReload: this.#needsReload,
            coverageInfo: this.#coverageInfo,
            textFilter: this.#textFilter,
            selectedUrl: this.#selectedUrl,
            statusMessage: this.#statusMessage,
            onCoverageTypeChanged: this.#onCoverageTypeChanged.bind(this),
            onFilterChanged: (value) => {
                this.#textFilter = value ? Platform.StringUtilities.createPlainTextSearchRegex(value, 'i') : null;
                this.#onFilterChanged();
            },
            onTypeFilterChanged: this.#onTypeFilterChanged.bind(this),
        };
        this.#view(input, this.#output, this.contentElement);
    }
    static instance() {
        if (!coverageViewInstance) {
            coverageViewInstance = new CoverageView();
        }
        return coverageViewInstance;
    }
    static removeInstance() {
        coverageViewInstance = undefined;
    }
    clear() {
        if (this.#model) {
            this.#model.reset();
        }
        this.#reset();
    }
    #reset() {
        if (this.#decorationManager) {
            this.#decorationManager.dispose();
            this.#decorationManager = null;
        }
        this.#needsReload = null;
        this.#coverageInfo = null;
        this.#statusMessage = '';
        this.#exportAction.setEnabled(false);
        this.requestUpdate();
    }
    toggleRecording() {
        const enable = !this.#toggleRecordAction.toggled();
        if (enable) {
            void this.startRecording({ reload: false, jsCoveragePerBlock: this.isBlockCoverageSelected() });
        }
        else {
            void this.stopRecording();
        }
    }
    isBlockCoverageSelected() {
        // Check that Coverage.CoverageType.JavaScriptPerFunction is not present.
        return this.#coverageTypeComboBoxSetting.get() === 2 /* CoverageType.JAVA_SCRIPT */;
    }
    #selectCoverageType(jsCoveragePerBlock) {
        const selectedIndex = jsCoveragePerBlock ? 1 : 0;
        this.#coverageTypeComboBoxSetting.set(selectedIndex);
    }
    #onCoverageTypeChanged(newValue) {
        this.#coverageTypeComboBoxSetting.set(newValue);
    }
    async startRecording(options) {
        this.#reset();
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            return;
        }
        const { reload, jsCoveragePerBlock } = { reload: false, jsCoveragePerBlock: false, ...options };
        if (!this.#model || reload) {
            this.#model = mainTarget.model(CoverageModel);
        }
        if (!this.#model) {
            return;
        }
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStarted);
        if (jsCoveragePerBlock) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStartedPerBlock);
        }
        const success = await this.#model.start(Boolean(jsCoveragePerBlock));
        if (!success) {
            return;
        }
        this.#selectCoverageType(Boolean(jsCoveragePerBlock));
        this.#model.addEventListener(Events.CoverageUpdated, this.#onCoverageDataReceived, this);
        this.#model.addEventListener(Events.SourceMapResolved, this.#updateListView, this);
        const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
        this.#decorationManager = new CoverageDecorationManager(this.#model, Workspace.Workspace.WorkspaceImpl.instance(), Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(), Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance());
        this.#toggleRecordAction.setToggled(true);
        this.#clearAction.setEnabled(false);
        this.#coverageInfo = [];
        this.#needsReload = null;
        this.requestUpdate();
        await this.updateComplete;
        this.#output.focusResults();
        if (reload && resourceTreeModel) {
            resourceTreeModel.reloadPage();
        }
        else {
            void this.#model.startPolling();
        }
    }
    #onCoverageDataReceived(event) {
        const data = event.data;
        this.#updateViews(data);
    }
    #updateListView() {
        const entries = (this.#model?.entries() || [])
            .map(entry => this.#toCoverageListItem(entry))
            .filter(info => this.#isVisible(info))
            .map((entry) => ({ ...entry, sources: entry.sources.filter((entry) => this.#isVisible(entry)) }));
        this.#coverageInfo = entries;
    }
    #toCoverageListItem(info) {
        return {
            url: info.url(),
            type: info.type(),
            size: info.size(),
            usedSize: info.usedSize(),
            unusedSize: info.unusedSize(),
            usedPercentage: info.usedPercentage(),
            unusedPercentage: info.unusedPercentage(),
            sources: [...info.sourcesURLCoverageInfo.values()].map(this.#toCoverageListItem, this),
            isContentScript: info.isContentScript(),
            generatedUrl: info instanceof SourceURLCoverageInfo ? info.generatedURLCoverageInfo.url() : undefined,
        };
    }
    async stopRecording() {
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
        // Stopping the model triggers one last poll to get the final data.
        if (this.#model) {
            await this.#model.stop();
            this.#model.removeEventListener(Events.CoverageUpdated, this.#onCoverageDataReceived, this);
        }
        this.#toggleRecordAction.setToggled(false);
        this.#clearAction.setEnabled(true);
        this.requestUpdate();
    }
    async #onPrimaryPageChanged(event) {
        const frame = event.data.frame;
        const coverageModel = frame.resourceTreeModel().target().model(CoverageModel);
        if (!coverageModel) {
            return;
        }
        // If the primary page target has changed (due to MPArch activation), switch to new CoverageModel.
        if (this.#model !== coverageModel) {
            if (this.#model) {
                await this.#model.stop();
                this.#model.removeEventListener(Events.CoverageUpdated, this.#onCoverageDataReceived, this);
            }
            this.#model = coverageModel;
            const success = await this.#model.start(this.isBlockCoverageSelected());
            if (!success) {
                return;
            }
            this.#model.addEventListener(Events.CoverageUpdated, this.#onCoverageDataReceived, this);
            this.#decorationManager = new CoverageDecorationManager(this.#model, Workspace.Workspace.WorkspaceImpl.instance(), Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(), Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance());
        }
        if (event.data.type === "Activation" /* SDK.ResourceTreeModel.PrimaryPageChangeType.ACTIVATION */) {
            this.#needsReload = 'prerender-page';
        }
        else if (frame.backForwardCacheDetails.restoredFromCache) {
            this.#needsReload = 'bfcache-page';
        }
        else {
            this.#needsReload = null;
            this.#coverageInfo = [];
        }
        this.requestUpdate();
        this.#model.reset();
        this.#decorationManager?.reset();
        void this.#model.startPolling();
    }
    #updateViews(updatedEntries) {
        this.#updateStats();
        this.#updateListView();
        this.#exportAction.setEnabled(this.#model !== null && this.#model.entries().length > 0);
        this.#decorationManager?.update(updatedEntries);
        this.requestUpdate();
    }
    #updateStats() {
        const all = { total: 0, unused: 0 };
        const filtered = { total: 0, unused: 0 };
        const filterApplied = this.#textFilter !== null;
        if (this.#model) {
            for (const info of this.#model.entries()) {
                all.total += info.size();
                all.unused += info.unusedSize();
                const listItem = this.#toCoverageListItem(info);
                if (this.#isVisible(listItem)) {
                    if (this.#textFilter?.test(info.url())) {
                        filtered.total += info.size();
                        filtered.unused += info.unusedSize();
                    }
                    else {
                        // If it doesn't match the filter, calculate the stats from visible children if there are any
                        for (const childInfo of info.sourcesURLCoverageInfo.values()) {
                            if (this.#isVisible(this.#toCoverageListItem(childInfo))) {
                                filtered.total += childInfo.size();
                                filtered.unused += childInfo.unusedSize();
                            }
                        }
                    }
                }
            }
        }
        this.#statusMessage = filterApplied ?
            i18nString(UIStrings.filteredSTotalS, { PH1: formatStat(filtered), PH2: formatStat(all) }) :
            formatStat(all);
        function formatStat({ total, unused }) {
            const used = total - unused;
            const percentUsed = total ? Math.round(100 * used / total) : 0;
            return i18nString(UIStrings.sOfSSUsedSoFarSUnused, {
                PH1: i18n.ByteUtilities.bytesToString(used),
                PH2: i18n.ByteUtilities.bytesToString(total),
                PH3: percentUsed,
                PH4: i18n.ByteUtilities.bytesToString(unused),
            });
        }
    }
    #onFilterChanged() {
        this.#updateListView();
        this.#updateStats();
        this.requestUpdate();
    }
    #onTypeFilterChanged(typeFilter) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageReportFiltered);
        this.#typeFilter = typeFilter;
        this.#updateListView();
        this.#updateStats();
        this.requestUpdate();
    }
    #isVisible(coverageInfo) {
        const url = coverageInfo.url;
        if (url.startsWith(CoverageView.EXTENSION_BINDINGS_URL_PREFIX)) {
            return false;
        }
        if (coverageInfo.isContentScript && !this.#showContentScriptsSetting.get()) {
            return false;
        }
        if (this.#typeFilter && !(coverageInfo.type & this.#typeFilter)) {
            return false;
        }
        // If it's a parent, check if any children are visible
        if (coverageInfo.sources.length > 0) {
            for (const sourceURLCoverageInfo of coverageInfo.sources) {
                if (this.#isVisible(sourceURLCoverageInfo)) {
                    return true;
                }
            }
        }
        return !this.#textFilter || this.#textFilter.test(url);
    }
    async exportReport() {
        const fos = new Bindings.FileUtils.FileOutputStream();
        const fileName = `Coverage-${Platform.DateUtilities.toISO8601Compact(new Date())}.json`;
        const accepted = await fos.open(fileName);
        if (!accepted) {
            return;
        }
        this.#model && await this.#model.exportReport(fos);
    }
    selectCoverageItemByUrl(url) {
        this.#selectedUrl = url;
        this.requestUpdate();
    }
    static EXTENSION_BINDINGS_URL_PREFIX = 'extensions::';
    wasShown() {
        UI.Context.Context.instance().setFlavor(CoverageView, this);
        super.wasShown();
    }
    willHide() {
        super.willHide();
        UI.Context.Context.instance().setFlavor(CoverageView, null);
    }
    get model() {
        return this.#model;
    }
}
export class ActionDelegate {
    handleAction(_context, actionId) {
        const coverageViewId = 'coverage';
        void UI.ViewManager.ViewManager.instance()
            .showView(coverageViewId, /** userGesture= */ false, /** omitFocus= */ true)
            .then(() => {
            const view = UI.ViewManager.ViewManager.instance().view(coverageViewId);
            return view?.widget();
        })
            .then(widget => this.#handleAction(widget, actionId));
        return true;
    }
    #handleAction(coverageView, actionId) {
        switch (actionId) {
            case 'coverage.toggle-recording':
                coverageView.toggleRecording();
                break;
            case 'coverage.start-with-reload':
                void coverageView.startRecording({ reload: true, jsCoveragePerBlock: coverageView.isBlockCoverageSelected() });
                break;
            case 'coverage.clear':
                coverageView.clear();
                break;
            case 'coverage.export':
                void coverageView.exportReport();
                break;
            default:
                console.assert(false, `Unknown action: ${actionId}`);
        }
    }
}
//# sourceMappingURL=CoverageView.js.map