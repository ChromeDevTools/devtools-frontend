import { type Bounds, Overlay, type ResetData } from './common.js';
import { type PathBounds } from './highlight_common.js';
interface Path {
    path: Array<string | number>;
    outlineColor: string;
    name: string;
}
interface SourceOrderHighlight {
    sourceOrder: number;
    paths: Path[];
}
export declare class SourceOrderOverlay extends Overlay {
    private sourceOrderContainer;
    reset(resetData: ResetData): void;
    install(): void;
    uninstall(): void;
    drawSourceOrder(highlight: SourceOrderHighlight): {
        bounds: PathBounds;
    };
    private drawSourceOrderLabel;
}
/**
 * There are 8 types of labels.
 *
 * There are 4 positions a label can have on the y axis, relative to the element:
 * - topCorner, bottomCorner: placed inside of the element, in its left corners
 * - aboveElement, belowElement: placed outside of the element, aligned on the
 *   left edge of the element
 *
 * The label position is determined as follows:
 * 1. Top corner if the element is wider and taller than the element
 * 2. Above element if the label is wider or taller than the element
 * 3. Below element if the label would be placed above the element, but this would
 *    cause it to overlap with another label or intersect the top of the window
 * 4. Bottom corner if the label would be placed below the element, but this would
 *    cause it to intersect the bottom of the window
 * On the x axis, the label is always aligned with its element's leftmost edge.
 *
 * The label may need additional styles if it is taller or wider than the element,
 * to make sure all borders that don't touch the element's outline are rounded
 * - Wider: right corners are rounded
 * - Taller: top corners are rounded
 *
 * Examples: (E = element, L = label)
 *             ______
 *            |_L_|  | (the bottom right corner of the label will be rounded)
 * topCorner: |      |
 *            |___E__|
 *                     ___
 *                    |_L_| (the bottom right corner of the label will be rounded)
 * aboveElementWider: | |
 *                    |E|
 *                    |_|
 *                      ______
 * bottomCornerTaller: |  L   |_____
 *                     |______|__E__|
 */
export declare const LabelTypes: {
    topCorner: string;
    aboveElement: string;
    belowElement: string;
    aboveElementWider: string;
    belowElementWider: string;
    bottomCornerWider: string;
    bottomCornerTaller: string;
    bottomCornerWiderTaller: string;
};
/**
 * Calculates the coordinates to place the label based on position type
 */
export declare function getPositionFromLabelType(positionType: string, bounds: Omit<Bounds, 'allPoints'>, labelHeight: number): {
    contentTop: number;
    contentLeft: number;
};
/**
 * Determines the position type of the label based on the element it's associated
 * with, avoiding overlaps between other labels
 */
export declare function getLabelType(bounds: Omit<Bounds, 'allPoints'>, labelHeight: number, labelWidth: number, otherLabels: HTMLCollectionOf<HTMLElement>, canvasHeight: number): string;
export {};
