import '../../ui/kit/kit.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare const i18nString: i18n.LocalizeString;
export interface SubAppEntry {
    name: string;
    scope: string;
    manifestId: string;
    startUrl: string;
}
export interface SubAppsViewInput {
    subApps: SubAppEntry[];
    isSiblingSubApps?: boolean;
}
type View = (input: SubAppsViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class SubAppsView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    get subApps(): SubAppEntry[];
    set subApps(subApps: SubAppEntry[]);
    get isSiblingSubApps(): boolean;
    set isSiblingSubApps(isSiblingSubApps: boolean);
    performUpdate(): Promise<void>;
}
export {};
