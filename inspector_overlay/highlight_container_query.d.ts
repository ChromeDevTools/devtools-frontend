import type { PathCommands } from './common.js';
import { type LineStyle } from './highlight_common.js';
interface QueryingDescendantData {
    descendantBorder: PathCommands;
}
export interface ContainerQueryHighlight {
    containerBorder: PathCommands;
    queryingDescendants?: QueryingDescendantData[];
    containerQueryContainerHighlightConfig: {
        containerBorder?: LineStyle;
        descendantBorder?: LineStyle;
    };
}
export declare function drawContainerQueryHighlight(highlight: ContainerQueryHighlight, context: CanvasRenderingContext2D, emulationScaleFactor: number): void;
export {};
