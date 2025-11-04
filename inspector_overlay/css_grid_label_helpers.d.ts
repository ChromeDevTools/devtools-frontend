import { type AreaBounds, type Bounds, type Position } from './common.js';
export interface CanvasSize {
    canvasWidth: number;
    canvasHeight: number;
}
interface PositionData {
    positions: Position[];
    hasFirst: boolean;
    hasLast: boolean;
    names?: string[][];
}
type PositionDataWithNames = PositionData & {
    names: string[][];
};
interface TracksPositionData {
    positive: PositionData;
    negative: PositionData;
}
interface TracksPositionDataWithNames {
    positive: PositionDataWithNames;
    negative: PositionDataWithNames;
}
interface GridPositionNormalizedData {
    rows: TracksPositionData;
    columns: TracksPositionData;
    bounds: Bounds;
}
export interface GridPositionNormalizedDataWithNames {
    rows: TracksPositionDataWithNames;
    columns: TracksPositionDataWithNames;
    bounds: Bounds;
}
interface TrackSize {
    computedSize: number;
    authoredSize?: number;
    x: number;
    y: number;
}
export interface GridHighlightOptions {
    gridBorderDash: boolean;
    rowLineDash: boolean;
    columnLineDash: boolean;
    showGridExtensionLines: boolean;
    showPositiveLineNumbers: boolean;
    showNegativeLineNumbers: boolean;
    rowLineColor?: string;
    columnLineColor?: string;
    rowHatchColor: string;
    columnHatchColor: string;
    showLineNames: boolean;
}
export interface GridHighlightConfig {
    rotationAngle?: number;
    writingMode?: string;
    columnTrackSizes?: TrackSize[];
    rowTrackSizes?: TrackSize[];
    positiveRowLineNumberPositions?: Position[];
    negativeRowLineNumberPositions?: Position[];
    positiveColumnLineNumberPositions?: Position[];
    negativeColumnLineNumberPositions?: Position[];
    rowLineNameOffsets?: Array<{
        name: string;
        x: number;
        y: number;
    }>;
    columnLineNameOffsets?: Array<{
        name: string;
        x: number;
        y: number;
    }>;
    gridHighlightConfig?: GridHighlightOptions;
}
export interface GridLabelState {
    gridLayerCounter: number;
}
/**
 * Places all of the required grid labels on the overlay. This includes row and
 * column line number labels, and area labels.
 */
export declare function drawGridLabels(config: GridHighlightConfig, gridBounds: Bounds, areaBounds: AreaBounds[], canvasSize: CanvasSize, labelState: GridLabelState, emulationScaleFactor: number, writingModeMatrix?: DOMMatrix | undefined): void;
export interface NormalizePositionDataConfig {
    positiveRowLineNumberPositions?: Position[];
    negativeRowLineNumberPositions?: Position[];
    positiveColumnLineNumberPositions?: Position[];
    negativeColumnLineNumberPositions?: Position[];
    rowLineNameOffsets?: Array<{
        name: string;
        x: number;
        y: number;
    }>;
    columnLineNameOffsets?: Array<{
        name: string;
        x: number;
        y: number;
    }>;
    gridHighlightConfig?: {
        showLineNames: boolean;
    };
}
/**
 * Take the highlight config and bound objects in, and spits out an object with
 * the same information, but with 2 key differences:
 * - the information is organized in a way that makes the rest of the code more
 *   readable
 * - all pixel values are rounded to integers in order to safely compare
 *   positions (on high-dpi monitors floats are passed by the backend, this means
 *   checking if a position is at either edges of the container can't be done).
 */
export declare function normalizePositionData(config: NormalizePositionDataConfig, bounds: Bounds): GridPositionNormalizedData;
/**
 * Places the grid row and column number labels on the overlay.
 *
 * @param container Where to append the labels
 * @param data The grid line number data
 * @param writingModeMatrix The transformation matrix in case a vertical writing-mode is applied, to map label positions
 * @param writingMode The current writing-mode value
 */
export declare function drawGridLineNumbers(container: HTMLElement, data: GridPositionNormalizedData, canvasSize: CanvasSize, emulationScaleFactor: number, writingModeMatrix?: DOMMatrix | undefined, writingMode?: string | undefined): void;
/**
 * Places the grid track size labels on the overlay.
 */
export declare function drawGridTrackSizes(container: HTMLElement, trackSizes: TrackSize[], direction: 'row' | 'column', canvasSize: CanvasSize, emulationScaleFactor: number, writingModeMatrix?: DOMMatrix | undefined, writingMode?: string | undefined): void;
/**
 * Places the grid row and column name labels on the overlay.
 */
export declare function drawGridLineNames(container: HTMLElement, data: GridPositionNormalizedDataWithNames, canvasSize: CanvasSize, emulationScaleFactor: number, writingModeMatrix?: DOMMatrix | undefined, writingMode?: string | undefined): void;
/**
 * Places the grid area name labels on the overlay.
 */
export declare function drawGridAreaNames(container: HTMLElement, areaBounds: AreaBounds[], writingModeMatrix?: DOMMatrix | undefined, writingMode?: string | undefined): void;
/**
 * Given a background color, generate a color for text to be legible.
 * This assumes the background color is given as either a "rgba(r, g, b, a)" string or a #rrggbb string.
 * This is because colors are sent by the backend using blink::Color:Serialized() which follows the logic for
 * serializing colors from https://html.spec.whatwg.org/#serialization-of-a-color
 *
 * In rgba form, the alpha channel is ignored.
 *
 * This is made to be small and fast and not require importing the entire Color utility from DevTools as it would make
 * the overlay bundle unnecessarily big.
 *
 * This is also made to generate the defaultLabelTextColor for all of the default label colors that the
 * OverlayColorGenerator produces.
 */
export declare function generateLegibleTextColor(backgroundColor: string): "#121212" | "white" | null;
/**
 * Returns true if the specified string starts with 'horizontal'.
 */
export declare function isHorizontalWritingMode(writingMode: string): boolean;
export {};
