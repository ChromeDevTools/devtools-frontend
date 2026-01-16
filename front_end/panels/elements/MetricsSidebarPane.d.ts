import * as SDK from '../../core/sdk/sdk.js';
import type { ComputedStyleModel } from './ComputedStyleModel.js';
import { ElementsSidebarPane } from './ElementsSidebarPane.js';
interface ViewInput {
    style: Map<string, string>;
    highlightedMode: string;
    node: SDK.DOMModel.DOMNode | null;
    contentWidth: string;
    contentHeight: string;
    onHighlightNode: (showHighlight: boolean, mode: string) => void;
    onStartEditing: (target: Element, box: string, styleProperty: string, computedStyle: Map<string, string>) => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare class MetricsSidebarPane extends ElementsSidebarPane {
    originalPropertyData: SDK.CSSProperty.CSSProperty | null;
    previousPropertyDataCandidate: SDK.CSSProperty.CSSProperty | null;
    private inlineStyle;
    private highlightMode;
    private computedStyle;
    private isEditingMetrics?;
    private view;
    constructor(computedStyleModel: ComputedStyleModel, view?: View);
    performUpdate(): Promise<void>;
    onCSSModelChanged(): void;
    private getPropertyValueAsPx;
    private getBox;
    private highlightDOMNode;
    private getContentAreaWidthPx;
    private getContentAreaHeightPx;
    private updateMetrics;
    startEditing(targetElement: Element, box: string, styleProperty: string, computedStyle: Map<string, string>): void;
    private handleKeyDown;
    editingEnded(element: Element, context: {
        keyDownHandler: (arg0: Event) => void;
    }): void;
    editingCancelled(element: Element, context: {
        box: string;
        styleProperty: string;
        computedStyle: Map<string, string>;
        keyDownHandler: (arg0: Event) => void;
    }): void;
    private applyUserInput;
    private editingCommitted;
}
export {};
