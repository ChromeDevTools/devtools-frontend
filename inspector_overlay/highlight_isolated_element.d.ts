import type { PathCommands } from './common.js';
export interface IsolatedElementHighlight {
    widthResizerBorder: PathCommands;
    heightResizerBorder: PathCommands;
    bidirectionResizerBorder: PathCommands;
    currentX: number;
    currentY: number;
    currentWidth: number;
    currentHeight: number;
    highlightIndex: number;
    isolationModeHighlightConfig: {
        resizerColor: string;
        resizerHandleColor: string;
        maskColor: string;
    };
}
export declare function drawIsolatedElementHighlight(highlight: IsolatedElementHighlight, context: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, emulationScaleFactor: number): {
    widthPath: Path2D;
    heightPath: Path2D;
    bidirectionPath: Path2D;
    currentWidth: number;
    currentHeight: number;
    highlightIndex: number;
};
