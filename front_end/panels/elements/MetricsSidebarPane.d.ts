import * as SDK from '../../core/sdk/sdk.js';
import type * as ComputedStyle from '../../models/computed_style/computed_style.js';
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
type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare class MetricsSidebarPane extends ElementsSidebarPane<ShadowRoot> {
    originalPropertyData: SDK.CSSProperty.CSSProperty | null;
    previousPropertyDataCandidate: SDK.CSSProperty.CSSProperty | null;
    private inlineStyle;
    private highlightMode;
    private computedStyle;
    private boxModelInternal;
    private isEditingMetrics?;
    private view;
    constructor(computedStyleModel: ComputedStyle.ComputedStyleModel.ComputedStyleModel, view?: View);
    performUpdate(): Promise<void>;
    onCSSModelChanged(): void;
    private getPropertyValueAsPx;
    private getBox;
    private highlightDOMNode;
    /**
     * Checks whether the array represents a valid Protocol.DOM.Quad (8 coordinates: 4 corner points).
     */
    private isDOMQuad;
    /**
     * Calculates the rendered content box width from a DOM Quad.
     * A Quad contains 8 numbers representing 4 corner points clockwise from top-left:
     *   P0 (x=quad[0], y=quad[1]): Top-Left
     *   P1 (x=quad[2], y=quad[3]): Top-Right
     *   P2 (x=quad[4], y=quad[5]): Bottom-Right
     *   P3 (x=quad[6], y=quad[7]): Bottom-Left
     *
     * Math.hypot(quad[2] - quad[0], quad[3] - quad[1]) is the distance from Top-Left to Top-Right (top edge).
     * Math.hypot(quad[4] - quad[6], quad[5] - quad[7]) is the distance from Bottom-Left to Bottom-Right (bottom edge).
     * Averaging the top and bottom edges gives the rendered width, which accounts for scrollbars and handles
     * rotated or skewed elements.
     */
    private computeQuadWidth;
    /**
     * Calculates the rendered content box height from a DOM Quad.
     * Math.hypot(quad[6] - quad[0], quad[7] - quad[1]) is the distance from Top-Left to Bottom-Left (left edge).
     * Math.hypot(quad[4] - quad[2], quad[5] - quad[3]) is the distance from Top-Right to Bottom-Right (right edge).
     * Averaging the left and right edges gives the rendered height, which accounts for scrollbars and handles
     * rotated or skewed elements.
     */
    private computeQuadHeight;
    /**
     * Computes the content area width in pixels for display in the Box Model diagram.
     * - Branch 1: If a DOM quad is available, we compute width directly
     *   from the rendered quad. This accurately reflects the content box when scrollbars are present
     *   (which getComputedStyle does not subtract).
     * - Branch 2: Fallback to parsing the CSS 'width' property from getComputedStyle.
     */
    private getContentAreaWidthPx;
    /**
     * Computes the content area height in pixels for display in the Box Model diagram.
     * - Branch 1: If a DOM quad is available, we compute height directly
     *   from the rendered quad. This accurately reflects the content box when scrollbars are present
     *   (which getComputedStyle does not subtract).
     * - Branch 2: Fallback to parsing the CSS 'height' property from getComputedStyle.
     */
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
