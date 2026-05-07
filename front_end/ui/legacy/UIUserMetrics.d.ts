export declare class UIUserMetrics {
    #private;
    static instance(): UIUserMetrics;
    panelLoaded(panelName: string, histogramName: string): void;
    setLaunchPanel(panelName: string | null): void;
    performanceTraceLoad(measure: PerformanceMeasure): void;
    panelShown(panelName: string, isLaunching?: boolean): void;
    settingsPanelShown(settingsViewId: string): void;
}
