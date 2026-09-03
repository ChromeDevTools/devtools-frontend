import '../../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../../ui/kit/kit.js';
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export declare const i18nString: i18n.LocalizeString;
export interface RuleSetGridData {
    rows: RuleSetGridRow[];
    pageURL: Platform.DevToolsPath.UrlString;
}
export interface RuleSetGridRow {
    ruleSet: Protocol.Preload.RuleSet;
    preloadsStatusSummary: string;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export interface ViewInput {
    data: RuleSetGridData | null;
    onSelect: (ruleSetId: Protocol.Preload.RuleSetId) => void;
    onRevealInElements: (ruleSet: Protocol.Preload.RuleSet) => void;
    onRevealInNetwork: (ruleSet: Protocol.Preload.RuleSet) => void;
    onRevealPreloadsAssociatedWithRuleSet: (ruleSet: Protocol.Preload.RuleSet) => void;
}
export type ViewOutput = unknown;
export declare const DEFAULT_VIEW: View;
/** Grid component to show SpeculationRules rule sets. **/
declare const RuleSetGridBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox>;
export declare class RuleSetGrid extends RuleSetGridBase {
    #private;
    constructor(view?: View);
    get data(): RuleSetGridData | null;
    set data(data: RuleSetGridData | null);
    performUpdate(): void;
}
export declare const enum Events {
    SELECT = "select"
}
export interface EventTypes {
    [Events.SELECT]: Protocol.Preload.RuleSetId;
}
export {};
