import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/components/icon_button/icon_button.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { GlobalStyleStats } from './CSSOverviewModel.js';
import type { UnusedDeclaration } from './CSSOverviewUnusedDeclarations.js';
export type NodeStyleStats = Map<string, Set<number>>;
export interface ContrastIssue {
    nodeId: Protocol.DOM.BackendNodeId;
    contrastRatio: number;
    textColor: Common.Color.Color;
    backgroundColor: Common.Color.Color;
    thresholdsViolated: {
        aa: boolean;
        aaa: boolean;
        apca: boolean;
    };
}
export interface OverviewData {
    backgroundColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
    textColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
    textColorContrastIssues: Map<string, ContrastIssue[]>;
    fillColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
    borderColors: Map<string, Set<Protocol.DOM.BackendNodeId>>;
    globalStyleStats: {
        styleRules: number;
        inlineStyles: number;
        externalSheets: number;
        stats: {
            type: number;
            class: number;
            id: number;
            universal: number;
            attribute: number;
            nonSimple: number;
        };
    };
    fontInfo: Map<string, Map<string, Map<string, Protocol.DOM.BackendNodeId[]>>>;
    elementCount: number;
    mediaQueries: Map<string, Protocol.CSS.CSSMedia[]>;
    unusedDeclarations: Map<string, UnusedDeclaration[]>;
}
export type FontInfo = Map<string, Map<string, Map<string, number[]>>>;
interface FontMetric {
    label: string;
    values: Array<{
        title: string;
        nodes: number[];
    }>;
}
interface ViewInput {
    elementCount: number;
    backgroundColors: string[];
    textColors: string[];
    textColorContrastIssues: Map<string, ContrastIssue[]>;
    fillColors: string[];
    borderColors: string[];
    globalStyleStats: GlobalStyleStats;
    mediaQueries: Array<{
        title: string;
        nodes: Protocol.CSS.CSSMedia[];
    }>;
    unusedDeclarations: Array<{
        title: string;
        nodes: UnusedDeclaration[];
    }>;
    fontInfo: Array<{
        font: string;
        fontMetrics: FontMetric[];
    }>;
    selectedSection: string;
    onClick: (evt: Event) => void;
    onSectionSelected: (section: string, withKeyboard: boolean) => void;
    onReset: () => void;
}
interface ViewOutput {
    revealSection: Map<string, (setFocus: boolean) => void>;
    closeAllTabs: () => void;
    addTab: (id: string, tabTitle: string, view: UI.Widget.Widget, jslogContext: string) => void;
}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
type PopulateNodesEvent = {
    type: 'contrast';
    key: string;
    section: string | undefined;
    nodes: ContrastIssue[];
} | {
    type: 'color';
    color: string;
    section: string | undefined;
    nodes: Array<{
        nodeId: Protocol.DOM.BackendNodeId;
    }>;
} | {
    type: 'unused-declarations';
    declaration: string;
    nodes: UnusedDeclaration[];
} | {
    type: 'media-queries';
    text: string;
    nodes: Protocol.CSS.CSSMedia[];
} | {
    type: 'font-info';
    name: string;
    nodes: Array<{
        nodeId: Protocol.DOM.BackendNodeId;
    }>;
};
export type PopulateNodesEventNodes = PopulateNodesEvent['nodes'];
export type PopulateNodesEventNodeTypes = PopulateNodesEventNodes[0];
export declare class CSSOverviewCompletedView extends UI.Widget.VBox {
    #private;
    onReset: () => void;
    constructor(element?: HTMLElement, view?: View);
    set target(target: SDK.Target.Target | undefined);
    performUpdate(): void;
    set overviewData(data: OverviewData);
    static readonly pushedNodes: Set<Protocol.DOM.BackendNodeId>;
}
interface ElementDetailsViewInput {
    items: Array<{
        data: PopulateNodesEventNodeTypes;
        link?: HTMLElement;
        showNode?: () => void;
    }>;
    visibility: Set<string>;
}
type ElementDetailsViewFunction = (input: ElementDetailsViewInput, output: object, target: HTMLElement) => void;
export declare const ELEMENT_DETAILS_DEFAULT_VIEW: ElementDetailsViewFunction;
export declare class ElementDetailsView extends UI.Widget.Widget {
    #private;
    constructor(domModel: SDK.DOMModel.DOMModel, cssModel: SDK.CSSModel.CSSModel, linkifier: Components.Linkifier.Linkifier, view?: ElementDetailsViewFunction);
    set data(data: PopulateNodesEventNodes);
    performUpdate(): Promise<void>;
}
export {};
