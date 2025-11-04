import type { PathCommands, Position, Quad } from './common.js';
import { type BoxStyle, type LineStyle } from './highlight_common.js';
type FlexLinesData = FlexItemData[][];
interface FlexItemData {
    itemBorder: PathCommands;
    baseline: number;
}
export interface FlexContainerHighlight {
    containerBorder: PathCommands;
    lines: FlexLinesData;
    isHorizontalFlow: boolean;
    isReverse: boolean;
    alignItemsStyle: string;
    mainGap: number;
    crossGap: number;
    flexContainerHighlightConfig: {
        containerBorder?: LineStyle;
        lineSeparator?: LineStyle;
        itemSeparator?: LineStyle;
        mainDistributedSpace?: BoxStyle;
        crossDistributedSpace?: BoxStyle;
        rowGapSpace?: BoxStyle;
        columnGapSpace?: BoxStyle;
        crossAlignment?: LineStyle;
    };
}
export interface FlexItemHighlight {
    baseSize: number;
    isHorizontalFlow: boolean;
    flexItemHighlightConfig: {
        baseSizeBox?: BoxStyle;
        baseSizeBorder?: LineStyle;
        flexibilityArrow?: LineStyle;
    };
    boxSizing: 'content' | 'border';
}
interface LineQuads {
    quad: Quad;
    items: Quad[];
    extendedItems: Quad[];
}
interface GapQuads {
    mainGaps: Quad[][];
    crossGaps: Quad[];
}
export declare function drawLayoutFlexItemHighlight(highlight: FlexItemHighlight, itemPath: PathCommands, context: CanvasRenderingContext2D, emulationScaleFactor: number): void;
export declare function drawLayoutFlexContainerHighlight(highlight: FlexContainerHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number): void;
/**
 * We get a list of paths for each flex item from the backend. From this list, we compute the resulting paths for each
 * flex line too (making it span the entire container size (in the main direction)). We also process the item path so
 * they span the entire flex line size (in the cross direction).
 *
 * @param container
 * @param lines
 * @param isHorizontalFlow
 */
export declare function getLinesAndItemsQuads(container: PathCommands, lines: FlexLinesData, isHorizontalFlow: boolean, isReverse: boolean): LineQuads[];
export declare function getGapQuads(highlight: Pick<FlexContainerHighlight, 'crossGap' | 'mainGap' | 'isHorizontalFlow' | 'isReverse'>, lineQuads: LineQuads[]): GapQuads;
/**
 * Create a quad for the gap that exists between 2 quads.
 *
 * +-------+   +-+   +-------+
 * | quad1 |   |/|   | quad2 |
 * +-------+   +-+   +-------+
 *           gap quad
 *
 * @param quad1
 * @param quad2
 * @param size The size of the gap between the 2 quads
 * @param vertically whether the 2 quads are stacked vertically (quad1 above quad2), or horizontally (quad1 left of
 * quad2)
 * @param isReverse whether the direction is reversed (quad1 below quad2 or quad1 right of quad2)
 */
export declare function getGapQuadBetweenQuads(quad1: Quad, quad2: Quad, size: number, vertically: boolean, isReverse?: boolean): {
    p1: {
        x: number;
        y: number;
    };
    p2: {
        x: number;
        y: number;
    };
    p3: {
        x: number;
        y: number;
    };
    p4: {
        x: number;
        y: number;
    };
};
/**
 * Get a quad that bounds the provided 2 quads.
 * This only works if both quads have their respective sides parallel to eachother.
 * Note that it is more complicated because rectangles can be transformed (i.e. their sides aren't necessarily parallel
 * to the x and y axes).
 * @param quad1
 * @param quad2
 * @param isHorizontalFlow
 * @param isReverse
 */
export declare function uniteQuads(quad1: Quad, quad2: Quad, isHorizontalFlow: boolean, isReverse: boolean): Quad;
/**
 * Given 2 quads, with one being contained inside the other, grow the inner one, along one direction, so it ends up
 * flush aginst the outer one.
 * @param innerQuad
 * @param outerQuad
 * @param horizontally The direction to grow the inner quad along
 */
export declare function growQuadToEdgesOf(innerQuad: Quad, outerQuad: Quad, horizontally: boolean): Quad;
/**
 * Return the x/y intersection of the 2 segments
 * @param segment1
 * @param segment2
 * @returns the point where the segments intersect
 */
export declare function intersectSegments([p1, p2]: Position[], [p3, p4]: Position[]): Position;
/**
 * Does the provided segment contain the provided point
 * @param segment
 * @param point
 */
export declare function segmentContains([p1, p2]: Position[], point: Position): boolean;
export declare function distance(p1: Position, p2: Position): number;
export declare function getColinearPointAtDistance(p1: Position, p2: Position, distance: number): Position;
export {};
