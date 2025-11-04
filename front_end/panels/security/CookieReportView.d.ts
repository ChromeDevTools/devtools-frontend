import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Common from '../../core/common/common.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
export declare const i18nString: (id: string, values?: import("../../core/i18n/i18nTypes.js").Values | undefined) => Common.UIString.LocalizedString;
export interface ViewInput {
    cookieRows: IssuesManager.CookieIssue.CookieReportInfo[];
    filterItems: UI.FilterBar.Item[];
    filters: TextUtils.TextUtils.ParsedFilter[];
    searchText: string;
    onSearchFilterChanged: (e: CustomEvent<string>) => void;
    onFilterChanged: () => void;
    onSortingChanged: () => void;
    populateContextMenu: (event: CustomEvent<{
        menu: UI.ContextMenu.ContextMenu;
        element: HTMLElement;
    }>) => void;
}
export interface ViewOutput {
    namedBitSetFilterUI?: UI.FilterBar.NamedBitSetFilterUI;
}
export interface CookieReportNodeData {
    name: string;
    domain: string;
    type: string;
    platform: string;
    status: string;
    recommendation: HTMLElement;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare class CookieReportView extends UI.Widget.VBox {
    #private;
    namedBitSetFilterUI?: UI.FilterBar.NamedBitSetFilterUI;
    filterItems: UI.FilterBar.Item[];
    searchText: string;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
    onSearchFilterChanged(e: CustomEvent<string>): void;
    populateContextMenu(event: CustomEvent<{
        menu: UI.ContextMenu.ContextMenu;
        element: HTMLElement;
    }>): void;
    static getStatusString(status: IssuesManager.CookieIssue.CookieStatus): string;
    static getRecommendation(domain: string, insight?: Protocol.Audits.CookieIssueInsight): HTMLElement;
    static getRecommendationText(domain: string, insight?: Protocol.Audits.CookieIssueInsight): Lit.TemplateResult;
    static getCookieTypeString(type?: string): string;
}
