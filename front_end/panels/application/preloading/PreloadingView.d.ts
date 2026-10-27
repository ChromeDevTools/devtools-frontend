import '../../../ui/kit/kit.js';
import '../../../ui/legacy/legacy.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as PreloadingComponents from './components/components.js';
import * as PreloadingHelper from './helper/helper.js';
interface RuleSetViewInput {
    warnings?: Protocol.Preload.PreloadEnabledStateUpdatedEvent;
    rows: PreloadingComponents.RuleSetGrid.RuleSetGridRow[];
    pageURL: Platform.DevToolsPath.UrlString;
    ruleSet: Protocol.Preload.RuleSet | null;
    shouldPrettyPrint: boolean;
    onRuleSetSelected: (id: Protocol.Preload.RuleSetId) => void;
    onPrettyPrintToggle: () => void;
}
type RuleSetView = (input: RuleSetViewInput, output: undefined, target: HTMLElement) => void;
export declare class PreloadingRuleSetView extends UI.Widget.VBox {
    #private;
    private model;
    private focusedRuleSetId;
    private shouldPrettyPrint;
    constructor(model: SDK.PreloadingModel.PreloadingModel, view?: RuleSetView);
    wasShown(): void;
    onScopeChange(): void;
    revealRuleSet(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): void;
    private getRuleSet;
    performUpdate(): void;
}
/**
 * Pure filtering function for preloading grid rows.
 * Exported for testability.
 */
export declare function applyFilterText(filterText: string, rows: PreloadingComponents.PreloadingGrid.PreloadingGridRow[]): PreloadingComponents.PreloadingGrid.PreloadingGridRow[];
interface PreloadingWarnings {
    disabledByPreference: boolean;
    disabledByDataSaver: boolean;
    disabledByBatterySaver: boolean;
    disabledByHoldbackPrefetchSpeculationRules: boolean;
    disabledByHoldbackPrerenderSpeculationRules: boolean;
}
interface AttemptViewInput {
    warnings?: PreloadingWarnings;
    rows: PreloadingComponents.PreloadingGrid.PreloadingGridRow[];
    isEmpty: boolean;
    pageURL: Platform.DevToolsPath.UrlString;
    details: PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportViewData;
    ruleSetSelectorToolbarItem: UI.Toolbar.ToolbarItem;
    filterText: string;
    onFilterChanged: (filterText: string) => void;
    onClear: () => void;
    onAttemptSelected: ({ rowId }: {
        rowId: string;
    }) => void;
}
interface AttemptViewOutput {
    doSplitWidgetLayout?: () => void;
}
type AttemptView = (input: AttemptViewInput, output: AttemptViewOutput, target: HTMLElement) => void;
export declare class PreloadingAttemptView extends UI.Widget.VBox {
    #private;
    private model;
    private focusedPreloadingAttemptId;
    constructor(model: SDK.PreloadingModel.PreloadingModel, view?: AttemptView);
    wasShown(): void;
    willHide(): void;
    onScopeChange(): void;
    setFilter(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): void;
    private getPreloadingDetailsData;
    performUpdate(): void;
    getRuleSetSelectorToolbarItemForTest(): UI.Toolbar.ToolbarItem;
    selectRuleSetOnFilterForTest(id: Protocol.Preload.RuleSetId | null): void;
}
interface SummaryViewInput {
    warnings?: Protocol.Preload.PreloadEnabledStateUpdatedEvent;
    usedPreloading: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData;
}
type SummaryView = (input: SummaryViewInput, output: undefined, target: HTMLElement) => void;
export declare class PreloadingSummaryView extends UI.Widget.VBox {
    #private;
    private model;
    constructor(model: SDK.PreloadingModel.PreloadingModel, view?: SummaryView);
    wasShown(): void;
    onScopeChange(): void;
    performUpdate(): void;
}
export {};
