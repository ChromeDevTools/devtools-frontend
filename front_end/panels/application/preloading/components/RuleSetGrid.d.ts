import '../../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../../ui/components/icon_button/icon_button.js';
import * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../../core/i18n/i18nTypes.js").Values | undefined) => Common.UIString.LocalizedString;
export interface RuleSetGridData {
    rows: RuleSetGridRow[];
    pageURL: Platform.DevToolsPath.UrlString;
}
export interface RuleSetGridRow {
    ruleSet: Protocol.Preload.RuleSet;
    preloadsStatusSummary: string;
}
/** Grid component to show SpeculationRules rule sets. **/
export declare class RuleSetGrid extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
    #private;
    connectedCallback(): void;
    update(data: RuleSetGridData): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-resources-ruleset-grid': RuleSetGrid;
    }
}
