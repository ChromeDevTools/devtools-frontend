import '../../ui/components/highlighting/highlighting.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import { CoverageType } from './CoverageModel.js';
export interface CoverageListItem {
    url: Platform.DevToolsPath.UrlString;
    type: CoverageType;
    size: number;
    usedSize: number;
    unusedSize: number;
    usedPercentage: number;
    unusedPercentage: number;
    sources: CoverageListItem[];
    isContentScript: boolean;
    generatedUrl?: Platform.DevToolsPath.UrlString;
}
export declare function coverageTypeToString(type: CoverageType): string;
interface ViewInput {
    items: CoverageListItem[];
    selectedUrl: Platform.DevToolsPath.UrlString | null;
    maxSize: number;
    onOpen: (url: Platform.DevToolsPath.UrlString) => void;
    highlightRegExp: RegExp | null;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class CoverageListView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set highlightRegExp(highlightRegExp: RegExp | null);
    get highlightRegExp(): RegExp | null;
    set coverageInfo(coverageInfo: CoverageListItem[]);
    get coverageInfo(): CoverageListItem[];
    performUpdate(): void;
    reset(): void;
    set selectedUrl(url: Platform.DevToolsPath.UrlString | null);
    get selectedUrl(): Platform.DevToolsPath.UrlString | null;
}
export {};
