import '../../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../../ui/kit/kit.js';
import * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../../core/i18n/i18nTypes.js").Values | undefined) => Common.UIString.LocalizedString;
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
declare const RuleSetGrid_base: Platform.Constructor.Constructor<Common.EventTarget.EventTarget<EventTypes>, any[]> & typeof UI.Widget.VBox;
/** Grid component to show SpeculationRules rule sets. **/
export declare class RuleSetGrid extends RuleSetGrid_base {
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
