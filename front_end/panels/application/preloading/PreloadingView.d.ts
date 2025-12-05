import '../../../ui/legacy/legacy.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as PreloadingComponents from './components/components.js';
import type * as PreloadingHelper from './helper/helper.js';
export declare class PreloadingRuleSetView extends UI.Widget.VBox {
    private model;
    private focusedRuleSetId;
    private readonly warningsContainer;
    private readonly warningsView;
    private readonly hsplit;
    private readonly ruleSetGrid;
    private readonly ruleSetGridContainerRef;
    private readonly ruleSetDetailsRef;
    private shouldPrettyPrint;
    constructor(model: SDK.PreloadingModel.PreloadingModel);
    wasShown(): void;
    onScopeChange(): void;
    revealRuleSet(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): void;
    private updateRuleSetDetails;
    private getRuleSet;
    render(): void;
    private onRuleSetsGridCellFocused;
    getInfobarContainerForTest(): HTMLElement;
    getRuleSetGridForTest(): PreloadingComponents.RuleSetGrid.RuleSetGrid;
}
export declare class PreloadingAttemptView extends UI.Widget.VBox {
    private model;
    private focusedPreloadingAttemptId;
    private readonly warningsContainer;
    private readonly warningsView;
    private readonly preloadingGrid;
    private readonly preloadingDetails;
    private readonly ruleSetSelector;
    constructor(model: SDK.PreloadingModel.PreloadingModel);
    wasShown(): void;
    onScopeChange(): void;
    setFilter(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): void;
    private updatePreloadingDetails;
    render(): void;
    private onPreloadingGridCellFocused;
    getRuleSetSelectorToolbarItemForTest(): UI.Toolbar.ToolbarItem;
    getPreloadingGridForTest(): PreloadingComponents.PreloadingGrid.PreloadingGrid;
    getPreloadingDetailsForTest(): PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView;
    selectRuleSetOnFilterForTest(id: Protocol.Preload.RuleSetId | null): void;
}
export declare class PreloadingSummaryView extends UI.Widget.VBox {
    private model;
    private readonly warningsContainer;
    private readonly warningsView;
    private readonly usedPreloading;
    constructor(model: SDK.PreloadingModel.PreloadingModel);
    wasShown(): void;
    onScopeChange(): void;
    render(): void;
    getUsedPreloadingForTest(): PreloadingComponents.UsedPreloadingView.UsedPreloadingView;
}
