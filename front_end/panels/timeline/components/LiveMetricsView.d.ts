import '../../../ui/components/settings/settings.js';
import '../../../ui/kit/kit.js';
import './FieldSettingsDialog.js';
import './NetworkThrottlingSelector.js';
import '../../../ui/components/menus/menus.js';
import './MetricCard.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface ViewInput {
    isNode: boolean;
    lcpValue?: LiveMetrics.LcpValue;
    clsValue?: LiveMetrics.ClsValue;
    inpValue?: LiveMetrics.InpValue;
    interactions: LiveMetrics.InteractionMap;
    layoutShifts: LiveMetrics.LayoutShift[];
    toggleRecordAction: UI.ActionRegistration.Action;
    recordReloadAction: UI.ActionRegistration.Action;
    cruxManager: CrUXManager.CrUXManager;
    handlePageScopeSelected: (event: Menus.SelectMenu.SelectMenuItemSelectedEvent) => void;
    handleDeviceOptionSelected: (event: Menus.SelectMenu.SelectMenuItemSelectedEvent) => void;
    revealLayoutShiftCluster: (clusterIds: Set<LiveMetrics.LayoutShift['uniqueLayoutShiftId']>) => void;
    revealInteraction: (interaction: LiveMetrics.Interaction) => void;
    logExtraInteractionDetails: (interaction: LiveMetrics.Interaction) => void;
    highlightedInteractionId?: string;
    highlightedLayoutShiftClusterIds?: Set<string>;
}
export interface ViewOutput {
    shouldKeepInteractionsScrolledToBottom?: () => boolean;
    keepInteractionsScrolledToBottom?: () => void;
    shouldKeepLayoutShiftsScrolledToBottom?: () => boolean;
    keepLayoutShiftsScrolledToBottom?: () => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare class LiveMetricsView extends UI.Widget.Widget {
    #private;
    isNode: boolean;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
