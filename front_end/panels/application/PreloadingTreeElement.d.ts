import type * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import { ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import * as PreloadingHelper from './preloading/helper/helper.js';
import { PreloadingAttemptView, PreloadingRuleSetView } from './preloading/PreloadingView.js';
import type { ResourcesPanel } from './ResourcesPanel.js';
declare class PreloadingTreeElementBase<View extends PreloadingRuleSetView | PreloadingAttemptView> extends ApplicationPanelTreeElement {
    #private;
    protected view?: View;
    constructor(panel: ResourcesPanel, viewConstructor: {
        new (model: SDK.PreloadingModel.PreloadingModel): View;
    }, path: Platform.DevToolsPath.UrlString, title: string);
    get itemURL(): Platform.DevToolsPath.UrlString;
    initialize(model: SDK.PreloadingModel.PreloadingModel): void;
    onselect(selectedByUser?: boolean): boolean;
}
export declare class PreloadingSummaryTreeElement extends ExpandableApplicationPanelTreeElement {
    #private;
    constructor(panel: ResourcesPanel);
    constructChildren(panel: ResourcesPanel): void;
    initialize(model: SDK.PreloadingModel.PreloadingModel): void;
    onselect(selectedByUser?: boolean): boolean;
    expandAndRevealRuleSet(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): void;
    expandAndRevealAttempts(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): void;
}
export declare class PreloadingRuleSetTreeElement extends PreloadingTreeElementBase<PreloadingRuleSetView> {
    constructor(panel: ResourcesPanel);
    revealRuleSet(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): void;
}
export {};
