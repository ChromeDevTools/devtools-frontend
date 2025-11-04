import type { PathCommands } from './common.js';
import { type LineStyle } from './highlight_common.js';
type SnapAlignment = 'none' | 'start' | 'end' | 'center';
export interface ScrollSnapHighlight {
    snapport: PathCommands;
    paddingBox: PathCommands;
    snapAreas: Array<{
        path: PathCommands;
        borderBox: PathCommands;
        alignBlock?: SnapAlignment;
        alignInline?: SnapAlignment;
    }>;
    snapportBorder: LineStyle;
    snapAreaBorder: LineStyle;
    scrollMarginColor: string;
    scrollPaddingColor: string;
}
export declare function drawScrollSnapHighlight(highlight: ScrollSnapHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number): void;
export {};
