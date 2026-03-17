import '../../ui/legacy/legacy.js';
import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Events, LighthouseController } from './LighthouseController.js';
import { ProtocolService } from './LighthouseProtocolService.js';
export declare class ActiveLighthouseReport {
    report: LighthouseModel.ReporterTypes.ReportJSON;
    constructor(report: LighthouseModel.ReporterTypes.ReportJSON);
}
export declare class LighthousePanel extends UI.Panel.Panel {
    private readonly controller;
    private readonly startView;
    private readonly statusView;
    private readonly timespanView;
    private warningText;
    private unauditableExplanation;
    private readonly cachedRenderedReports;
    private readonly auditResultsElement;
    private clearButton;
    private newButton;
    private reportSelector;
    private settingsPane;
    private rightToolbar;
    private showSettingsPaneSetting;
    private constructor();
    static instance(opts?: {
        forceNew: boolean;
        protocolService: ProtocolService;
        controller: LighthouseController;
    }): LighthousePanel;
    static getEvents(): typeof Events;
    handleTimespanStart(): Promise<void>;
    handleTimespanEnd(): Promise<void>;
    handleCompleteRun(overrides?: LighthouseModel.RunTypes.RunOverrides): Promise<{
        report: LighthouseModel.ReporterTypes.ReportJSON | null;
    }>;
    handleRunCancel(): Promise<void>;
    private handleError;
    private refreshWarningsUI;
    private refreshStartAuditUI;
    private refreshStatusUI;
    private refreshToolbarUI;
    private clearAll;
    private renderToolbar;
    private updateSettingsPaneVisibility;
    private toggleSettingsDisplay;
    private renderStartView;
    private renderStatusView;
    private beforePrint;
    private afterPrint;
    private renderReport;
    private buildReportUI;
    private handleDrop;
    private loadedFromFile;
    elementsToRestoreScrollPositionsFor(): Element[];
    private onKeyDown;
    static executeLighthouseRecording(overrides?: LighthouseModel.RunTypes.RunOverrides): Promise<LighthouseModel.ReporterTypes.ReportJSON | null>;
}
