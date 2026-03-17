// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { Events, LighthouseController } from './LighthouseController.js';
import lighthousePanelStyles from './lighthousePanel.css.js';
import { ProtocolService } from './LighthouseProtocolService.js';
import { LighthouseReportRenderer } from './LighthouseReportRenderer.js';
import { Item, ReportSelector } from './LighthouseReportSelector.js';
import { StartView } from './LighthouseStartView.js';
import { StatusView } from './LighthouseStatusView.js';
import { TimespanView } from './LighthouseTimespanView.js';
const UIStrings = {
    /**
     * @description Text that appears when user drag and drop something (for example, a file) in Lighthouse Panel
     */
    dropLighthouseJsonHere: 'Drop `Lighthouse` JSON here',
    /**
     * @description Tooltip text that appears when hovering over the largeicon add button in the Lighthouse Panel
     */
    performAnAudit: 'Perform an audit…',
    /**
     * @description Text to clear everything
     */
    clearAll: 'Clear all',
    /**
     * @description Tooltip text that appears when hovering over the largeicon settings gear in show settings pane setting in start view of the audits panel
     */
    lighthouseSettings: '`Lighthouse` settings',
    /**
     * @description Status header in the Lighthouse panel
     */
    printing: 'Printing',
    /**
     * @description Status text in the Lighthouse panel
     */
    thePrintPopupWindowIsOpenPlease: 'The print popup window is open. Please close it to continue.',
    /**
     * @description Text in Lighthouse Panel
     */
    cancelling: 'Cancelling',
};
const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthousePanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let lighthousePanelInstace;
export class ActiveLighthouseReport {
    report;
    constructor(report) {
        this.report = report;
    }
}
export class LighthousePanel extends UI.Panel.Panel {
    controller;
    startView;
    statusView;
    timespanView;
    warningText;
    unauditableExplanation;
    cachedRenderedReports;
    auditResultsElement;
    clearButton;
    newButton;
    reportSelector;
    settingsPane;
    rightToolbar;
    showSettingsPaneSetting;
    constructor(controller) {
        super('lighthouse');
        this.registerRequiredCSS(lighthousePanelStyles);
        this.controller = controller;
        this.startView = new StartView(this.controller, this);
        this.timespanView = new TimespanView(this);
        this.statusView = new StatusView(this);
        this.warningText = null;
        this.unauditableExplanation = null;
        this.cachedRenderedReports = new Map();
        new UI.DropTarget.DropTarget(this.contentElement, [UI.DropTarget.Type.File], i18nString(UIStrings.dropLighthouseJsonHere), this.handleDrop.bind(this));
        this.controller.addEventListener(Events.PageAuditabilityChanged, this.refreshStartAuditUI.bind(this));
        this.controller.addEventListener(Events.PageWarningsChanged, this.refreshWarningsUI.bind(this));
        this.controller.addEventListener(Events.AuditProgressChanged, this.refreshStatusUI.bind(this));
        this.renderToolbar();
        this.auditResultsElement = this.contentElement.createChild('div', 'lighthouse-results-container');
        this.auditResultsElement.addEventListener('keydown', this.onKeyDown.bind(this));
        this.renderStartView();
        this.controller.recomputePageAuditability();
        UI.Context.Context.instance().setFlavor(ActiveLighthouseReport, null);
    }
    static instance(opts) {
        if (!lighthousePanelInstace || opts?.forceNew) {
            const protocolService = opts?.protocolService ?? new ProtocolService();
            const controller = opts?.controller ?? new LighthouseController(protocolService);
            lighthousePanelInstace = new LighthousePanel(controller);
        }
        return lighthousePanelInstace;
    }
    static getEvents() {
        return Events;
    }
    async handleTimespanStart() {
        try {
            this.timespanView.show(this.contentElement);
            await this.controller.startLighthouse();
            this.timespanView.ready();
        }
        catch (err) {
            this.handleError(err);
        }
    }
    async handleTimespanEnd() {
        try {
            this.timespanView.hide();
            this.renderStatusView();
            const { lhr, artifacts } = await this.controller.collectLighthouseResults();
            this.buildReportUI(lhr, artifacts);
        }
        catch (err) {
            this.handleError(err);
        }
    }
    async handleCompleteRun(overrides) {
        try {
            await this.controller.startLighthouse(overrides);
            this.renderStatusView();
            const { lhr, artifacts } = await this.controller.collectLighthouseResults();
            this.buildReportUI(lhr, artifacts);
            UI.Context.Context.instance().setFlavor(ActiveLighthouseReport, new ActiveLighthouseReport(lhr));
            return { report: lhr };
        }
        catch (err) {
            this.handleError(err);
            UI.Context.Context.instance().setFlavor(ActiveLighthouseReport, null);
            return { report: null };
        }
    }
    async handleRunCancel() {
        this.statusView.updateStatus(i18nString(UIStrings.cancelling));
        this.timespanView.hide();
        await this.controller.cancelLighthouse();
        this.renderStartView();
    }
    handleError(err) {
        if (err instanceof Error) {
            this.statusView.renderBugReport(err);
        }
    }
    refreshWarningsUI(evt) {
        // PageWarningsChanged fires multiple times during an audit, which we want to ignore.
        if (this.controller.getCurrentRun()) {
            return;
        }
        this.warningText = evt.data.warning;
        this.startView.setWarningText(evt.data.warning);
    }
    refreshStartAuditUI(evt) {
        // PageAuditabilityChanged fires multiple times during an audit, which we want to ignore.
        if (this.controller.getCurrentRun()) {
            return;
        }
        this.startView.refresh();
        this.unauditableExplanation = evt.data.helpText;
        this.startView.setUnauditableExplanation(evt.data.helpText);
        this.startView.setStartButtonEnabled(!evt.data.helpText);
    }
    refreshStatusUI(evt) {
        this.statusView.updateStatus(evt.data.message);
    }
    refreshToolbarUI() {
        this.clearButton.setEnabled(this.reportSelector.hasItems());
    }
    clearAll() {
        this.reportSelector.clearAll();
        this.renderStartView();
        this.refreshToolbarUI();
    }
    renderToolbar() {
        const lighthouseToolbarContainer = this.element.createChild('div', 'lighthouse-toolbar-container');
        lighthouseToolbarContainer.setAttribute('jslog', `${VisualLogging.toolbar()}`);
        lighthouseToolbarContainer.role = 'toolbar';
        const toolbar = lighthouseToolbarContainer.createChild('devtools-toolbar');
        toolbar.role = 'presentation';
        this.newButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.performAnAudit), 'plus');
        toolbar.appendToolbarItem(this.newButton);
        this.newButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.renderStartView.bind(this));
        toolbar.appendSeparator();
        this.reportSelector = new ReportSelector(() => this.renderStartView());
        toolbar.appendToolbarItem(this.reportSelector.comboBox());
        this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'clear');
        toolbar.appendToolbarItem(this.clearButton);
        this.clearButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.clearAll.bind(this));
        this.settingsPane = new UI.Widget.HBox();
        this.settingsPane.show(this.contentElement);
        this.settingsPane.element.classList.add('lighthouse-settings-pane');
        this.settingsPane.element.appendChild(this.startView.settingsToolbar());
        this.showSettingsPaneSetting = Common.Settings.Settings.instance().createSetting('lighthouse-show-settings-toolbar', false, "Synced" /* Common.Settings.SettingStorageType.SYNCED */);
        this.rightToolbar = lighthouseToolbarContainer.createChild('devtools-toolbar');
        this.rightToolbar.role = 'presentation';
        this.rightToolbar.appendSeparator();
        this.rightToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingToggle(this.showSettingsPaneSetting, 'gear', i18nString(UIStrings.lighthouseSettings), 'gear-filled'));
        this.showSettingsPaneSetting.addChangeListener(this.updateSettingsPaneVisibility.bind(this));
        this.updateSettingsPaneVisibility();
        this.refreshToolbarUI();
    }
    updateSettingsPaneVisibility() {
        this.settingsPane.element.classList.toggle('hidden', !this.showSettingsPaneSetting.get());
    }
    toggleSettingsDisplay(show) {
        this.rightToolbar.classList.toggle('hidden', !show);
        this.settingsPane.element.classList.toggle('hidden', !show);
        this.updateSettingsPaneVisibility();
    }
    renderStartView() {
        this.auditResultsElement.removeChildren();
        this.statusView.hide();
        this.reportSelector.selectNewReport();
        this.contentElement.classList.toggle('in-progress', false);
        this.startView.show(this.contentElement);
        this.toggleSettingsDisplay(true);
        this.startView.setUnauditableExplanation(this.unauditableExplanation);
        this.startView.setStartButtonEnabled(!this.unauditableExplanation);
        if (!this.unauditableExplanation) {
            this.startView.focusStartButton();
        }
        this.startView.setWarningText(this.warningText);
        this.newButton.setEnabled(false);
        this.refreshToolbarUI();
        this.setDefaultFocusedChild(this.startView);
    }
    renderStatusView() {
        const inspectedURL = this.controller.getCurrentRun()?.inspectedURL;
        this.contentElement.classList.toggle('in-progress', true);
        this.statusView.setInspectedURL(inspectedURL);
        this.statusView.show(this.contentElement);
    }
    beforePrint() {
        this.statusView.show(this.contentElement);
        this.statusView.toggleCancelButton(false);
        this.statusView.renderText(i18nString(UIStrings.printing), i18nString(UIStrings.thePrintPopupWindowIsOpenPlease));
    }
    afterPrint() {
        this.statusView.hide();
        this.statusView.toggleCancelButton(true);
    }
    renderReport(lighthouseResult, artifacts) {
        this.toggleSettingsDisplay(false);
        this.contentElement.classList.toggle('in-progress', false);
        this.startView.hideWidget();
        this.statusView.hide();
        this.auditResultsElement.removeChildren();
        this.newButton.setEnabled(true);
        this.refreshToolbarUI();
        const cachedRenderedReport = this.cachedRenderedReports.get(lighthouseResult);
        if (cachedRenderedReport) {
            this.auditResultsElement.appendChild(cachedRenderedReport);
            return;
        }
        const reportContainer = LighthouseReportRenderer.renderLighthouseReport(lighthouseResult, artifacts, {
            beforePrint: this.beforePrint.bind(this),
            afterPrint: this.afterPrint.bind(this),
        });
        this.cachedRenderedReports.set(lighthouseResult, reportContainer);
    }
    buildReportUI(lighthouseResult, artifacts) {
        if (lighthouseResult === null) {
            return;
        }
        const optionElement = new Item(lighthouseResult, () => this.renderReport(lighthouseResult, artifacts), this.renderStartView.bind(this));
        this.reportSelector.prepend(optionElement);
        this.refreshToolbarUI();
        this.renderReport(lighthouseResult);
        this.auditResultsElement.querySelector('.lh-topbar__url')?.focus();
    }
    handleDrop(dataTransfer) {
        const items = dataTransfer.items;
        if (!items.length) {
            return;
        }
        const item = items[0];
        if (item.kind === 'file') {
            const file = items[0].getAsFile();
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.onload = () => this.loadedFromFile(reader.result);
            reader.readAsText(file);
        }
    }
    loadedFromFile(report) {
        const data = JSON.parse(report);
        if (!data['lighthouseVersion']) {
            return;
        }
        this.buildReportUI(data);
    }
    elementsToRestoreScrollPositionsFor() {
        const els = super.elementsToRestoreScrollPositionsFor();
        const lhContainerEl = this.auditResultsElement.querySelector('.lh-container');
        if (lhContainerEl) {
            els.push(lhContainerEl);
        }
        return els;
    }
    onKeyDown(event) {
        // The LHR's tool button is a toggle. When the user hits escape, the default behavior
        // is to close the tool drawer. We want to prevent this behavior and instead let the
        // LHR's tool button handle the event and close the tool's dropdown.
        if (event.key === 'Escape' && this.auditResultsElement.querySelector('.lh-tools__button.lh-active')) {
            event.handled = true;
        }
    }
    static async executeLighthouseRecording(overrides) {
        const panel = LighthousePanel.instance();
        await UI.ViewManager.ViewManager.instance().showView('lighthouse');
        const { report } = await panel.handleCompleteRun(overrides);
        return report;
    }
}
//# sourceMappingURL=LighthousePanel.js.map